/**
 * Handles the Meta OAuth flow: exchanging an auth code for tokens,
 * upgrading to a long-lived token, and resolving the Page + Instagram
 * Business Account IDs needed for posting.
 */

const axios = require("axios");
const {
  GRAPH_API_VERSION,
  GRAPH_BASE_URL,
  META_APP_ID,
  META_APP_SECRET,
  META_REDIRECT_URI,
} = require("../config/meta");

const BASE = `${GRAPH_BASE_URL}/${GRAPH_API_VERSION}`;

/**
 * Step 1: Exchange the OAuth "code" (from the redirect callback)
 * for a short-lived user access token.
 */
async function exchangeCodeForShortLivedToken(code) {
  try {
    const response = await axios.get(`${BASE}/oauth/access_token`, {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: META_REDIRECT_URI,
        code,
      },
    });

    return { success: true, accessToken: response.data.access_token };
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Step 2: Exchange the short-lived token for a long-lived one (~60 days).
 */
async function exchangeForLongLivedToken(shortLivedToken) {
  try {
    const response = await axios.get(`${BASE}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    return {
      success: true,
      accessToken: response.data.access_token,
      expiresInSeconds: response.data.expires_in,
    };
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Step 3: Get the Facebook Page(s) connected to this user, along with
 * each Page's own access token (needed for publishing).
 */
async function getPages(userAccessToken) {
  try {
    const response = await axios.get(`${BASE}/me/accounts`, {
      params: { access_token: userAccessToken },
    });

    return { success: true, pages: response.data.data };
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Step 4: Get the Instagram Business Account ID linked to a given Page.
 */
async function getInstagramBusinessAccountId(pageId, pageAccessToken) {
  try {
    const response = await axios.get(`${BASE}/${pageId}`, {
      params: {
        fields: "instagram_business_account",
        access_token: pageAccessToken,
      },
    });

    const igAccount = response.data.instagram_business_account;

    if (!igAccount) {
      return { success: false, error: "No Instagram Business account linked to this Page" };
    }

    return { success: true, igUserId: igAccount.id };
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Full flow: takes the OAuth "code" and resolves everything needed
 * to save an Account document - Page ID, IG User ID, long-lived
 * Page Access Token, and its expiry date.
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

  const pagesResult = await getPages(longLived.accessToken);
  if (!pagesResult.success || pagesResult.pages.length === 0) {
    return { success: false, stage: "get_pages", error: pagesResult.error || "No Pages found" };
  }

  /** Uses the first connected Page - fine for a single-account setup. */
  const page = pagesResult.pages[0];

  const igResult = await getInstagramBusinessAccountId(page.id, page.access_token);
  if (!igResult.success) {
    return { success: false, stage: "get_ig_account", error: igResult.error };
  }

  const tokenExpiresAt = new Date(
    Date.now() + (longLived.expiresInSeconds || 5184000) * 1000 // fallback ~60 days
  );

  return {
    success: true,
    igUserId: igResult.igUserId,
    pageId: page.id,
    pageAccessToken: page.access_token,
    tokenExpiresAt,
  };
}

/**
 * Refreshes an existing long-lived Page Access Token.
 * Meta allows re-exchanging a still-valid long-lived token for a
 * fresh one with a new ~60-day expiry, using the same
 * fb_exchange_token grant type as the initial upgrade.
 * Must be called BEFORE the current token expires - an already
 * expired token cannot be refreshed and requires reconnecting.
 */
async function refreshLongLivedToken(currentToken) {
  return exchangeForLongLivedToken(currentToken);
}

module.exports = {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  refreshLongLivedToken,
  getPages,
  getInstagramBusinessAccountId,
  completeInstagramConnection,
};