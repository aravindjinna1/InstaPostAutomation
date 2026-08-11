/**
 * src/utils/jobPrompts.js
 *
 * Centralized prompt templates and role/company data for generating
 * realistic, current-feeling AI job posts. Includes both IT software
 * roles and non-IT (software-adjacent) roles, real Indian MNCs
 * (service-based + product-based), INR salaries, and India locations.
//  */

// --- Fresher-friendly IT software roles ---
const IT_ROLES = [
  "Software Engineer (Fresher)",
  "Associate Software Engineer",
  "Graduate Trainee Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Associate",
  "Cloud Support Associate",
  "Data Analyst",
  "Junior Data Scientist",
  "QA Automation Engineer",
  "Mobile App Developer",
  "Python Developer",
  "Java Developer",
  "AI/ML Engineer",
  "Test Engineer",
  "Systems Engineer",
  "Application Support Engineer",
];

// --- Non-IT roles within software/tech companies ---
const NON_IT_ROLES = [
  "Product Manager",
  "Technical Product Manager",
  "Scrum Master",
  "Business Analyst",
  "Project Manager (Tech)",
  "Technical Recruiter",
  "Sales Development Representative (SaaS)",
  "Customer Success Manager",
  "UX/UI Designer",
  "Technical Writer",
  "Data Product Manager",
  "Agile Coach",
  "Account Executive (SaaS)",
  "Solutions Consultant",
  "Digital Marketing Manager (Tech)",
];

// --- Realistic tech hubs / locations (mostly India) ---
const LOCATIONS = [
  "Bengaluru, India",
  "Hyderabad, India",
  "Pune, India",
  "Mumbai, India",
  "Delhi NCR, India",
  "Chennai, India",
  "Kolkata, India",
  "Gurugram, India",
  "Noida, India",
  "Ahmedabad, India",
  "Remote (India)",
];

// --- Real Indian MNCs: service-based ---
const SERVICE_COMPANIES = [
  "Accenture",
  "TCS",
  "Infosys",
  "Wipro",
  "Capgemini",
  "Cognizant",
  "HCLTech",
  "Deloitte",
  "EY",
  "PwC",
  "KPMG",
  "Tech Mahindra",
  "LTIMindtree",
  "Genpact",
];

// --- Real Indian/product MNCs ---
const PRODUCT_COMPANIES = [
  "Google India",
  "Microsoft India",
  "Amazon India",
  "Flipkart",
  "Zomato",
  "Paytm",
  "Razorpay",
  "Swiggy",
  "CRED",
  "PhonePe",
  "Uber India",
  "Oracle India",
  "Salesforce India",
  "Adobe India",
  "Myntra",
];

// --- Company branding colors for the poster overlay ---
const COMPANY_COLORS = {
  Accenture: { primary: "#A100FF", secondary: "#5E16A4" },
  TCS: { primary: "#1E3D6E", secondary: "#7A1F3D" },
  Infosys: { primary: "#0C6BAA", secondary: "#1B3A5C" },
  Wipro: { primary: "#6A2C91", secondary: "#2B2B2B" },
  Capgemini: { primary: "#2B2B2B", secondary: "#00B0F0" },
  Cognizant: { primary: "#0A0A0A", secondary: "#4A90D9" },
  HCLTech: { primary: "#3B454A", secondary: "#E9714C" },
  Deloitte: { primary: "#86BC25", secondary: "#1B1B1B" },
  EY: { primary: "#FFE600", secondary: "#1B1B1B" },
  PwC: { primary: "#D9A400", secondary: "#1B1B1B" },
  KPMG: { primary: "#00338D", secondary: "#1B1B1B" },
  "Tech Mahindra": { primary: "#1A1A1A", secondary: "#F5A623" },
  LTIMindtree: { primary: "#00A0DF", secondary: "#1B3A5C" },
  Genpact: { primary: "#0066B2", secondary: "#1B1B1B" },
  "Google India": { primary: "#4285F4", secondary: "#EA4335" },
  "Microsoft India": { primary: "#F25022", secondary: "#1B1B1B" },
  "Amazon India": { primary: "#FF9900", secondary: "#232F3E" },
  Flipkart: { primary: "#2874F0", secondary: "#FB641B" },
  Zomato: { primary: "#E23744", secondary: "#1B1B1B" },
  Paytm: { primary: "#002E6E", secondary: "#00BAF2" },
  Razorpay: { primary: "#3395FF", secondary: "#1B1B1B" },
  Swiggy: { primary: "#FC8019", secondary: "#1B1B1B" },
  CRED: { primary: "#1B1B1B", secondary: "#F5C518" },
  PhonePe: { primary: "#5F259F", secondary: "#1B1B1B" },
  "Uber India": { primary: "#09091A", secondary: "#1B1B1B" },
  "Oracle India": { primary: "#F80000", secondary: "#1B1B1B" },
  "Salesforce India": { primary: "#00A1E0", secondary: "#1B1B1B" },
  "Adobe India": { primary: "#FA0F00", secondary: "#1B1B1B" },
  Myntra: { primary: "#FF3F6C", secondary: "#1B1B1B" },
};

