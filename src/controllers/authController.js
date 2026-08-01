/**
 * Auth controller - handles the Instagram Login connect flow logic.
 * Routes stay thin; all logic for these endpoints lives here.
 * This path never touches Facebook - no Page, no Facebook Login.
 */

const Account = require("../models/Account");
const { completeInstagramConnection } = require("../services/instagramAuthService");
const { INSTAGRAM_APP_ID, INSTAGRAM_REDIRECT_URI } = require("../config/instagram");
const { encrypt } = require("../utils/encryption");

/**
 * GET /api/auth/instagram
 * Redirects the user to Instagram's own OAuth consent screen.
 */
function redirectToInstagramAuth(req, res) {
  const scopes = ["instagram_business_basic", "instagram_business_content_publish"].join(",");

  const authUrl =
    `https://www.instagram.com/oauth/authorize` +
    `?client_id=${INSTAGRAM_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${scopes}`;

  res.redirect(authUrl);
}

/**
 * GET /api/auth/instagram/callback
 * Instagram redirects here after the user approves the app.
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

  /** Encrypt the token before it ever touches the database. */
  const encryptedToken = encrypt(result.accessToken);

  /** Upsert - if this igUserId already exists, update its token instead of duplicating. */
  const account = await Account.findOneAndUpdate(
    { igUserId: result.igUserId },
    {
      igUserId: result.igUserId,
      accessToken: encryptedToken,
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
