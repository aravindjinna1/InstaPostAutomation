const fs = require("fs");
const path = require("path");
const MusicQueueState = require("../models/MusicQueueState");

const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  ".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac",
]);

function getMusicDirectory() {
  const configuredDirectory = process.env.LOCAL_MUSIC_DIRECTORY || "music";
  return path.resolve(process.cwd(), configuredDirectory);
}

function getMusicFiles() {
  const directory = getMusicDirectory();
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && SUPPORTED_AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      // The filename is the playlist order: 01-song.mp3, 02-song.mp3, etc.
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
      .map((entry) => ({
        fileName: entry.name,
        filePath: path.join(directory, entry.name),
      }));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Atomically reserves the next track in filename order. It wraps to the first
 * file after the last one, and the persisted counter survives restarts.
 */
async function getNextLocalMusicTrack() {
  const tracks = getMusicFiles();
  if (tracks.length === 0) return null;

  const state = await MusicQueueState.findOneAndUpdate(
    { key: process.env.LOCAL_MUSIC_QUEUE_KEY || "local-reel-music" },
    { $inc: { nextIndex: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: false }
  );
  const index = (state.nextIndex - 1) % tracks.length;

  return { ...tracks[index], position: index + 1, total: tracks.length };
}

module.exports = {
  getMusicDirectory,
  getMusicFiles,
  getNextLocalMusicTrack,
};
