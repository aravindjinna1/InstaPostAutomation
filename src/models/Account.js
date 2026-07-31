const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    // Instagram Business Account ID (from Graph API)
    igUserId: {
      type: String,
      required: true,
      unique: true,
    },

    // Display only - not used for API calls
    igUsername: {
      type: String,
      default: "",
    },

    // Facebook Page ID linked to this IG account
    pageId: {
      type: String,
      required: true,
    },

    // Encrypted long-lived Page Access Token (we'll add encryption in the service layer)
    pageAccessToken: {
      type: String,
      required: true,
    },

    // When the long-lived token expires (~60 days from issue)
    tokenExpiresAt: {
      type: Date,
      required: true,
    },

    // Whether this account is currently active for auto-posting
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true } // adds createdAt, updatedAt automatically
);

module.exports = mongoose.model("Account", accountSchema);