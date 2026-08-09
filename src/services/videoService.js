/**
 * src/services/videoService.js
 *
 * Converts a job poster image into a short vertical MP4 video for the
 * Instagram Reels feed. The video holds the static image for a few
 * seconds (no animation - just a clean image-based Reel), which is
 * what the user wants for maximum reach with a minimal, clean look.
 *
 * The MP4 is intentionally SILENT (no embedded audio track). The real,
 * licensed trending song is attached by Instagram itself via the
 * `audio_name` parameter passed to the Reels API (see instagramService.js
 * and trendingMusic.js). Embedding copyrighted tracks directly is not
 * legal, and synthetic beats sound bad - so we leave the audio to
 * Instagram's own music catalog.
 *
 * Uses ffmpeg-static (bundled ffmpeg binary - no global install needed)
 * to encode the image into an H.264 MP4 compatible with Instagram.
 *
 * Note: the MP4 muxer needs a seekable output, so we write to a temp
 * file first, then read it back into a buffer.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

// Fifteen seconds gives viewers enough time to read the poster.
const REEL_DURATION_SECONDS = 15;
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const FPS = 30;

/**
 * Creates a silent MP4 from the image. Keeping the Reel silent lets
 * Instagram attach a real licensed trending song (via audio_name) so the
 * account owner gets genuine trending music without copyright issues.
 *
 * Returns { success, buffer }.
 */
function imageToReelVideo({ imageBuffer }) {
  return new Promise((resolve) => {
    const inputFile = path.join(os.tmpdir(), `reel-input-${Date.now()}.png`);
    const outputFile = path.join(os.tmpdir(), `reel-output-${Date.now()}.mp4`);

    try {
      if (!ffmpegPath) {
        return resolve({ success: false, error: "ffmpeg-static binary not found" });
      }

      // Write the poster image to a temp file
      fs.writeFileSync(inputFile, imageBuffer);

      encodeVideo(inputFile, outputFile)
        .then((result) => {
          cleanup([inputFile, outputFile]);
          resolve(result);
        })
        .catch((err) => {
          cleanup([inputFile, outputFile]);
          resolve({ success: false, error: err.message });
        });
    } catch (err) {
      cleanup([inputFile, outputFile]);
      resolve({ success: false, error: err.message });
    }
  });
}

/**
 * Encodes a silent video from the input image. No audio stream is added.
 * Returns { success, buffer }.
 */
function encodeVideo(inputFile, outputFile) {
  return new Promise((resolve) => {
    // A PNG is a single frame. `-loop 1` is essential: without it FFmpeg
    // outputs one frame (~0.03 sec at 30fps), even when `-t` is set.
    const args = [
      "-y",
      "-loop", "1",
      "-framerate", String(FPS),
      "-i", inputFile,
      "-t", String(REEL_DURATION_SECONDS),
      "-vf",
      `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p`,
      "-sws_flags", "lanczos",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-profile:v", "high",
      "-level", "4.0",
      "-crf", "23",
      "-r", String(FPS),
      "-an", // no audio
      "-movflags", "+faststart",
      "-f", "mp4",
      outputFile,
    ];

    const ffmpeg = spawn(ffmpegPath, args);

    let errorOutput = "";

    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        try {
          const buffer = fs.readFileSync(outputFile);
          resolve({ success: true, buffer, hasAudio: false });
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      } else {
        resolve({
          success: false,
          error: `ffmpeg exited with code ${code}: ${errorOutput.slice(-500)}`,
        });
      }
    });
  });
}

/**
 * Removes temp files if they exist.
 */
function cleanup(files) {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (_) {}
  }
}

module.exports = {
  imageToReelVideo,
  REEL_DURATION_SECONDS,
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
};
