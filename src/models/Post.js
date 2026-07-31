const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    // Which IG account this post belongs to
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    // AI-generated caption text
    caption: {
      type: String,
      default: "",
    },

    // Public image URL (Cloudinary) - required before publishing
    imageUrl: {
      type: String,
      default: "",
    },

    // Returned by Instagram after creating the media container (step 1 of publish)
    igCreationId: {
      type: String,
      default: "",
    },

    // Returned by Instagram after successful publish (step 2)
    igMediaId: {
      type: String,
      default: "",
    },

    // Lifecycle status of this post
    status: {
      type: String,
      enum: ["pending", "processing", "posted", "failed"],
      default: "pending",
    },

    // When this post is scheduled to go out
    scheduledTime: {
      type: Date,
      required: true,
    },

    // Set only when successfully published
    publishedAt: {
      type: Date,
      default: null,
    },

    // Stores the last error message if status = failed
    errorMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);