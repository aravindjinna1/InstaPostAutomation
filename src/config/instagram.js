/**
 * Central config for the Instagram API with Instagram Login.
 * This path authenticates directly against an Instagram Business
 * or Creator account - no linked page or Facebook Login involved.
 */

module.exports = {
  IG_AUTH_BASE_URL: "https://api.instagram.com",
  IG_GRAPH_BASE_URL: "https://graph.instagram.com",
  INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
  INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
  INSTAGRAM_REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI,
};
