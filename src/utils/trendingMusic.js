/**
 * src/utils/trendingMusic.js
 *
 * A rotating list of popular, trending Indian songs (Hindi, Telugu,
 * Tamil, and other Indian languages) used to attach music to Reels.
 *
 * We pass the song name to Instagram's Reels API via the `audio_name`
 * parameter. Instagram then uses its OWN licensed music library to
 * attach the track to the Reel - this is the safe, legit way to add
 * trending audio without copyright issues.
 *
 * One song is picked at random per post so each Reel gets a different
 * trending track, making the account feel fresh and unique.
 *
 * NOTE: These are well-known current/popular song titles. Instagram
 * matches them against its licensed music catalog. If a song isn't
 * found in IG's catalog, the Reel will still be created (just without
 * that specific audio attached).
 */

/**
 * Trending songs grouped by the language/region. Each reel picks a random
 * song from a random language so the account stays fresh and multilingual.
 */
const TRENDING_SONGS_BY_LANGUAGE = {
  Hindi: [
    "Kesariya",
    "Jhoome Jo Pathaan",
    "Kala Chashma",
    "Lut Gaye",
    "Raataan Lambiyan",
    "Tera Ban Jaunga",
    "Dilbar",
    "Bijli",
    "Sher Khul Gaye",
    "Ranjha",
    "Param Sundari",
    "O Maahi",
    "Apna Bana Le",
    "Jhoom",
    "Heeriye",
    "Tum Kya Mile",
    "Kho Gaye Hum Kahan",
    "Jale 2",
    "Nain Matakka",
    "Chaleya",
    "O Bedardeya",
  ],

  Telugu: [
    "Oo Antava Oo Oo Antava",
    "Saami Saami",
    "Butta Bomma",
    "Kurchi Madathapetti",
    "Naatu Naatu",
    "Chuttamalle",
    "Fear Song",
    "Dhop",
    "Le Le Le",
    "Vaathi Coming",
    "Oo Cheliya",
    "Pillaa Raa",
    "Jwala Reddy",
    "Cult of MLA",
    "Uppena",
    "Ninnu Kori",
    "Shiva Shambho",
    "Arerey Manasa",
    "Top Lesi Poddi",
    "Blockbuster",
  ],

  Tamil: [
    "Arabic Kuthu",
    "Jalabulajangu",
    "Kutty Story",
    "Needhaana Oru Divasam",
    "Vaa Vaathi",
    "Manjal Veyil",
    "Pona Porandhom",
    "Rowdy Baby",
    "High On Love",
    "Venom - Puthu Paatu",
    "Adiye",
    "Kadhal Psycho",
    "Ordinary Person",
    "Inthandham",
    "Vaathi Coming",
    "Engeyo Ketta Kural",
    "Kodiyil Oruvan",
    "Thenmozhi",
    "Jigarthanda",
    "Ranjithame",
  ],

  Malayalam: [
    "Pulimurugan Theme",
    "Theeran Theme",
    "Vettam",
    "Kannur Squad",
    "Njanum Njanum",
    "Kotha",
    "Uyiril Thodum",
    "Ole Ole",
    "Ra Ra Rajakumari",
    "Malare",
    "Neeyethra",
    "Etho Mazhayil",
    "Panipaali",
    "Akaleyo Nee",
    "Manikya Kuyile",
    "Koodamela Koodevachi",
    "Onakka Munthiri",
    "Thenkasi Pattanam",
    "Kannadi Penne",
    "Chemban",
  ],

  Kannada: [
    "Appu",
    "Ninna Danake",
    "Melody",
    "Gaitonde",
    "Jai Maruthi",
    "Idu Bhoomi",
    "Kanasina Loka",
    "Dange",
    "Baanadariyalli",
    "Manasa",
    "Nammooralli",
    "Neene Neene",
    "Kanasugara",
    "Yaare Koogu",
    "Chamak",
    "Sampige",
    "Belagali",
    "Kannada Naada",
    "Mouna Raagam",
    "Kannalle",
  ],

  English: [
    "Levitating",
    "Blinding Lights",
    "As It Was",
    "Heat Waves",
    "Anti-Hero",
    "Flowers",
    "Unholy",
    "Dance The Night",
    "Cruel Summer",
    "Die For You",
    "Calm Down",
    "Watermelon Sugar",
    "Stay",
    "good 4 u",
    "Perfect",
    "Shape of You",
    "Sunflower",
    "Memories",
    "Senorita",
    "Attention",
  ],

  Punjabi: [
    "Excuses",
    "Love You Too (Afreen Afreen)",
    "Lover (Diljit Dosanjh)",
    "Naina",
    "Chandigarh Mein",
    "Bajre Da Sitta",
    "Titli",
    "Tere Naal Nachna",
    "Case",
    "Kaller",
    "Na Na Na",
    "Baller",
    "White Brown Black",
    "Softly",
    "Malwa Block",
    "Kina Chir",
    "Pretty",
    "Jhaanjhar",
    "Aa",
    "Taur",
  ],
};

