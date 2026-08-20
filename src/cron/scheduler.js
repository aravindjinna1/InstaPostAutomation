// /**
//  * Cron scheduler - triggers the recurring Instagram posting pipeline
//  * at a configured interval. Also exposes a `runNow()` helper used by
//  * the manual "run now" API route.
//  */

// const cron = require("node-cron");

// const Account = require("../models/Account");
// const Post = require("../models/Post");
// const { runDailyPostPipeline } = require("../graph/postPipeline");
// const { decrypt } = require("../utils/encryption");
// const { refreshExpiringTokens } = require("../controllers/tokenController");

// /**
//  * Creates a "processing" Post document, runs the pipeline against it,
//  * and returns the final state. Used by both the cron job and the
//  * manual "run now" route so the logic only lives in one place.
//  */
// async function triggerDailyPost() {
//   /**
//    * For now this app manages a single Instagram account.
//    * We just grab the first active one.
//    */
//   const account = await Account.findOne({ isActive: true });

//   if (!account) {
//     console.error("[Cron] No active Instagram account found - skipping run");
//     return { success: false, error: "No active account connected" };
//   }

//   /**
//    * Check token expiry before attempting to post.
//    * Long-lived tokens last ~60 days - if it's already expired,
//    * fail fast instead of wasting AI generation calls.
//    */
//   if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
//     console.error("[Cron] Access token expired - reconnect the account");
//     return { success: false, error: "Access token expired" };
//   }

//   const post = await Post.create({
//     accountId: account._id,
//     status: "processing",
//     scheduledTime: new Date(),
//   });

//   console.log(`[Cron] Starting pipeline for post ${post._id}`);

//   /**
//    * Decrypt the stored token right before use - it should never sit
//    * in memory unencrypted for longer than necessary.
//    */
//   let decryptedToken;
//   try {
//     decryptedToken = decrypt(account.accessToken);
//   } catch (err) {
//     console.error("[Cron] Failed to decrypt access token:", err.message);
//     await Post.findByIdAndUpdate(post._id, {
//       status: "failed",
//       errorMessage: "Failed to decrypt stored access token",
//     });
//     return { success: false, error: "Failed to decrypt access token" };
//   }

//   const finalState = await runDailyPostPipeline({
//     postId: post._id.toString(),
//     igUserId: account.igUserId,
//     accessToken: decryptedToken,
//   });

//   // Only an actual published Instagram media id counts as success. A created
//   // container, upload success, or a plain response without an error is NOT a
//   // successful post.
//   if (finalState.error || !finalState.igMediaId) {
//     console.error(
//       `[Cron] Pipeline failed at ${finalState.failedStage || "unknown"}: ${
//         finalState.error || "Instagram did not return a published media id"
//       }`
//     );
//   } else {
//     console.log(`[Cron] Pipeline succeeded - IG media ID: ${finalState.igMediaId}`);
//   }

//   return finalState;
// }

// /**
//  * Registers the recurring daily cron job.
//  * Uses one or two cron expressions in India Standard Time. Set
//  * DAILY_POST_CRON_1 and DAILY_POST_CRON_2 to schedule separate half-hour
//  * slots. The legacy DAILY_POST_CRON remains supported for existing setups.
//  */
// function startDailyPostCron() {
//   const expressions = [
//     process.env.DAILY_POST_CRON_1,
//     process.env.DAILY_POST_CRON_2,
//   ].filter(Boolean);


//   // const schedules = expressions.length
//   //   ? expressions
//   //   : [process.env.DAILY_POST_CRON || "0 6-23 * * *"];

//   const schedules = expressions.length
//   ? expressions
//   : [
//       process.env.DAILY_POST_CRON_1 ||
//         "0 7,11,15 * * *",
//       process.env.DAILY_POST_CRON_2 ||
//         "0 19,23 * * *",
//     ];

//   for (const cronExpression of schedules) {
//     if (!cron.validate(cronExpression)) {
//       console.error(`[Cron] Invalid daily-post expression: ${cronExpression} - job not scheduled`);
//       continue;
//     }

//     cron.schedule(cronExpression, async () => {
//       console.log(`[Cron] Daily post job triggered at ${new Date().toISOString()}`);
//       await triggerDailyPost();
//     }, { timezone: "Asia/Kolkata" });

//     console.log(`[Cron] Daily post job scheduled (Asia/Kolkata): ${cronExpression}`);
//   }
// }

