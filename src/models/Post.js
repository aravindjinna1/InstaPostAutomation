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

// Reference to the stored REAL job this post was created from.
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },

    // --- Denormalized FULL job content (copied from the Job doc at publish
    // time so the Post collection holds complete job details: skills,
    // description, location, salary, eligibility — not just company/role/link).
    company: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    eligibility: {
      type: String,
      default: "",
    },
    jobType: {
      type: String,
      default: "",
    },
    skills: {
      type: String,
      default: "",
    },
    salaryRange: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    applyLink: {
      type: String,
      default: "",
    },
    resourceLink: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "",
    },

// Public image URL (Cloudinary) - required before publishing
    imageUrl: {
      type: String,
      default: "",
    },

    // Public video URL (Cloudinary) - used for Reels
    videoUrl: {
      type: String,
      default: "",
    },

    // Trending song attached to the Reel (from Instagram's licensed library)
    audioName: {
      type: String,
      default: "",
    },

    // Persisted visual palette used by this poster. Rotation themes advance
    // in strict list order; recognized companies use their brand palette.
    posterThemeRank: { type: Number, default: null },
    posterThemeName: { type: String, default: "" },
    posterThemeSource: { type: String, enum: ["rotation", "brand", ""], default: "" },

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
  { timestamps: true, collection: "Jobs-posts" }
);

module.exports = mongoose.model("Post", postSchema);
