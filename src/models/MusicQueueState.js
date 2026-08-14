const mongoose = require("mongoose");

// Persisted cursor for the local-music folder. Keeping this in Mongo means the
// order continues correctly after a server restart.
const musicQueueStateSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  nextIndex: { type: Number, default: 0 },
}, { timestamps: true, collection: "music-queue-state" });

module.exports = mongoose.model("MusicQueueState", musicQueueStateSchema);
