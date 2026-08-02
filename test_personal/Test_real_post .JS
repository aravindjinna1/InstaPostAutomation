/**
 * Standalone test script - publishes ONE real test post to Instagram
 * using a manually generated token (from the "Generate token" button
 * in the Meta dashboard), bypassing the full OAuth flow for now.
 *
 * HOW TO USE:
 * 1. Fill in IG_USER_ID and ACCESS_TOKEN below with your real values.
 * 2. Run: node test-real-post.js
 * 3. Check your Instagram account - the post should appear live.
 *
 * DELETE THIS FILE once you're done testing - it will contain your
 * real access token if you leave it filled in, so never commit it.
 */

require("dotenv").config();
const { postImageToInstagram } = require("../src/services/instagramService");

// --- Fill these in with YOUR real values ---
const IG_USER_ID = "17841443005111416"; // from the dashboard - ritam.maty's ID
const ACCESS_TOKEN = "IGAAOkrikQKw1BZAGFpcnFyQTVMSUhiOVozRjExRGdGdmJwc25QRTR4ZAWEwTGpibktyd2dzbGU4dEdxMTUtczNPc0NBY1VlMEZAoU05xZAi11bUVTalZARSTloYmxuNTdHZA2JrVkJHY2REMl9VSjBWY05hSTRramRDNjUtQS0wWFZAtVQZDZD";

// --- A public test image URL (any public image works for this test) ---
const TEST_IMAGE_URL = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";
const TEST_CAPTION = "Testing my automated posting pipeline 🚀 #test";

(async () => {
  console.log("Attempting to publish a real test post to Instagram...");
  console.log("IG User ID:", IG_USER_ID);
  console.log("Image URL:", TEST_IMAGE_URL);
  console.log();

  const result = await postImageToInstagram({
    igUserId: IG_USER_ID,
    accessToken: ACCESS_TOKEN,
    imageUrl: TEST_IMAGE_URL,
    caption: TEST_CAPTION,
  });

  if (result.success) {
    console.log("✅ SUCCESS! Post published.");
    console.log("Creation ID:", result.creationId);
    console.log("Live IG Media ID:", result.igMediaId);
    console.log();
    console.log("Go check your Instagram account now - it should be live.");
  } else {
    console.error("❌ FAILED at stage:", result.stage);
    console.error("Error:", result.error);
  }
})();