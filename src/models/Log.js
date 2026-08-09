const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    // Which post this log entry belongs to
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },

// Which pipeline stage this log is about
    stage: {
      type: String,
      enum: [
        "job_generation",
        "caption_generation",
        "image_generation",
        "poster_render",
        "image_upload",
        "video_creation",
        "video_upload",
        "media_container",
        "media_publish",
        "token_refresh",
        "music_selection",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: ["success", "failure"],
      required: true,
    },

    message: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);