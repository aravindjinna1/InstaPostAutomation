/**
 * Daily prompt rotation.
 * Picks a different caption topic + image style each day, based on
 * the day of the year, so posts don't look identical every day.
 * Add/edit themes freely - the rotation just cycles through whatever
 * is in this array.
 */

const DAILY_THEMES = [
  {
    captionTopic:
      "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: morning motivation and starting the day with intention.",
    imagePrompt:
      "A clean, minimal aesthetic photo of a sunrise over a calm landscape, soft warm natural lighting, no text.",
  },
  {
    captionTopic:
      "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: discipline and consistency in daily habits.",
    imagePrompt:
      "A minimal aesthetic flat-lay photo of a journal, coffee cup, and pen on a wooden desk, soft natural light, no text.",
  },
  {
    captionTopic:
      "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: focus and deep work.",
    imagePrompt:
      "A clean minimal photo of a quiet workspace with a laptop and plant, soft diffused lighting, no people, no text.",
  },
  {
    captionTopic:
      "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: growth mindset and learning from setbacks.",
    imagePrompt:
      "A minimal aesthetic photo of a single plant sprouting through cracked pavement, soft natural light, no text.",
  },
  {
    captionTopic:
      "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: gratitude and appreciating small wins.",
    imagePrompt:
      "A warm, minimal aesthetic photo of hands holding a small cup of tea by a window, soft golden light, no text.",
  },
  {
    captionTopic:
      "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: ambition and chasing long-term goals.",
    imagePrompt:
      "A clean minimal photo of a mountain trail leading toward a distant peak, soft natural daylight, no people, no text.",
  },
  {
    captionTopic:
      "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: rest, balance, and recharging.",
    imagePrompt:
      "A calm minimal aesthetic photo of a cozy reading nook with soft blankets and warm light, no text.",
  },
];

/**
 * Returns today's theme (captionTopic + imagePrompt).
 * Deterministic per day - uses the day of the year so the same
 * theme repeats predictably every ~7 days rather than looking random.
 */
function getDailyPrompt() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const index = dayOfYear % DAILY_THEMES.length;
  return DAILY_THEMES[index];
}

module.exports = {
  getDailyPrompt,
  DAILY_THEMES,
};