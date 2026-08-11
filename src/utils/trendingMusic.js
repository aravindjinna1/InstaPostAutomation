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
    "Kesariya - Arijit Singh",
    "Jhoome Jo Pathaan - Arijit Singh",
    "Kala Chashma - Amar Arshi",
    "Lut Gaye - Jubin Nautiyal",
    "Raataan Lambiyan - Jubin Nautiyal",
    "Tera Ban Jaunga - Akhil Sachdeva",
    "Dilbar - Neha Kakkar",
    "Bijli - Rupin Pahwa",
    "Sher Khul Gaye - Nikhil D'Souza",
    "Ranjha - Jasleen Royal",
    "Param Sundari - Shreya Ghoshal",
    "O Maahi - Arijit Singh",
    "Apna Bana Le - Arijit Singh",
    "Jhoom - Arijit Singh",
    "Heeriye - Ankit Tiwari",
    "Tum Kya Mile - Neha Kakkar",
    "Kho Gaye Hum Kahan - Arijit Singh",
    "Chaleya - Arijit Singh",
    "O Bedardeya - Jubin Nautiyal",
  ],

  Telugu: [
    "Oo Antava Oo Oo Antava - Anirudh Ravichander",
    "Saami Saami - Anirudh Ravichander",
    "Butta Bomma - Armaan Malik",
    "Kurchi Madathapetti - SS Thaman",
    "Naatu Naatu - Rahul Sipligunj",
    "Chuttamalle - Devi Sri Prasad",
    "Fear Song - Vishal Mishra",
    "Dhop - Yazin Nizar",
    "Le Le Le - Anirudh Ravichander",
    "Vaathi Coming - Anirudh Ravichander",
    "Oo Cheliya - Sid Sriram",
    "Pillaa Raa - Anurag Kulkarni",
    "Jwala Reddy - Devi Sri Prasad",
    "Cult of MLA - Anirudh Ravichander",
    "Uppena - Sid Sriram",
    "Ninnu Kori - Haricharan",
    "Shiva Shambho - Anirudh Ravichander",
    "Arerey Manasa - Vijay Yesudas",
    "Top Lesi Poddi - M.M. Keeravani",
    "Blockbuster - Vijay Prakash",
  ],

  Tamil: [
    "Arabic Kuthu - Anirudh Ravichander",
    "Jalabulajangu - Dhanush",
    "Kutty Story - Anirudh Ravichander",
    "Needhaana Oru Divasam - Anirudh Ravichander",
    "Vaa Vaathi - Anirudh Ravichander",
    "Manjal Veyil - Yuvan Shankar Raja",
    "Pona Porandhom - Harris Jayaraj",
    "Rowdy Baby - Dhanush",
    "High On Love - Anirudh Ravichander",
    "Venom - Puthu Paatu - Anirudh Ravichander",
    "Adiye - Sid Sriram",
    "Kadhal Psycho - Anirudh Ravichander",
    "Ordinary Person - Dhanush",
    "Inthandham - Anirudh Ravichander",
    "Vaathi Coming - Anirudh Ravichander",
    "Engeyo Ketta Kural - Anirudh Ravichander",
    "Kodiyil Oruvan - Anirudh Ravichander",
    "Thenmozhi - Anirudh Ravichander",
    "Jigarthanda - Harris Jayaraj",
    "Ranjithame - Anirudh Ravichander",
  ],

  Malayalam: [
    "Pulimurugan Theme - Gopi Sundar",
    "Theeran Theme - Ghibran",
    "Vettam - Rahul Raj",
    "Kannur Squad - Dawn Vincent",
    "Njanum Njanum - Christian J Menon",
    "Kotha - Varun Unni",
    "Uyiril Thodum - Hesham Abdul Wahab",
    "Ole Ole - M4SONIC",
    "Ra Ra Rajakumari - Vivek Sagar",
    "Malare - Vijay Yesudas",
    "Neeyethra - Shreya Ghoshal",
    "Etho Mazhayil - K. S. Harisankar",
    "Panipaali - Sooraj Santhosh",
    "Akaleyo Nee - Shaan Rahman",
    "Manikya Kuyile - Vijith Nandakumar",
    "Koodamela Koodevachi - Shaan Rahman",
    "Onakka Munthiri - Nikhil Mathew",
    "Thenkasi Pattanam - K. S. Harisankar",
    "Kannadi Penne - Gopi Sundar",
    "Chemban - Prashant Pillai",
  ],

  Kannada: [
    "Appu - Puneeth Rajkumar",
    "Ninna Danake - Vijay Prakash",
    "Melody - Sonu Nigam",
    "Gaitonde - Armaan Malik",
    "Jai Maruthi - Vijay Prakash",
    "Idu Bhoomi - Armaan Malik",
    "Kanasina Loka - Hemanth Kumar",
    "Dange - Chandan Shetty",
    "Baanadariyalli - Sanjith Hegde",
    "Manasa - Vijay Prakash",
    "Nammooralli - V. Harikrishna",
    "Neene Neene - Shreya Ghoshal",
    "Kanasugara - Javed Ali",
    "Yaare Koogu - Vijay Prakash",
    "Chamak - Vijay Prakash",
    "Sampige - Sonu Nigam",
    "Belagali - Rajesh Krishnan",
    "Kannada Naada - Hemanth Kumar",
    "Mouna Raagam - Sonu Nigam",
    "Kannalle - Vijay Prakash",
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
    "Excuses - AP Dhillon",
    "Love You Too (Afreen Afreen) - Rahat Fateh Ali Khan",
    "Lover - Diljit Dosanjh",
    "Naina - Indeep Bakshi",
    "Chandigarh Mein - Benny Dayal",
    "Bajre Da Sitta - Asees Kaur",
    "Titli - Harrdy Sandhu",
    "Tere Naal Nachna - Guru Randhawa",
    "Case - Geeta Zaildar",
    "Kaller - Tanishk Bagchi",
    "Na Na Na - Neha Kakkar",
    "Baller - Jass Manak",
    "White Brown Black - Ikka",
    "Softly - Karan Aujla",
    "Malwa Block - Jagjit Singh",
    "Kina Chir - Jass Bajwa",
    "Pretty - Amrit Maan",
    "Jhaanjhar - Mankirt Aulakh",
    "Aa - Neha Kakkar",
    "Taur - Diljit Dosanjh",
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

function normalizeSongName(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s*-\s*[^-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAudioSong(songName, language) {
  const normalized = normalizeSongName(songName);
  return {
    songName: normalized,
    audioName: normalized,
    audioAssetId: "",
    language,
  };
}

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
    return buildAudioSong(songName, `mood:${preferredMood}`);
  }

  // No mood preference or not found — pick random language as before.
  const language = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
  const songs = TRENDING_SONGS_BY_LANGUAGE[language];
  const songName = songs[Math.floor(Math.random() * songs.length)];
  return buildAudioSong(songName, language);
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
  return buildAudioSong(songName, language);
}

module.exports = {
  TRENDING_INDIAN_SONGS,
  TRENDING_SONGS_BY_LANGUAGE,
  LANGUAGES,
  pickRandomSong,
  pickRandomSongByLanguage,
};
