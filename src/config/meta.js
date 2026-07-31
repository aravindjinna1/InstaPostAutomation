// Central place for Meta/Instagram Graph API settings.
// IMPORTANT: Confirm the current API version yourself at
// https://developers.facebook.com/docs/graph-api/changelog
// before going live - Meta ships new versions periodically and
// old ones eventually stop working.

module.exports = {
  GRAPH_API_VERSION: process.env.GRAPH_API_VERSION || "v21.0",
  GRAPH_BASE_URL: "https://graph.facebook.com",
  META_APP_ID: process.env.META_APP_ID,
  META_APP_SECRET: process.env.META_APP_SECRET,
  META_REDIRECT_URI: process.env.META_REDIRECT_URI,
};