// /**
//  * Registers the recurring weekly token refresh job.
//  * Runs every Monday at 3 AM by default - refreshes any account
//  * whose token is within 10 days of expiring.
//  */
// function startTokenRefreshCron() {
//   const cronExpression = process.env.TOKEN_REFRESH_CRON || "0 3 * * 1";

//   if (!cron.validate(cronExpression)) {
//     console.error(`[Cron] Invalid cron expression: ${cronExpression} - token refresh not scheduled`);
//     return;
//   }

//   cron.schedule(cronExpression, async () => {
//     console.log(`[Cron] Token refresh job triggered at ${new Date().toISOString()}`);
//     await refreshExpiringTokens();
//   });

//   console.log(`[Cron] Token refresh job scheduled with expression: ${cronExpression}`);
// }

// module.exports = {
//   startDailyPostCron,
//   startTokenRefreshCron,
//   triggerDailyPost,
// };










/**
 * Cron scheduler - triggers the recurring Instagram posting pipeline
 * at fixed times. Also exposes a `triggerDailyPost()` helper used by
 * the manual "run now" API route.
 */

const cron = require("node-cron");

const Account = require("../models/Account");
const Post = require("../models/Post");
const { runDailyPostPipeline } = require("../graph/postPipeline");
const { decrypt } = require("../utils/encryption");
const { refreshExpiringTokens } = require("../controllers/tokenController");

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
   * Decrypt the stored token right before use.
   */
  let decryptedToken;

  try {
    decryptedToken = decrypt(account.accessToken);
  } catch (err) {
    console.error("[Cron] Failed to decrypt access token:", err.message);

    await Post.findByIdAndUpdate(post._id, {
      status: "failed",
      errorMessage: "Failed to decrypt stored access token",
    });

    return {
      success: false,
      error: "Failed to decrypt access token",
    };
  }

  const finalState = await runDailyPostPipeline({
    postId: post._id.toString(),
    igUserId: account.igUserId,
    accessToken: decryptedToken,
  });

  /**
   * Only an actual published Instagram media ID counts as success.
   */
  if (finalState.error || !finalState.igMediaId) {
    console.error(
      `[Cron] Pipeline failed at ${finalState.failedStage || "unknown"}: ${
        finalState.error ||
        "Instagram did not return a published media id"
      }`
    );
  } else {
    console.log(
      `[Cron] Pipeline succeeded - IG media ID: ${finalState.igMediaId}`
    );
  }

  return finalState;
}

/**
 * Registers the recurring Instagram posting schedule.
 *
 * Fixed schedule in India Standard Time:
 * 07:00 AM
 * 11:00 AM
 * 03:00 PM
 * 07:00 PM
 * 11:00 PM
 *
 * No environment variables are used for the posting schedule.
 */
function startDailyPostCron() {
  const schedules = [
    "0 7,11,15 * * *",
    "0 19,23 * * *",
  ];

  for (const cronExpression of schedules) {
    if (!cron.validate(cronExpression)) {
      console.error(
        `[Cron] Invalid daily-post expression: ${cronExpression} - job not scheduled`
      );
      continue;
    }

    cron.schedule(
      cronExpression,
      async () => {
        console.log(
          `[Cron] Daily post job triggered at ${new Date().toISOString()}`
        );

        await triggerDailyPost();
      },
      {
        timezone: "Asia/Kolkata",
      }
    );

    console.log(
      `[Cron] Daily post job scheduled (Asia/Kolkata): ${cronExpression}`
    );
  }
}

/**
 * Registers the recurring weekly token refresh job.
 * Runs every Monday at 3 AM by default - refreshes any account
 * whose token is within 10 days of expiring.
 */
function startTokenRefreshCron() {
  const cronExpression =
    process.env.TOKEN_REFRESH_CRON || "0 3 * * 1";

  if (!cron.validate(cronExpression)) {
    console.error(
      `[Cron] Invalid cron expression: ${cronExpression} - token refresh not scheduled`
    );
    return;
  }

  cron.schedule(
    cronExpression,
    async () => {
      console.log(
        `[Cron] Token refresh job triggered at ${new Date().toISOString()}`
      );

      await refreshExpiringTokens();
    }
  );

  console.log(
    `[Cron] Token refresh job scheduled with expression: ${cronExpression}`
  );
}

module.exports = {
  startDailyPostCron,
  startTokenRefreshCron,
  triggerDailyPost,
};