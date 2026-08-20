/**
 * End-to-end test of runDailyPostPipeline with a fully stubbed service/model
 * layer (no DB, no network). Verifies requirement #2/#4/#8:
 *  - a failed publish (media_container rejected) must NOT mark anything posted
 *  - only a real publish that returns an Instagram media id marks things posted
 */
const path = require("path");

const postUpdates = [];
const sourceUpdates = [];
let PUBLISH_RESULT = { success: false, stage: "media_container", error: "The caption was too long." };

function seed(rel, exportsObj) {
  const resolved = path.resolve(__dirname, "..", rel);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exportsObj, children: [], paths: [] };
}

seed("node_modules/mongoose/index.js", {
  connection: { client: { db: () => ({ collection: () => ({ updateOne: async (filter, upd) => { sourceUpdates.push({ filter, upd }); return {}; } }) }) } },
});
seed("src/models/Post.js", { findByIdAndUpdate: async (id, upd) => { postUpdates.push({ id, upd }); return {}; } });
seed("src/models/Job.js", { findByIdAndUpdate: async () => ({}) });
seed("src/models/Log.js", { create: async () => ({}) });
seed("src/models/PosterThemeState.js", { findOneAndUpdate: async () => ({ nextIndex: 3 }) });

seed("src/services/aiService.js", {
  generateImage: async () => ({ success: true, base64Data: "aGVsbG8=", mimeType: "image/jpeg" }),
  generateImageWithGemini: async () => ({ success: false, error: "stub-quota" }),
  generateCaption: async () => ({ success: true, caption: "stub" }),
  generateJobPost: async () => ({ success: true, job: {} }),
});
seed("src/services/uploadService.js", {
  uploadImageToCloudinary: async () => ({ success: true, publicUrl: "https://cloud.example/img.png" }),
  uploadVideoToCloudinary: async () => ({ success: true, publicUrl: "https://cloud.example/reel.mp4" }),
});
seed("src/services/instagramService.js", {
  postReelToInstagram: async () => ({ ...PUBLISH_RESULT }),
  postImageToInstagram: async () => ({ ...PUBLISH_RESULT }),
});
seed("src/services/videoService.js", { imageToReelVideo: async () => ({ success: true, buffer: Buffer.from("aGVsbG8=", "base64") }) });
seed("src/services/localMusicService.js", { getNextLocalMusicTrack: async () => null });
seed("src/services/posterService.js", { renderJobPoster: async () => ({ success: true, buffer: Buffer.from("aGVsbG8=", "base64") }) });
seed("src/services/jobDataService.js", {
  getNextJobForPosting: async () => ({
    _id: "job123",
    company: "EY",
    role: "Analyst",
    location: "Bangalore, India",
    skills: "SQL, Power BI, Alteryx",
    salaryRange: "₹ 8-12 LPA",
    jobType: "Full-time",
    experience: "0-1 years",
    eligibility: "",
    sourceDb: "JobsData_fromBlogs",
    sourceCollection: "New_Jobs",
  }),
});

const { runDailyPostPipeline } = require("../src/graph/postPipeline");

let failures = 0;
function check(name, cond, extra) {
  console.log(cond ? "PASS" : "FAIL", "-", name, extra || "");
  if (!cond) failures++;
}