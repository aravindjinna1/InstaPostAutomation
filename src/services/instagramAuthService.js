/**
 * Handles the Instagram Login OAuth flow: exchanging an auth code
 * for tokens, upgrading to a long-lived token, and refreshing it.
 * This path never touches Facebook - no linked page lookups, no Facebook Login.
 */

const axios = require("axios");
const {
  IG_AUTH_BASE_URL,
  IG_GRAPH_BASE_URL,
  INSTAGRAM_APP_ID,
  INSTAGRAM_APP_SECRET,
  INSTAGRAM_REDIRECT_URI,
} = require("../config/instagram");

function getErrorMessage(err) {
  return (
    err.response?.data?.error_message ||
    err.response?.data?.error?.message ||
    err.message
  );
}

/**
 * Step 1: Exchange the OAuth "code" (from the redirect callback)
 * for a short-lived access token. This also directly returns the
 * Instagram user_id - no separate Page/account lookup needed.
 */
async function exchangeCodeForShortLivedToken(code) {
  try {
    const params = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: INSTAGRAM_REDIRECT_URI,
      code,
    });

    const response = await axios.post(
      `${IG_AUTH_BASE_URL}/oauth/access_token`,
      params
    );

    return {
      success: true,
      accessToken: response.data.access_token,
      igUserId: response.data.user_id,
    };
  } catch (err) {
    return {
      success: false,
      error: getErrorMessage(err),
    };
  }
}

/**
 * Step 2: Exchange the short-lived token for a long-lived one (~60 days).
 */
async function exchangeForLongLivedToken(shortLivedToken) {
  try {
    const response = await axios.get(`${IG_GRAPH_BASE_URL}/access_token`, {
      params: {
        grant_type: "ig_exchange_token",
        client_secret: INSTAGRAM_APP_SECRET,
        access_token: shortLivedToken,
      },
    });

    return {
      success: true,
      accessToken: response.data.access_token,
      expiresInSeconds: response.data.expires_in,
    };
  } catch (err) {
    return {
      success: false,
      error: getErrorMessage(err),
    };
  }
}

/**
 * Refreshes an existing long-lived token for another ~60 days.
 * The token must already be at least 24 hours old and not yet
 * expired - an expired token cannot be refreshed, only replaced
 * via a fresh OAuth connect.
 */
async function refreshLongLivedToken(currentToken) {
  try {
    const response = await axios.get(
      `${IG_GRAPH_BASE_URL}/refresh_access_token`,
      {
        params: {
          grant_type: "ig_refresh_token",
          access_token: currentToken,
        },
      }
    );

    return {
      success: true,
      accessToken: response.data.access_token,
      expiresInSeconds: response.data.expires_in,
    };
  } catch (err) {
    return {
      success: false,
      error: getErrorMessage(err),
    };
  }
}

/**
 * Full flow: takes the OAuth "code" and resolves everything needed
 * to save an Account document - IG User ID and a long-lived token
 * with its expiry. No linked page lookups are involved at any step.
 */
async function completeInstagramConnection(code) {
  const shortLived = await exchangeCodeForShortLivedToken(code);
  if (!shortLived.success) {
    return { success: false, stage: "short_lived_token", error: shortLived.error };
  }

  const longLived = await exchangeForLongLivedToken(shortLived.accessToken);
  if (!longLived.success) {
    return { success: false, stage: "long_lived_token", error: longLived.error };
  }

  const tokenExpiresAt = new Date(
    Date.now() + (longLived.expiresInSeconds || 5184000) * 1000
  );

  return {
    success: true,
    igUserId: shortLived.igUserId,
    accessToken: longLived.accessToken,
    tokenExpiresAt,
  };
}

module.exports = {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  refreshLongLivedToken,
  completeInstagramConnection,
};
