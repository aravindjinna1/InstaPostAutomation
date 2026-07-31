/**
 * Cron scheduler - triggers the daily Instagram posting pipeline
 * at a configured time. Also exposes a `runNow()` helper used by
 * the manual "run now" API route.
 */

const cron = require("node-cron");

const Account = require("../models/Account");
const Post = require("../models/Post");
const { runDailyPostPipeline } = require("../graph/postPipeline");
const { decrypt } = require("../utils/encryption");

/**
 * Creates a "processing" Post document, runs the pipeline against it,
 * and returns the final state. Used by both the cron job and the
 * manual "run now" route so the logic only lives in one place.
 */
async function triggerDailyPost() {
  /**
   * For now this app manages a single Instagram account.
   * We just grab the first active one.
   */
  const account = await Account.findOne({ isActive: true });

  if (!account) {
    console.error("[Cron] No active Instagram account found - skipping run");
    return { success: false, error: "No active account connected" };
  }

  /**
   * Check token expiry before attempting to post.
   * Long-lived tokens last ~60 days - if it's already expired,
   * fail fast instead of wasting AI generation calls.
   */
  if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
    console.error("[Cron] Access token expired - reconnect the account");
    return { success: false, error: "Access token expired" };
  }

  const post = await Post.create({
    accountId: account._id,
    status: "processing",
    scheduledTime: new Date(),
  });

  console.log(`[Cron] Starting pipeline for post ${post._id}`);

  /**
   * Decrypt the stored token right before use - it should never sit
   * in memory unencrypted for longer than necessary.
   */
  let decryptedToken;
  try {
    decryptedToken = decrypt(account.pageAccessToken);
  } catch (err) {
    console.error("[Cron] Failed to decrypt access token:", err.message);
    await Post.findByIdAndUpdate(post._id, {
      status: "failed",
      errorMessage: "Failed to decrypt stored access token",
    });
    return { success: false, error: "Failed to decrypt access token" };
  }

  const finalState = await runDailyPostPipeline({
    postId: post._id.toString(),
    igUserId: account.igUserId,
    accessToken: decryptedToken,
  });

  if (finalState.error) {
    console.error(`[Cron] Pipeline failed at ${finalState.failedStage}:`, finalState.error);
  } else {
    console.log(`[Cron] Pipeline succeeded - IG media ID: ${finalState.igMediaId}`);
  }

  return finalState;
}

/**
 * Registers the recurring daily cron job.
 * Cron expression is configurable via DAILY_POST_CRON in .env
 * (defaults to 9:00 AM server time if not set).
 */
function startDailyPostCron() {
  const cronExpression = process.env.DAILY_POST_CRON || "0 9 * * *";

  if (!cron.validate(cronExpression)) {
    console.error(`[Cron] Invalid cron expression: ${cronExpression} - job not scheduled`);
    return;
  }

  cron.schedule(cronExpression, async () => {
    console.log(`[Cron] Daily post job triggered at ${new Date().toISOString()}`);
    await triggerDailyPost();
  });

  console.log(`[Cron] Daily post job scheduled with expression: ${cronExpression}`);
}

module.exports = {
  startDailyPostCron,
  triggerDailyPost,
};