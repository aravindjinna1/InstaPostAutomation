/**
 * Post controller - handles manually triggering the pipeline and
 * managing post history. Routes stay thin; logic lives here.
 */

const Post = require("../models/Post");
const Log = require("../models/Log");
const { triggerDailyPost } = require("../cron/scheduler");

/**
 * POST /api/posts/run-now
 * Manually runs the full posting pipeline immediately,
 * without waiting for the daily cron schedule.
 */
async function runNow(req, res) {
  const result = await triggerDailyPost();

  if (result.error) {
    return res
      .status(500)
      .json({ success: false, stage: result.failedStage, error: result.error });
  }

  res.json({ success: true, igMediaId: result.igMediaId });
}

/**
 * GET /api/posts
 * Lists all posts, most recent first.
 */
async function listPosts(req, res) {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json({ success: true, posts });
}

/**
 * GET /api/posts/:id
 * Gets a single post along with its pipeline logs.
 */
async function getPostById(req, res) {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  const logs = await Log.find({ postId: post._id }).sort({ createdAt: 1 });

  res.json({ success: true, post, logs });
}

/**
 * DELETE /api/posts/:id
 * Removes a post record (does NOT delete the live Instagram post itself -
 * Instagram's API does not support deleting published media via this flow).
 */
async function deletePost(req, res) {
  const post = await Post.findByIdAndDelete(req.params.id);

  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  res.json({ success: true, message: "Post record deleted" });
}

module.exports = {
  runNow,
  listPosts,
  getPostById,
  deletePost,
};