const axios = require("axios");
const {
  GEMINI_API_KEY,
  GEMINI_BASE_URL,
  TEXT_MODEL,
  IMAGE_MODEL,
} = require("../config/gemini");

/**
 * Generates a caption for the daily Instagram post.
 * You control the "personality"/topic by editing the prompt below
 * or passing a custom `topicPrompt`.
 */
async function generateCaption(topicPrompt) {
  const prompt =
    topicPrompt ||
    "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: motivation for daily productivity.";

  try {
    const url = `${GEMINI_BASE_URL}/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(url, {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    });

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return { success: false, error: "No caption text returned from Gemini" };
    }

    return { success: true, caption: text };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

/**
 * Generates an image for the daily Instagram post using Pollinations.ai's
 * Flux model - free, no API key, no signup, no billing required.
 * Returns raw base64 image data + mime type - the caller (Cloudinary
 * upload service) is responsible for turning this into a public URL.
 */
async function generateImage(imagePrompt) {
  const prompt =
    imagePrompt ||
    "A clean, minimal, aesthetic photo representing daily motivation and productivity, soft natural lighting, no text.";

  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    const response = await axios.get(url, {
      params: {
        width: 1024,
        height: 1024,
        nologo: true,
      },
      responseType: "arraybuffer",
    });

    const base64Data = Buffer.from(response.data).toString("base64");
    const mimeType = response.headers["content-type"] || "image/jpeg";

    return { success: true, base64Data, mimeType };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.toString() || err.message,
    };
  }
}

module.exports = {
  generateCaption,
  generateImage,
};