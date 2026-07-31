/**
 * LangGraph pipeline that wires together caption generation, image
 * generation, Cloudinary upload, and Instagram publishing into one
 * automated daily posting flow.
 */

require("@langchain/langgraph/zod");
const { z } = require("zod");
const { StateGraph, END } = require("@langchain/langgraph");

const { generateCaption, generateImage } = require("../services/aiService");
const { uploadImageToCloudinary } = require("../services/uploadService");
const { postImageToInstagram } = require("../services/instagramService");

const Post = require("../models/Post");
const Log = require("../models/Log");

/**
 * Shared state passed between every node in the graph.
 * `postId` refers to the Mongo _id of the Post document, which must
 * already exist (status: "processing") before the graph is invoked.
 */
const PostState = z.object({
  accountId: z.string().optional(),
  igUserId: z.string().optional(),
  accessToken: z.string().optional(),
  postId: z.string().optional(),
  caption: z.string().optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  imageUrl: z.string().optional(),
  igMediaId: z.string().optional(),
  error: z.string().optional(),
  failedStage: z.string().optional(),
});

/**
 * Writes a log entry for a pipeline stage.
 * Never throws - a logging failure should not crash the pipeline.
 */
async function writeLog(postId, stage, status, message) {
  try {
    await Log.create({ postId, stage, status, message });
  } catch (err) {
    console.error("[Log] Failed to write log entry:", err.message);
  }
}

/**
 * Node 1: Generate the caption text via Gemini.
 */
async function generateCaptionNode(state) {
  const result = await generateCaption();

  if (!result.success) {
    await writeLog(state.postId, "caption_generation", "failure", result.error);
    return { error: result.error, failedStage: "caption_generation" };
  }

  await writeLog(state.postId, "caption_generation", "success", result.caption);
  return { caption: result.caption };
}

/**
 * Node 2: Generate the image via Gemini.
 * Returns base64 data - not yet a usable public URL.
 */
async function generateImageNode(state) {
  const result = await generateImage();

  if (!result.success) {
    await writeLog(state.postId, "image_generation", "failure", result.error);
    return { error: result.error, failedStage: "image_generation" };
  }

  await writeLog(state.postId, "image_generation", "success", "Image generated");
  return { imageBase64: result.base64Data, imageMimeType: result.mimeType };
}

/**
 * Node 3: Upload the generated image to Cloudinary to get a public URL.
 * Instagram's API requires a public image_url, not raw base64.
 */
async function uploadImageNode(state) {
  const result = await uploadImageToCloudinary({
    base64Data: state.imageBase64,
    mimeType: state.imageMimeType,
  });

  if (!result.success) {
    await writeLog(state.postId, "image_upload", "failure", result.error);
    return { error: result.error, failedStage: "image_upload" };
  }

  await writeLog(state.postId, "image_upload", "success", result.publicUrl);
  return { imageUrl: result.publicUrl };
}

/**
 * Node 4: Publish to Instagram.
 * instagramService.postImageToInstagram() internally handles the
 * create-container -> poll-status -> publish sequence.
 */
async function publishToInstagramNode(state) {
  const result = await postImageToInstagram({
    igUserId: state.igUserId,
    accessToken: state.accessToken,
    imageUrl: state.imageUrl,
    caption: state.caption,
  });

  if (!result.success) {
    await writeLog(state.postId, result.stage || "media_publish", "failure", result.error);
    return { error: result.error, failedStage: result.stage || "media_publish" };
  }

  await writeLog(state.postId, "media_publish", "success", result.igMediaId);
  return { igMediaId: result.igMediaId };
}

/**
 * Node 5: Finalize - update the Post document with the run's outcome,
 * whether it succeeded or failed at some earlier stage.
 */
async function finalizeNode(state) {
  if (state.error) {
    await Post.findByIdAndUpdate(state.postId, {
      status: "failed",
      errorMessage: `[${state.failedStage}] ${state.error}`,
    });
  } else {
    await Post.findByIdAndUpdate(state.postId, {
      status: "posted",
      igMediaId: state.igMediaId,
      imageUrl: state.imageUrl,
      caption: state.caption,
      publishedAt: new Date(),
    });
  }
  return {};
}

/**
 * Conditional router used after every node.
 * If a node set `state.error`, skip straight to "finalize" instead
 * of continuing the pipeline and wasting further API calls.
 */
function routeAfter(nextNode) {
  return (state) => (state.error ? "finalize" : nextNode);
}

/**
 * Builds and compiles the LangGraph pipeline.
 */
function buildPostingGraph() {
  const graph = new StateGraph(PostState)
    .addNode("generate_caption", generateCaptionNode)
    .addNode("generate_image", generateImageNode)
    .addNode("upload_image", uploadImageNode)
    .addNode("publish_to_instagram", publishToInstagramNode)
    .addNode("finalize", finalizeNode)

    .addEdge("__start__", "generate_caption")
    .addConditionalEdges("generate_caption", routeAfter("generate_image"))
    .addConditionalEdges("generate_image", routeAfter("upload_image"))
    .addConditionalEdges("upload_image", routeAfter("publish_to_instagram"))
    .addConditionalEdges("publish_to_instagram", routeAfter("finalize"))
    .addEdge("finalize", END);

  return graph.compile();
}

/**
 * Runs the full daily posting pipeline for a given account.
 * `postId` must already exist in Mongo (status: "processing") before
 * calling this - the route or cron job that triggers this pipeline
 * is responsible for creating that document first.
 */
async function runDailyPostPipeline({ postId, igUserId, accessToken }) {
  const app = buildPostingGraph();

  const finalState = await app.invoke({
    postId,
    igUserId,
    accessToken,
  });

  return finalState;
}

module.exports = {
  runDailyPostPipeline,
};