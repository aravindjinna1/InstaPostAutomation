const cloudinary = require("../config/cloudinary");

/**
 * Uploads a base64-encoded image (from aiService.generateImage) to Cloudinary
 * and returns a public URL. Instagram's API requires a public image_url -
 * it cannot accept raw base64 or local files.
 */
async function uploadImageToCloudinary({ base64Data, mimeType }) {
  try {
    // Cloudinary accepts a data URI directly: "data:<mime>;base64,<data>"
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "ig-auto-poster", // keeps generated images organized in your Cloudinary dashboard
      resource_type: "image",
    });

    return {
      success: true,
      publicUrl: result.secure_url,
      publicId: result.public_id, // useful later if you want to delete/manage the asset
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  uploadImageToCloudinary,
};