const axios = require("axios");
const {
  GEMINI_API_KEY,
  GEMINI_BASE_URL,
  TEXT_MODEL,
  IMAGE_MODEL,
} = require("../config/gemini");
const { buildJobGenerationPrompt } = require("../utils/jobPrompts");

/**
 * Calls Gemini's Imagen API to return a base64 image. Imagen is far
 * more detailed and higher-quality than Pollinations' free Flux model.
 * Uses the image model configured in .env (defaults to
 * gemini-2.5-flash-image). Returns { success, base64Data, mimeType }.
 */
async function generateImageWithGemini(prompt) {
  try {
    const url = `${GEMINI_BASE_URL}/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          // IMPORTANT: For Gemini image models (gemini-3-pro-image /
          // gemini-2.5-flash-image), the aspectRatio must live inside the
          // nested `imageConfig` object — placing it directly in
          // generationConfig throws "Unknown name aspectRatio".
          responseModalities: ["IMAGE"],
          imageConfig: {
            // Taller 9:16 canvas matches the vertical reel/poster so the
            // generated hero image is higher resolution and needs less
            // upscaling/cropping, keeping it sharp as the reel cover/banner.
            aspectRatio: "9:16",
          },
        },
      },
      { timeout: 180000 } // allow up to 3 min for higher-quality generation
    );

    const parts =
      response.data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData);

    if (!imagePart?.inlineData?.data) {
      return {
        success: false,
        error: "Gemini returned no image data (check IMAGE_MODEL in .env)",
      };
    }

    return {
      success: true,
      base64Data: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

/**
 * Generates a realistic job posting using Gemini.
 * Uses a detailed prompt (with today's date) so the post feels current
 * and realistic. Returns a parsed job object with all key fields.
 */
async function generateJobPost() {
  const prompt = buildJobGenerationPrompt();

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
      return { success: false, error: "No job data returned from Gemini" };
    }

    // Gemini may wrap the JSON in ```json ... ``` fences - strip them.
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const job = JSON.parse(cleaned);

    // Basic validation of the parsed job object
    if (!job.role || !job.company) {
      return { success: false, error: "Job data missing required fields" };
    }

    return { success: true, job };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

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
    "A clean, minimal, aesthetic tech workspace with a laptop, professional photography, no text.";

  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    // Use a random seed on every request so the same prompt does NOT
    // produce the identical image each run (Pollinations defaults to
    // seed 42 otherwise, which makes outputs deterministic/identical).
    const seed = Math.floor(Math.random() * 1_000_000);

    // High-quality settings:
    //  - model 'flux' (higher quality than the default 'sana')
    //  - larger 1280x1280 resolution for sharper Instagram posts
    //  - 'enhance' improves the visual quality of the generated image
    const response = await axios.get(url, {
      params: {
        width: 1280,
        height: 1280,
        model: "flux",
        nologo: true,
        enhance: true,
        seed, // random seed = unique image each run
      },
      responseType: "arraybuffer",
      timeout: 180000, // allow up to 3 min for higher-quality generation
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
  generateJobPost,
  generateCaption,
  generateImage,
  generateImageWithGemini,
};
