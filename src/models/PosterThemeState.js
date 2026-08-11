const mongoose = require("mongoose");

// A single persisted counter makes fallback-theme allocation serial even when
// the server restarts. Brand-colour posters deliberately do not consume it.
const posterThemeStateSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  nextIndex: { type: Number, default: 0 },
}, { timestamps: true, collection: "poster-theme-state" });

module.exports = mongoose.model("PosterThemeState", posterThemeStateSchema);
