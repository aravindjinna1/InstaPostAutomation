// Central place for Gemini API settings.
// IMPORTANT: Model names/availability change - verify at
// https://ai.google.dev/gemini-api/docs/models before going live.

module.exports = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models",
  TEXT_MODEL: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
  IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
};