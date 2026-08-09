const mongoose = require("mongoose");

/**
 * src/models/Job.js
 *
 * Dedicated collection for REAL job openings fetched from external sources.
 * Stored independently (not embedded in Post) so jobs can be queried,
 * searched, and reused. Indexed on company, role, and applyLink for fast,
 * easy lookup by Company name, Role, and Job link as requested.
 */
const jobSchema = new mongoose.Schema(
  {
    // --- Core job info ---
    company: {
      type: String,
      required: true,
      index: true, // easy access by Company name
      trim: true,
    },
    role: {
      type: String,
      required: true,
      index: true, // easy access by Role
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },

// --- Eligibility / requirements ---
    eligibility: {
      type: String,
      default: "",
    },
    experience: {
      type: String,
      default: "",
    },
    jobType: {
      type: String,
      default: "Full-time",
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

    // --- Links (the key ask) ---
    // Real application link (careers page / job posting) so followers can apply.
    applyLink: {
      type: String,
      required: true,
      index: true, // easy access by Job link
      trim: true,
    },
    // Source/resource link (where the job was pulled from / how to verify).
    resourceLink: {
      type: String,
      default: "",
    },

    // --- Source tracking / dedupe ---
    source: {
      type: String,
      default: "external", // e.g. "remotive", "external", "fallback"
    },
    // Unique id from the external source - used to avoid duplicate imports.
    externalId: {
      type: String,
      default: "",
      index: true,
    },

    // --- Posting lifecycle ---
    postedDate: {
      type: Date,
      default: null,
    },
    // Whether this job has already been turned into an IG post.
    isPosted: {
      type: Boolean,
      default: false,
    },
    // Reference to the Post that used this job (if any).
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for combined Company + Role lookups (fast filtered search).
jobSchema.index({ company: 1, role: 1 });

module.exports = mongoose.model("Job", jobSchema);