/**
 * Returns a random company (service or product based).
 */
function pickCompany() {
  const all = [...SERVICE_COMPANIES, ...PRODUCT_COMPANIES];
  return all[Math.floor(Math.random() * all.length)];
}

/**
 * Returns the branding colors for a company (with fallback).
 */
function getCompanyColors(company) {
  return (
    COMPANY_COLORS[company] || {
      primary: "#2874F0",
      secondary: "#1B1B1B",
    }
  );
}

/**
 * Builds the Gemini prompt that generates a job posting.
 * Retained for the legacy AI fallback path (aiService.generateJobPost).
 */
function buildJobGenerationPrompt() {
  const company = "Indian MNC";
  const role = "Software Engineer";

  return `
Generate ONE realistic FRESHERS / ENTRY-LEVEL job posting for "${role}" at "${company}".
Return ONLY valid JSON with fields: role, company, location, experience, jobType, skills, salaryRange, description, applyLink, hashtags.
Make the applyLink look like a real careers URL.
`;
}

/**
 * Builds an engaging Instagram caption from a REAL job object (fetched from
 * an external source). The REAL Apply Link + Resource link are included
 * directly in the caption so followers can tap and apply immediately —
 * no more commenting/asking for the link.
 */
function buildRealJobCaption(job) {
  const eligibility = job.eligibility || job.experience || "Freshers friendly";
  const skills =
    Array.isArray(job.skills)
      ? job.skills.map((s) => String(s).trim()).filter(Boolean).join(", ")
      : (job.skills || "Problem solving, Communication, Fundamentals");
  const apply = job.applyLink || "";
  const resource = job.resourceLink || "";

  return [
    `🚀 NEW JOB ALERT | ${job.role || ""}`,
    ``,
    `🏢 Company: ${job.company || ""}`,
    `📍 Location: ${job.location || "N/A"}`,
    `💼 Eligibility: ${eligibility}`,
    `🕒 Type: ${job.jobType || "Full-time"}`,
    `🛠 Skills: ${skills}`,
    `💰 Salary: ${job.salaryRange || "Competitive package"}`,
    ``,
    `📌 ${job.description || ""}`,
    ``,
    // Links are stored in the database but intentionally omitted from the
    // Instagram caption to avoid exposing source/apply URLs publicly.
    `Save & apply right away ✅`,
    ``,
    `Follow for daily #JobUpdates #TechJobs #Hiring #IndiaJobs #ITJobs ${job.hashtags || ""}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Builds the FULL recruitment poster prompt for AI image generation.
 * The AI renders the entire complete poster (all text baked in) in the
 * premium "poster-preview-v232.png" style — no canvas overlay needed.
 * The real generated job details are injected so each poster reflects
 * that specific job.
 */
function buildJobImagePrompt(job) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const company = job.company || "a leading company";
  const role = job.role || "open position";
  const location = job.location || "India";
  const experience = job.experience || "Freshers (0-2 years)";
  const jobType = job.jobType || "Full-time";
  const rawSkills = job.skills || "Problem solving, Communication, Technical fundamentals, DSA, SQL";
  const skillList = Array.isArray(rawSkills)
    ? rawSkills.map((s) => String(s).trim())
    : String(rawSkills).split(",").map((s) => s.trim());
  const skills = skillList.map((s) => s.toUpperCase()).filter(Boolean).slice(0, 9).join(", ");
  const salary = job.salaryRange || "Competitive package";
  const colors = getCompanyColors(job.company);

// The prompt below is designed to instruct the AI image generator to create a high-quality, professional recruitment poster for Instagram Reels. It specifies the layout, branding

  return `Create a premium, modern, highly polished corporate recruitment poster for Instagram Reels. 9:16 vertical format, 1080x1920. It must look like it was made by a professional graphic designer for a Fortune 500 recruitment campaign. Clean white background with subtle dotted textures, rounded corners, smooth gradients, soft shadows, premium spacing. Leave safe margins (80-120px) at top and bottom. Trustworthy, modern, minimal, highly readable.

BRAND COLORS: use the company theme colors for every major UI section, not only the top header. Base the design on the company primary and secondary brand colors provided, with white and subtle accent tones for contrast. Typography: modern geometric sans-serif (Poppins/Montserrat/Manrope), headings extra bold, uppercase.

LAYOUT - sections top to bottom:
1. HERO HEADER — top-left huge "WE ARE" (dark navy) and "HIRING!" (royal blue) on the next line, extremely large and bold, ~40% width. Top-right shows the company name "${company}" (professional, dark blue), then a large heading "${company.toUpperCase()} HIRING DRIVE" (dark navy, prominent), then a rounded royal blue pill with white text: "Posted ${today}".
2. MAIN CONTENT — two columns. LEFT column: four stacked info blocks, each with a large circular royal blue icon with white icon inside, a bold heading and value, thin grey divider under each: (1) EXPERIENCE: "${experience}", (2) LOCATION: "${location}", (3) JOB TYPE: "${jobType}", (4) ROLE: "${role}". RIGHT column: a large premium modern corporate office building, blue glass architecture, blue sky, trees, in a rounded clipping mask with a curved royal blue shape wrapping around it and a soft shadow.
3. SKILLS GRID — a large rounded container themed to the company brand with a matching outline and a top-overlapping pill in the secondary brand color. Inside, 3 columns x 3 rows of nine rounded skill cards, each with a thin brand-color border, a small company-theme icon, and dark text: ${skills}.
4. COMPENSATION STRIP — a full-width rounded strip using the company primary/secondary gradient, with white text: "COMPENSATION PACKAGE" and below it in large bold white text: "${salary}".
5. BENEFITS STRIP — full width rounded strip in the secondary brand color, four equal columns separated by thin white dividers, each with a large white icon, a yellow highlight, and white heading: "WORK WITH A GLOBAL LEADER • GROW YOUR CAREER • LEARN & UPSKILL • BE PART OF SOMETHING BIG".
6. CALL-TO-ACTION BANNER — the most eye-catching element, a large full-width rounded rectangle ~200px tall, heavy drop shadow, gradient background from hot pink (left) to bright red (middle) to orange (right), gloss effect. Center stacked text very large with high contrast like a YouTube thumbnail: "COMMENT" (white, bold, black outline), "ANYTHING" (bright yellow, largest word, heavy black outline), "FOR LINK" (white, bold, black outline). Add yellow rays, spark lines, comic accents, glow, shadow.
7. FOOTER — dark royal blue strip, centered white text: "FOLLOW FOR DAILY VERIFIED JOB UPDATES • SAVE & SHARE" with a tiny yellow bullet and small dotted decorations.

STYLE: professional LinkedIn recruitment creative, modern Canva Pro template, premium Behance design, corporate HR marketing campaign, high-end infographic. No clutter, generous whitespace, strong hierarchy, minimal, readable, crisp edges, rounded corners everywhere, soft shadows, premium gradients, symmetrical, pixel-perfect alignment, ultra HD, sharp typography, vibrant colors, corporate branding aesthetic.

CRITICAL: The company name must be spelled EXACTLY "${company}", the role EXACTLY "${role}", the location EXACTLY "${location}", and the skills EXACTLY as listed. Ensure ALL text is spelled correctly, no typos, no garbled letters, no watermark, no distortion, no cropped text, aspect ratio 9:16, professional recruitment poster. Brand accent inspiration: ${colors.primary} and ${colors.secondary}.`;
}

module.exports = {
  IT_ROLES,
  NON_IT_ROLES,
  LOCATIONS,
  SERVICE_COMPANIES,
  PRODUCT_COMPANIES,
  COMPANY_COLORS,
  pickCompany,
  getCompanyColors,
  buildJobGenerationPrompt,
  buildRealJobCaption,
  buildJobImagePrompt,
};

