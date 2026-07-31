/**
 * Token controller - handles refreshing the long-lived Instagram
 * access token before it expires. Called by the weekly cron job,
 * and can also be triggered manually via a route if needed.
 */

const Account = require("../models/Account");
const { refreshLongLivedToken } = require("../services/metaAuthService");
const { encrypt, decrypt } = require("../utils/encryption");

/**
 * Refreshes the token for a single Account document.
 * Decrypts the current token, exchanges it for a fresh one,
 * re-encrypts, and saves the new token + expiry.
 */
async function refreshAccountToken(account) {
  let currentToken;
  try {
    currentToken = decrypt(account.pageAccessToken);
  } catch (err) {
    return { success: false, error: `Failed to decrypt stored token: ${err.message}` };
  }

  const result = await refreshLongLivedToken(currentToken);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const tokenExpiresAt = new Date(
    Date.now() + (result.expiresInSeconds || 5184000) * 1000
  );

  account.pageAccessToken = encrypt(result.accessToken);
  account.tokenExpiresAt = tokenExpiresAt;
  await account.save();

  return { success: true, tokenExpiresAt };
}

/**
 * Refreshes tokens for all active accounts that are within the
 * "refresh window" - i.e. close enough to expiry to need renewing,
 * but not already expired (an expired token can't be refreshed,
 * only replaced via a fresh OAuth connect).
 */
async function refreshExpiringTokens() {
  const REFRESH_WINDOW_DAYS = 10;
  const windowCutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const accountsToRefresh = await Account.find({
    isActive: true,
    tokenExpiresAt: { $lte: windowCutoff, $gte: new Date() },
  });

  if (accountsToRefresh.length === 0) {
    console.log("[TokenRefresh] No accounts need refreshing right now");
    return { refreshed: 0, failed: 0 };
  }

  let refreshed = 0;
  let failed = 0;

  for (const account of accountsToRefresh) {
    const result = await refreshAccountToken(account);

    if (result.success) {
      refreshed += 1;
      console.log(
        `[TokenRefresh] Refreshed token for ${account.igUserId} - new expiry: ${result.tokenExpiresAt.toISOString()}`
      );
    } else {
      failed += 1;
      console.error(`[TokenRefresh] Failed to refresh token for ${account.igUserId}:`, result.error);
    }
  }

  return { refreshed, failed };
}

module.exports = {
  refreshAccountToken,
  refreshExpiringTokens,
};