/**
 * LangGraph pipeline that wires together caption generation, image
 * generation, Cloudinary upload, and Instagram publishing into one
 * automated daily posting flow.
 */

require("@langchain/langgraph/zod");
const { z } = require("zod");
const mongoose = require("mongoose");
const { StateGraph, END } = require("@langchain/langgraph");

const { generateCaption, generateImage, generateImageWithGemini, generateJobPost } = require("../services/aiService");
const { uploadImageToCloudinary, uploadVideoToCloudinary } = require("../services/uploadService");
const { postImageToInstagram, postReelToInstagram } = require("../services/instagramService");
const { getDailyPrompt } = require("../utils/promptrotationdaily");
const { buildRealJobCaption, buildJobImagePrompt, getCompanyBrandColors, getPosterTheme } = require("../utils/jobPrompts");
const { imageToReelVideo } = require("../services/videoService");
const { getNextLocalMusicTrack } = require("../services/localMusicService");
const { renderJobPoster } = require("../services/posterService");
const { getNextJobForPosting } = require("../services/jobDataService");

const Post = require("../models/Post");
const Job = require("../models/Job");
const Log = require("../models/Log");
const PosterThemeState = require("../models/PosterThemeState");

async function assignPosterTheme(postId, job) {
  const brand = getCompanyBrandColors(job.company);
  let theme;
  let source;

  if (brand) {
    theme = { ...brand, name: `${job.company} brand colours` };
    source = "brand";
  } else {
    // Atomic increment: allocation is always 1, 2, ... 20, 1, 2 ... and can
    // never become random or repeat under concurrent pipeline requests.
    const state = await PosterThemeState.findOneAndUpdate(
      { key: "fallback-poster-theme" },
      { $inc: { nextIndex: 1 } },
      // On an upsert, $inc creates nextIndex as 1. Disabling defaults here
      // avoids Mongo receiving a conflicting $setOnInsert for the same path.
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
    theme = getPosterTheme(state.nextIndex);
    source = "rotation";
  }

  if (postId) {
    await Post.findByIdAndUpdate(postId, {
      posterThemeRank: theme.rank || null,
      posterThemeName: theme.name,
      posterThemeSource: source,
    });
  }
  return theme;
}

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
  job: z.any().optional(),
  caption: z.string().optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  audioName: z.string().optional(),
  audioAssetId: z.string().optional(),
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
 * Node 1: Pick the next unposted job from the app's own database and
 * build an engaging Instagram caption from it. The caption includes the real
 * Apply Link so followers can apply directly. This keeps posting tied to your
 * own job data source rather than the legacy external fetchers.
 */
async function generateCaptionNode(state) {
  const job = await getNextJobForPosting();

  if (!job) {
    const err = "No unposted job found in the database";
    await writeLog(state.postId, "job_generation", "failure", err);
    return { error: err, failedStage: "job_generation" };
  }

  const posterTheme = await assignPosterTheme(state.postId, job);
  const themedJob = { ...job, posterTheme };
  const caption = buildRealJobCaption(themedJob);

  await writeLog(state.postId, "job_generation", "success", `${job.role || ""} @ ${job.company || ""} (${job.applyLink || job.resourceLink || ""})`);
  await writeLog(state.postId, "caption_generation", "success", caption);
  return { job: themedJob, caption };
}

/**
 * Node 2: Generate the recruitment poster.
 *
 * STRATEGY (always produces a correctly-spelled poster, no hard failure):
 *  1. PRIMARY — Gemini Imagen renders the ENTIRE poster (all text baked in)
 *     in the premium "poster-preview-v232.png" style. Only used if available.
 *  2. AUTOMATIC FALLBACK — if Gemini image generation is unavailable
 *     (quota/billing/any error), we render the poster locally with canvas:
 *     a free Pollinations/Flux photo background + then overlay crisp,
 *     correctly-spelled job text via posterService. This does NOT depend on
 *     Gemini or any paid image API, so a real poster is ALWAYS produced.
 *
 * Because Gemini image generation is frequently rate-limited/exhausted,
 * the canvas fallback is enabled automatically (no env flag needed).
 */
async function generateImageNode(state) {
  const imagePrompt = buildJobImagePrompt(state.job || {});

  // ---- 1. PRIMARY: Gemini Imagen full-poster ----
  const result = await generateImageWithGemini(imagePrompt);

  if (result.success) {
    await writeLog(state.postId, "image_generation", "success", "Job poster generated by Gemini AI");
    return {
      imageBase64: result.base64Data,
      imageMimeType: result.mimeType || "image/png",
    };
  }

  // Gemini failed — note WHY for the log, but continue to auto fallback.
  const isQuota = /quota|billing|rate|limit/i.test(result.error || "");
  const reason = isQuota
    ? "Gemini image quota exhausted (check billing at aistudio.google.com or use a different API key)"
    : `Gemini image generation failed: ${result.error}`;
  console.warn("[Pipeline] " + reason + " — auto-falling back to canvas poster.");

// ---- 2. FALLBACK: free photo background + canvas text overlay ----
  const bgPrompt =
    "Modern corporate IT campus headquarters building, blue glass architecture skyscraper, bright blue sky, green trees and road, professional real estate photography, corporate recruitment campaign, bright airy premium, vertical 9:16, no text, no words, no people, high quality";
  const bg = await generateImage(bgPrompt);

  if (!bg.success) {
    await writeLog(state.postId, "image_generation", "failure", `${reason}. And fallback background also failed: ${bg.error}`);
    return { error: `${reason}. Fallback background also failed: ${bg.error}`, failedStage: "image_generation" };
  }

  // Overlay crisp, correctly-spelled poster text on top of the photo.
  const poster = await renderJobPoster({
    backgroundBuffer: Buffer.from(bg.base64Data, "base64"),
    job: state.job || {},
  });

  if (!poster.success) {
    await writeLog(state.postId, "image_generation", "failure", `${reason}. And canvas overlay failed: ${poster.error}`);
    return { error: `${reason}. Canvas overlay failed: ${poster.error}`, failedStage: "image_generation" };
  }

  await writeLog(state.postId, "image_generation", "success", "Job poster (canvas overlay, photo bg) generated — Gemini was unavailable: " + result.error);
  return {
    imageBase64: poster.buffer.toString("base64"),
    imageMimeType: "image/png",
  };
}

/**
 * Node 3: Convert the poster into a Reel video and upload to Cloudinary.
 * Reels require a hosted video URL. We convert the poster image into a
 * short static MP4 (no animation) and upload it as a video resource.
 */
async function uploadImageNode(state) {
  // Reserve the next local track in filename order. The persistent cursor is
  // atomic, so restarts and overlapping posting jobs cannot reuse a slot.
  const track = await getNextLocalMusicTrack();
  if (track) {
    await writeLog(
      state.postId,
      "music_selection",
      "success",
      `${track.fileName} (${track.position}/${track.total})`
    );
  } else {
    await writeLog(state.postId, "music_selection", "success", "No local music files found; publishing without audio");
  }

  // Embed the selected file so Instagram receives it as the Reel's original
  // audio. Only place tracks here that you are allowed to use.
  const video = await imageToReelVideo({
    imageBuffer: Buffer.from(state.imageBase64, "base64"),
    audioFile: track ? track.filePath : undefined,
  });

  if (!video.success) {
    await writeLog(state.postId, "video_creation", "failure", video.error);
    return { error: video.error, failedStage: "video_creation" };
  }

  const videoBase64 = video.buffer.toString("base64");

  const result = await uploadVideoToCloudinary({
    base64Data: videoBase64,
    mimeType: "video/mp4",
  });

  if (!result.success) {
    await writeLog(state.postId, "video_upload", "failure", result.error);
    return { error: result.error, failedStage: "video_upload" };
  }

  await writeLog(state.postId, "video_upload", "success", result.publicUrl);
  return {
    videoUrl: result.publicUrl,
    audioName: track ? track.fileName : "",
    audioAssetId: "",
  };
}

/**
 * Node 4: Publish to Instagram as a REEL.
 * The selected local track is already embedded in the MP4, so it is published
 * as the Reel's original audio. Do not send the filename as `audio_name`:
 * that parameter is only for Instagram catalog tracks.
 */
async function publishToInstagramNode(state) {
  const result = await postReelToInstagram({
    igUserId: state.igUserId,
    accessToken: state.accessToken,
    videoUrl: state.videoUrl,
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
    // Link the selected job to this post and mark it as posted so it
    // won't be reused for a future post.
    const job = state.job;
    if (job && job._id) {
      if (job.sourceDb && job.sourceCollection) {
        try {
          const db = mongoose.connection.client.db(job.sourceDb);
          const collection = db.collection(job.sourceCollection);
          await collection.updateOne(
            { _id: job._id },
            {
              $set: {
                status: "posted",
                isPosted: true,
                postId: state.postId,
                postedDate: new Date(),
              },
            }
          );
        } catch (err) {
          console.error("[Pipeline] Failed to update source job document:", err.message);
        }
      } else {
        await Job.findByIdAndUpdate(job._id, {
          isPosted: true,
          postId: state.postId,
          postedDate: new Date(),
        });
      }
    }

    await Post.findByIdAndUpdate(state.postId, {
      status: "posted",
      // Reference + FULL denormalized job content so the Post doc holds every
      // detail (skills, description, location, salary, eligibility, links).
      jobId: job ? job._id : null,
      company: job ? job.company : "",
      role: job ? job.role : "",
      location: job ? job.location : "",
      eligibility: job ? (job.eligibility || job.experience) : "",
      jobType: job ? job.jobType : "",
      skills: job ? job.skills : "",
      salaryRange: job ? job.salaryRange : "",
      description: job ? job.description : "",
      applyLink: job ? job.applyLink : "",
      resourceLink: job ? job.resourceLink : "",
      source: job ? job.source : "",
      igMediaId: state.igMediaId,
      imageUrl: state.imageUrl,
      videoUrl: state.videoUrl,
      audioName: state.audioName,
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
