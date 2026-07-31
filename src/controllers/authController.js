/**
 * Auth controller - handles the Instagram OAuth connect flow logic.
 * Routes stay thin; all logic for these endpoints lives here.
 */

const Account = require("../models/Account");
const { completeInstagramConnection } = require("../services/metaAuthService");
const { META_APP_ID, META_REDIRECT_URI } = require("../config/meta");

/**
 * GET /api/auth/instagram
 * Redirects the user to Meta's OAuth consent screen.
 */
function redirectToInstagramAuth(req, res) {
  const scopes = [
    "pages_show_list",
    "instagram_basic",
    "instagram_content_publish",
    "pages_read_engagement",
  ].join(",");

  const authUrl =
    `https://www.facebook.com/dialog/oauth` +
    `?client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}` +
    `&scope=${scopes}`;

  res.redirect(authUrl);
}

/**
 * GET /api/auth/instagram/callback
 * Meta redirects here after the user approves the app.
 * Exchanges the code for tokens and saves/updates the Account document.
 */
async function handleInstagramCallback(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ success: false, error });
  }

  if (!code) {
    return res.status(400).json({ success: false, error: "Missing authorization code" });
  }

  const result = await completeInstagramConnection(code);

  if (!result.success) {
    return res.status(500).json({ success: false, stage: result.stage, error: result.error });
  }

  /** Upsert - if this igUserId already exists, update its token instead of duplicating. */
  const account = await Account.findOneAndUpdate(
    { igUserId: result.igUserId },
    {
      igUserId: result.igUserId,
      pageId: result.pageId,
      pageAccessToken: result.pageAccessToken,
      tokenExpiresAt: result.tokenExpiresAt,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    message: "Instagram account connected successfully",
    account: {
      igUserId: account.igUserId,
      tokenExpiresAt: account.tokenExpiresAt,
    },
  });
}

module.exports = {
  redirectToInstagramAuth,
  handleInstagramCallback,
};