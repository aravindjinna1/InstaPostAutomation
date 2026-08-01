const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    // Instagram Business Account ID (from Instagram Login)
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

    // Encrypted long-lived Instagram access token
    accessToken: {
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
