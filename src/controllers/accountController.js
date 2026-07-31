/**
 * Account controller - handles checking the connected Instagram
 * account's status. Routes stay thin; logic lives here.
 */

const Account = require("../models/Account");

/**
 * GET /api/account
 * Returns the active connected account's status (never exposes the
 * raw access token to the frontend).
 */
async function getAccountStatus(req, res) {
  const account = await Account.findOne({ isActive: true });

  if (!account) {
    return res.json({ success: true, connected: false });
  }

  res.json({
    success: true,
    connected: true,
    igUserId: account.igUserId,
    igUsername: account.igUsername,
    tokenExpiresAt: account.tokenExpiresAt,
    tokenExpired: account.tokenExpiresAt < new Date(),
  });
}

module.exports = {
  getAccountStatus,
};