// Flattened list of every song across all languages (for random selection).
const TRENDING_INDIAN_SONGS = Object.values(TRENDING_SONGS_BY_LANGUAGE).flat();

const LANGUAGES = Object.keys(TRENDING_SONGS_BY_LANGUAGE);

// Mood-focused lists for motivational / energetic tracks (mixed languages).
const MOOD_SONGS = {
  motivational: [
    "Hall of Fame",
    "Eye of the Tiger",
    "Fight Song",
    "Stronger",
    "Remember the Name",
    "The Champion",
    "Rise Up",
    "Aashayein",
    "Kar Har Maidan Fateh",
    "Chak De India",
    "Lakshya",
    "Zidd Hai",
  ],
  energetic: [
    "Believer",
    "Can't Hold Us",
    "Thunder",
    "Lose Yourself",
    "On Top of the World",
    "High Hopes",
    "Don't Stop Me Now",
    "Naatu Naatu",
    "Vaathi Coming",
    "Oo Antava Oo Oo Antava",
    "Levitating",
    "Blinding Lights",
  ],
};

const MOODS = Object.keys(MOOD_SONGS);

/**
 * Picks a random trending song from a random language.
 * Returns an object with the song name (used for `audio_name`) and the
 * language it came from.
 */
/**
 * Pick a random trending song. Optional `mood` argument prefers songs
 * from `MOOD_SONGS` (e.g., 'motivational' or 'energetic'). If `mood`
 * is not provided, the function checks `process.env.PREFERRED_MOOD`.
 * Falls back to the language-based lists if mood isn't available.
 */
function pickRandomSong(mood) {
  const preferredMood = (mood || process.env.PREFERRED_MOOD || "").toLowerCase();

  if (preferredMood && MOOD_SONGS[preferredMood]) {
    const list = MOOD_SONGS[preferredMood];
    const songName = list[Math.floor(Math.random() * list.length)];
    return { songName, language: `mood:${preferredMood}` };
  }

  // No mood preference or not found — pick random language as before.
  const language = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
  const songs = TRENDING_SONGS_BY_LANGUAGE[language];
  const songName = songs[Math.floor(Math.random() * songs.length)];
  return { songName, language };
}

/**
 * Picks a random trending song from a specific language.
 * Returns an object with the song name (used for `audio_name`) and the
 * language it came from. Falls back to a random language if the given
 * one doesn't exist or has no songs.
 */
function pickRandomSongByLanguage(language) {
  const songs = TRENDING_SONGS_BY_LANGUAGE[language];
  if (!songs || songs.length === 0) {
    return pickRandomSong();
  }
  const songName = songs[Math.floor(Math.random() * songs.length)];
  return { songName, language };
}

module.exports = {
  TRENDING_INDIAN_SONGS,
  TRENDING_SONGS_BY_LANGUAGE,
  LANGUAGES,
  pickRandomSong,
  pickRandomSongByLanguage,
};
