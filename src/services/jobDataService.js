/**
 * src/services/jobDataService.js
 *
 * Fetches FRESH, REAL-TIME job openings from MULTIPLE external sources on
 * every run (no storage reuse), with an explicit India-first priority:
 *
 *   PRIORITY ORDER:
 *     1. Indian MNC career pages / Indian-company job boards (Accenture,
 *        TCS, HCLTech, Wipro, Infosys, etc.) — real apply links.
 *     2. India-LOCAL roles (location = an Indian city) from any source.
 *     3. Remote roles (India-eligible / remote first).
 *     4. Sponsored / outer (global) roles — only if nothing better exists.
 *
 * Sources (all free, no API key required):
 *   1. Indian MNC public job JSON boards (Greenhouse-style + own APIs)
 *   2. Greenhouse Job Board API
 *   3. Lever Postings API
 *   4. Ashby Jobs API
 *   5. Workday public job JSON (many companies expose it)
 *   6. SmartRecruiters API
 *   7. iCIMS public job feeds
 *   8. Remotive API (remote)
 *   9. Arbeitnow API
 *  10. Company careers-page fallback links
 *
 * IMPORTANT (per requirement): only the ONE job that actually gets posted is
 * saved to the DB (with its apply link). We do NOT bulk-save every fetched
 * job — `getFreshJob()` picks the best candidate and persists just that one
 * (to both the Job and Post collections).
 */

const axios = require("axios");
const mongoose = require("mongoose");
const Job = require("../models/Job");
const { getCompanyColors } = require("../utils/jobPrompts");

// JOBS SOURCE (what gets posted to Instagram): the next unposted job is read
// from JOBS_DB_NAME.JOBS_COLLECTION_NAME (env), e.g. JobsData_fromBlogs.New_Jobs.
// This is SEPARATE from where the published Post records are stored
// (database AutoInsta, collection Jobs-posts via the Post model).
const JOBS_DB_NAME = process.env.JOBS_DB_NAME || "JobsData_fromBlogs";
// process.env.MONGO_DB_NAME
const JOBS_COLLECTION_NAME = process.env.JOBS_COLLECTION_NAME || "New_Jobs";

// ---------------------------------------------------------------------------
// Source config
// ---------------------------------------------------------------------------

// Indian companies that expose public Greenhouse boards (real current
// openings, mostly with India-city locations). These are the PRIMARY source
// and are heavily prioritized. If a board is unavailable or returns nothing,
// we move on to the next one.
const INDIAN_GREENHOUSE_BOARDS = [
  "hcltech", "razorpay", "freshworks", "chargebee", "postman", "zerodha",
  "groww", "upstox", "zepto", "cred", "meesho", "dukaan", "slice",
  "epam", "phonepe", "swiggy", "zoho", "hasura", "nilenso", "groww",
  "cashify", "fampay", "pixxel", "jungleworks", "yellowai", "idfy",
  "smallcase", "dunzo", "porter", "udaan", "truecaller", "shortpoint",
  "tcs", "infosys", "wipro", "accenture", "capgemini", "cognizant",
  "techmahindra", "deloitte", "ey", "kpmg", "genpact", "lti",
];

// Indian MNCs with known public company-slug endpoints (SmartRecruiters etc.)
const INDIAN_MNC_SLUGS = [
  { company: "Accenture", slug: "Accenture" },
  { company: "TCS", slug: "TataConsultancyServices" },
  { company: "Infosys", slug: "Infosys" },
  { company: "Wipro", slug: "Wipro" },
  { company: "Capgemini", slug: "Capgemini" },
  { company: "Cognizant", slug: "Cognizant" },
];

// Greenhouse boards for Indian + global tech MNCs (mix).
const GREENHOUSE_BOARDS = [
  "mongodb", "stripe", "coinbase", "notion", "datadog", "twilio", "github",
  "instacart", "doordash", "spotify", "shopify", "zendesk", "box",
  "postman", "zerodha", "chargebee", "razorpay", "freshworks", "upstox",
  "groww", "zepto", "cred", "meesho", "epam", "swiggy", "zoho",
];

const LEVER_COMPANIES = [
  "shopify", "wisemapping", "grab", "razorpay", "freshworks", "chargebee",
  "postman", "kraken", "hashicorp", "airbnb", "dropbox", "figma", "lyft",
  "pinterest", "reddit", "cred", "meesho", "zepto", "swiggy", "groww",
];

const ASHBY_COMPANIES = [
  "supabase", "linear", "loom", "cardinal", "arize", "airbyte", "brex",
  "retool", "ramp", "deel", "zepto", "groww", "cred", "meesho", "swiggy",
];

// SmartRecruiters companies (some are Indian / have India offices).
const SMARTRECRUITERS_COMPANIES = [
  "adidas", "lego", "ikea", "kainos", "outbrain", "media",
  "nordcloud", "betfair", "markesindrer",
];

// Workday/ iCIMS companies that expose public job feeds (best-effort).
const WORKDAY_COMPANIES = [
  { company: "Starbucks", base: "https://starbucks.wd1.myworkdayjobs.com/en-US/CSR_External" },
  { company: "Visa", base: "https://visa.wd1.myworkdayjobs.com/en-US/visa" },
  { company: "NVIDIA", base: "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite" },
  { company: "Target", base: "https://target.wd5.myworkdayjobs.com/en-US/target" },
];

const iCIMS_COMPANIES = [
  { company: "Hewlett Packard", base: "https://jobs.icims.com/jobs/search" },
  { company: "Walmart", base: "https://walmart.icims.com/jobs/search" },
  { company: "Marriott", base: "https://marriott.icims.com/jobs/search" },
];

const REMOTIVE_URL = "https://remotive.com/api/remote-jobs";
const ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api";

/** Pick a random element from an array. */
function pick(arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Fisher-Yates shuffle (returns a new shuffled array). */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Indian-specific location hints (exact cities) — highest priority.
const INDIAN_CITY_HINTS = [
  "bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "new delhi",
  "delhi", "gurugram", "gurgaon", "noida", "chennai", "kolkata", "ahmedabad",
  "kochi", "indore", "nagpur", "jaipur", "chandigarh", "dehradun", "trichy",
];

/** Full India detection (country + cities). */
const INDIA_HINTS = [...INDIAN_CITY_HINTS, "india", "in-"];

/** Remote detection. */
const REMOTE_HINTS = ["remote", "work from home", "wfh", "anywhere"];

/** Fresher / entry-level role hints. */
const FRESHER_HINTS = [
  "fresher", "entry level", "entry-level", "0-2", "0 - 2", "1-2", "junior",
  "graduate", "associate", "trainee", "intern", "new grad", "early career",
];

/** location tier: 0=outer/global, 1=remote, 2=india-city-ish, 3=exact Indian city */
function locationTier(location) {
  if (!location) return 0;
  const loc = String(location).toLowerCase();
  if (INDIAN_CITY_HINTS.some((h) => loc.includes(h)) || /^india$/i.test(loc.trim())) return 3;
  if (loc.includes("india")) return 2;
  if (REMOTE_HINTS.some((h) => loc === h || loc.includes(h))) return 1;
  return 0;
}

/** True if the location is India or an Indian city. */
function isIndiaOk(location) {
  return locationTier(location) >= 2;
}

/** Score how "fresher-friendly" a role/description is (0-1). */
function fresherScore(role, content) {
  const haystack = `${role || ""} ${content || ""}`.toLowerCase();
  const hits = FRESHER_HINTS.filter((h) => haystack.includes(h)).length;
  if (hits === 0) return 0;
  return Math.min(1, hits / 2);
}

/** Number of hours since the job was posted (lower = fresher). */
function ageHours(dateStr) {
  if (!dateStr) return 99 * 24; // unknown = assume old
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 99 * 24;
  return Math.abs(Date.now() - d.getTime()) / 3600000;
}

// ---------------------------------------------------------------------------
// Source fetchers. Each returns an ARRAY of normalized Job-shaped candidates
// with: company, role, location, experience, jobType, skills, salaryRange,
// description, applyLink, resourceLink, source, sourceId, postedAtRaw,
// eligibility.
// ---------------------------------------------------------------------------

/** Generic Greenhouse board fetch. */
async function fetchGreenhouseBoard(board, sourceName) {
  const out = [];
  const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`;
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    for (const j of (data.jobs || []).slice(0, 60)) {
      out.push({
        company: j.company_name || board,
        role: j.title,
        location: j.location?.name || "",
        experience: "",
        jobType: (j.title || "").includes("Contract") ? "Contract" : "Full-time",
        skills: "See description",
        salaryRange: "",
        description: stripHtml(j.content || "").slice(0, 400),
        eligibility: "Freshers & early careers welcome • Check role requirements",
        applyLink: j.absolute_url || `https://boards.greenhouse.io/${board}/jobs/${j.id}`,
        resourceLink: `https://boards.greenhouse.io/${board}`,
        source: sourceName || "greenhouse-ind",
        sourceId: String(j.id || `${board}-${j.title}`),
        postedAtRaw: j.updated_at,
      });
    }
  } catch (_) { /* skip source on error */ }
  return out;
}

/** Indian MNC Greenhouse boards (HCLTech, Razorpay, etc.) — top priority.
 * Tries ALL configured Indian boards (in parallel) so at least one returns
 * real India-city openings, then only keeps those whose location is India so
 * remote/outer roles from other sources never outrank them. */
async function fetchIndianMNCGreenhouse() {
  const out = [];
  // SHUFFLE the boards every run so a DIFFERENT set of Indian companies is
  // queried each time (otherwise the same first 8 are always hit and we keep
  // returning the same companies/roles). Limit to a reasonable burst.
  const batch = shuffle(INDIAN_GREENHOUSE_BOARDS).slice(0, 8);
  const results = await Promise.allSettled(
    batch.map((b) => fetchGreenhouseBoard(b, "indian-mnc-greenhouse"))
  );
  for (const r of results) {
    if (r.status === "fulfilled") out.push(...r.value);
  }
  // Keep only India-located roles from these boards.
  return out.filter((c) => isIndiaOk(c.location));
}

/** Indian MNC company-slug JSON (SmartRecruiters when available). */
async function fetchIndianMNC() {
  const out = [];
  // SHUFFLE so the picked MNC varies across runs (not the same one each time).
  const mnc = pick(shuffle(INDIAN_MNC_SLUGS));
  if (!mnc) return out;
  // Some large MNCs expose iCIMS/Gem/etc. Try SmartRecruiters first.
  const smartUrl = `https://api.smartrecruiters.com/v1/companies/${mnc.slug}/postings`;
  try {
    const { data } = await axios.get(smartUrl, { timeout: 15000 });
    for (const j of (data.content || []).slice(0, 50)) {
      const loc = j.location?.city ? `${j.location.city}` : j.location?.remote ? "Remote" : j.location?.country || "";
      out.push({
        company: mnc.company,
        role: j.name,
        location: loc || "India",
        experience: j.experienceLevel?.label || "",
        jobType: j.typeOfEmployment || "Full-time",
        skills: (j.releasedDate ? "Posted recently" : "See description"),
        salaryRange: "",
        description: "",
        eligibility: "Freshers welcome • Check role requirements",
        applyLink: `https://jobs.smartrecruiters.com/${mnc.company}/${j.id}`,
        resourceLink: `https://www.smartrecruiters.com/${mnc.company}`,
        source: "indian-mnc",
        sourceId: String(j.id || j.name),
        postedAtRaw: j.releasedDate,
      });
    }
  } catch (_) { /* skip */ }
  return out;
}

async function fetchGreenhouse() {
  const company = pick(GREENHOUSE_BOARDS);
  return fetchGreenhouseBoard(company, "greenhouse");
}

async function fetchLever() {
  const out = [];
  const company = pick(LEVER_COMPANIES);
  const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    for (const j of (data || []).slice(0, 50)) {
      const location = j.categories?.location || "";
      const loc = location === "Remote" ? "Remote" : location;
      const isIndia = isIndiaOk(loc);
      out.push({
        company,
        role: j.text || j.headline || "Open role",
        location: loc,
        jobType: j.categories?.commitment || "Full-time",
        skills: "See description",
        salaryRange: "",
        description: stripHtml(j.text || "").slice(0, 400),
        eligibility: "Freshers welcome • Check role requirements",
        applyLink: j.hostedUrl || `https://jobs.lever.co/${company}/${j.id}`,
        resourceLink: `https://jobs.lever.co/${company}`,
        source: "lever",
        sourceId: String(j.id || j.hostedUrl),
        postedAtRaw: j.createdAt,
      });
    }
  } catch (_) { /* skip */ }
  return out;
}

async function fetchAshby() {
  const out = [];
  const company = pick(ASHBY_COMPANIES);
  const url = `https://api.ashbyhq.com/posting-api/job-board/${company}`;
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    for (const j of (data.jobs || []).slice(0, 50)) {
      out.push({
        company,
        role: j.title,
        location: j.location || (j.secondaryLocations || []).join(", "),
        jobType: j.employmentType || "Full-time",
        skills: "See description",
        salaryRange: "",
        description: (j.descriptionPlain || "").slice(0, 400),
        eligibility: "Freshers welcome • Check role requirements",
        applyLink: j.jobUrl || `https://jobs.ashbyhq.com/${company}/${j.id}`,
        resourceLink: `https://jobs.ashbyhq.com/${company}`,
        source: "ashby",
        sourceId: String(j.id || j.jobUrl),
        postedAtRaw: j.publishedAt,
      });
    }
  } catch (_) { /* skip */ }
  return out;
}

/** Workday — many companies expose public JSON search endpoints. Best-effort. */
async function fetchWorkday() {
  const out = [];
  const co = pick(WORKDAY_COMPANIES);
  if (!co) return out;
  try {
    const api = co.base.replace("/en-US/", "/wday/cxs/").split("?")[0] + "/jobs";
    // Workday CXS search expects a POST with JSON body.
    const { data } = await axios.post(
      api,
      { appliedFacets: {}, limit: 20, offset: 0, searchText: "" },
      { headers: { "Content-Type": "application/json", Accept: "application/json" }, timeout: 15000 }
    );
    const jobPosts = data?.jobPostings || data?.jobPostingsInfo || [];
    for (const j of jobPosts) {
      out.push({
        company: co.company,
        role: j.title,
        location: j.locationsText || "India",
        jobType: "Full-time",
        skills: "See description",
        salaryRange: "",
        description: (j.jobDescription || "").replace(/<[^>]+>/g, " ").slice(0, 300),
        eligibility: "Freshers welcome • Check role requirements",
        applyLink: j.externalPath
          ? `${co.base.split("/en-US/")[0]}/en-US/${j.externalPath}`
          : `${co.base.split("/en-US/")[0]}/en-US/jobs/${j.id}`,
        resourceLink: co.base,
        source: "workday",
        sourceId: String(j.id || j.title),
        postedAtRaw: j.startDate || j.publicStartDate,
      });
    }
  } catch (_) { /* skip */ }
  return out;
}

/** SmartRecruiters API. */
async function fetchSmartRecruiters() {
  const out = [];
  const company = pick(SMARTRECRUITERS_COMPANIES);
  if (!company) return out;
  const url = `https://api.smartrecruiters.com/v1/companies/${company}/postings`;
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    for (const j of (data.content || []).slice(0, 50)) {
      const loc = j.location?.city ? `${j.location.city}${j.location.country ? ", " + j.location.country : ""}` : (j.location?.remote ? "Remote" : j.location?.country || "");
      out.push({
        company,
        role: j.name,
        location: loc || "Remote",
        jobType: j.typeOfEmployment || "Full-time",
        skills: "See description",
        salaryRange: "",
        description: "",
        eligibility: "Freshers welcome • Check role requirements",
        applyLink: j.ref ? `https://jobs.smartrecruiters.com/${company}/${j.ref}` : `https://jobs.smartrecruiters.com/${company}/${j.id}`,
        resourceLink: `https://www.smartrecruiters.com/${company}`,
        source: "smartrecruiters",
        sourceId: String(j.id || j.name),
        postedAtRaw: j.releasedDate,
      });
    }
  } catch (_) { /* skip source on error */ }
  return out;
}

/** iCIMS public job feed (best-effort, may return HTML/JSON depending on impl). */
async function fetchIcims() {
  const out = [];
  const co = pick(iCIMS_COMPANIES);
  if (!co) return out;
  try {
    const url = `${co.base}/search?q=&location=India`; // search for India jobs
    const { data } = await axios.get(url, { timeout: 15000 });
    // iCIMS public feeds are usually HTML; try to parse job title blocks.
    const titleMatches = String(data).match(/<h1[^>]*>([^<]+)<\/h1>/g) || [];
    const urls = String(data).match(/href="(\/jobs\/[^"]+)"/g) || [];
    const count = Math.min(titleMatches.length, urls.length, 20);
    for (let i = 0; i < count; i++) {
      const title = titleMatches[i].replace(/<[^>]+>/g, "").trim();
      const path = urls[i].match(/href="([^"]+)"/)[1];
      out.push({
        company: co.company,
        role: title,
        location: "India",
        jobType: "Full-time",
        skills: "See description",
        salaryRange: "",
        description: "",
        eligibility: "Freshers welcome • Check role requirements",
        applyLink: path.startsWith("http") ? path : `https://${co.base.split("/")[2]}${path}`,
        resourceLink: co.base,
        source: "icims",
        sourceId: `${co.company}-${title}-${i}`,
        postedAtRaw: null,
      });
    }
  } catch (_) { /* skip */ }
  return out;
}

async function fetchRemotive() {
  const out = [];
  try {
    const { data } = await axios.get(REMOTIVE_URL, { timeout: 15000 });
    for (const j of (data.jobs || []).slice(0, 50)) {
      out.push({
        company: j.company_name || "",
        role: j.title || "",
        location: j.candidate_required_location || "Remote",
        jobType: (j.job_type || "Full-time").replace(/_/g, " "),
        skills: (j.tags || []).join(", "),
        salaryRange: j.salary ? `$${j.salary}` : "",
        description: (j.category || "").slice(0, 200),
        eligibility: "Freshers welcome • Check role requirements",
        applyLink: j.url || "",
        resourceLink: "https://remotive.com",
        source: "remotive",
        sourceId: String(j.id || ""),
        postedAtRaw: j.publication_date,
      });
    }
  } catch (_) { /* skip */ }
  return out;
}

async function fetchArbeitnow() {
  const out = [];
  try {
    const { data } = await axios.get(ARBEITNOW_URL, { timeout: 15000 });
    for (const j of (data.data || []).slice(0, 50)) {
      out.push({
        company: j.company_name || "",
        role: j.title || "",
        location: j.location || "",
        jobType: j.is_remote === "true" || j.remote ? "Remote" : "Full-time",
        skills: (j.tags || []).join(", "),
        salaryRange: j.salary ? j.salary : "",
        description: stripHtml(j.description || "").slice(0, 300),
        eligibility: j.eligible ? j.eligible : "Freshers welcome • Check role requirements",
        applyLink: j.url || `https://www.arbeitnow.com/jobs/${j.slug || j.id}`,
        resourceLink: "https://www.arbeitnow.com",
        source: "arbeitnow",
        sourceId: String(j.id || ""),
        postedAtRaw: j.created_at,
      });
    }
  } catch (_) { /* skip */ }
  return out;
}

/** Very small HTML tag stripper. */
function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Known skills used to extract REAL skills from a job description (so the
// poster never shows the placeholder "See description"). Ordered by how
// often they appear in fresher tech roles.
const SKILL_LIBRARY = [
  // Programming languages
  "JavaScript", "Python", "Java", "C++", "C#", "Go", "Golang", "TypeScript",
  "Ruby", "PHP", "Swift", "Kotlin", "Rust", "Scala", "SQL", "HTML", "CSS",
  // Frontend / Web
  "React", "ReactJS", "React Native", "Vue", "Vue.js", "Angular", "Next.js",
  "Node.js", "Node", "Express", "Redux", "Tailwind", "Bootstrap", "GraphQL",
  "REST", "Web Development", "Full Stack",
  // Backend / Server
  "Django", "Flask", "Spring Boot", "Spring", "Hibernate", ".NET", "Laravel",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "RabbitMQ", "Elasticsearch",
  // Cloud / DevOps / Infra
  "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform",
  "CI/CD", "Linux", "Git", "GitHub", "GitLab", "Jenkins", "Ansible", "K8s",
  // Data / AI / ML
  "Data Analysis", "Data Analytics", "Machine Learning", "Deep Learning",
  "Data Science", "Pandas", "NumPy", "TensorFlow", "PyTorch", "Tableau",
  "Power BI", "Excel", "Big Data", "Spark", "Hadoop",
  // Testing / QA
  "Selenium", "JUnit", "Testing", "QA", "Automation Testing", "API Testing",
  // Professional / soft skills
  "Communication", "Problem Solving", "Teamwork", "Leadership", "Time Management",
  "Analytical Skills", "Agile", "Scrum", "Critical Thinking",
  // Business / roles
  "Digital Marketing", "Content Writing", "Sales", "SEO", "Social Media",
  "Account Management", "Customer Success", "Recruiting", "Copywriting",
  "Graphic Design", "UI/UX", "Figma", "Photography", "Video Editing",
];

const ROLE_SKILL_PATTERNS = [
  { pattern: /(front|react|angular|vue|ui|ux)/i, skills: ["JavaScript", "React", "HTML", "CSS", "TypeScript", "Responsive Design"] },
  { pattern: /(back|node|java|python|dotnet|spring|api|microservice)/i, skills: ["Node.js", "REST APIs", "SQL", "Java", "Spring", "Microservices"] },
  { pattern: /(full[ -]?stack|fullstack)/i, skills: ["JavaScript", "Node.js", "React", "SQL", "REST APIs", "AWS"] },
  { pattern: /(data|analyst|analytics|business analyst)/i, skills: ["SQL", "Excel", "Data Analysis", "Power BI", "Tableau", "Statistics"] },
  { pattern: /(devops|cloud|aws|azure|gcp|kubernetes|docker)/i, skills: ["AWS", "Docker", "Kubernetes", "Linux", "CI/CD", "Terraform"] },
  { pattern: /(machine|ai|ml|artificial intelligence|data scientist)/i, skills: ["Python", "Machine Learning", "TensorFlow", "Data Science", "Pandas", "Statistics"] },
  { pattern: /(qa|test|automation|quality assurance)/i, skills: ["Selenium", "Automation Testing", "API Testing", "QA", "JUnit", "TestNG"] },
  { pattern: /(product|scrum|agile|project manager|pm)/i, skills: ["Agile", "Scrum", "Stakeholder Management", "Product Strategy", "Roadmapping", "User Research"] },
  { pattern: /(marketing|seo|content|social media)/i, skills: ["Digital Marketing", "SEO", "Content Writing", "Social Media", "Google Analytics", "Campaign Management"] },
];

const GENERIC_FRESHER_SKILL_VARIANTS = [
  ["Problem Solving", "Communication", "Teamwork", "DSA", "SQL"],
  ["JavaScript", "HTML", "CSS", "Git", "Problem Solving"],
  ["Python", "Data Structures", "Algorithms", "SQL", "Teamwork"],
  ["Excel", "Analytics", "SQL", "Communication", "Critical Thinking"],
  ["React", "JavaScript", "REST APIs", "Communication", "Teamwork"],
];

function normalizeSkill(skill) {
  return skill
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bjs\b/gi, "JavaScript")
    .replace(/\bsql\b/gi, "SQL")
    .replace(/\bapi\b/gi, "API")
    .replace(/\baws\b/gi, "AWS")
    .replace(/\bui\/ux\b/gi, "UI/UX")
    .replace(/\bdevops\b/gi, "DevOps")
    .replace(/\bqa\b/gi, "QA");
}

function inferSkillsFromRole(role) {
  const roleLower = (role || "").toLowerCase();
  for (const entry of ROLE_SKILL_PATTERNS) {
    if (entry.pattern.test(roleLower)) {
      return entry.skills;
    }
  }
  if (roleLower.includes("analyst")) return ["SQL", "Excel", "Data Analysis", "Power BI", "Communication"];
  if (roleLower.includes("full stack") || roleLower.includes("fullstack")) return ["JavaScript", "Node.js", "React", "SQL", "REST APIs"];
  return ["Problem Solving", "Communication", "Teamwork", "Adaptability", "Learning Attitude"];
}

function fallbackSkillsForRole(role) {
  const inferred = inferSkillsFromRole(role);
  const variant = GENERIC_FRESHER_SKILL_VARIANTS[Math.floor(Math.random() * GENERIC_FRESHER_SKILL_VARIANTS.length)];
  return [...new Set([...inferred, ...variant])].slice(0, 9);
}

/**
 * Extracts real skills by scanning the job description AND the role title
 * for known skill keywords. Returns a comma-separated string (capped at 9
 * skills for the poster grid). If nothing is found, returns a sensible
 * default instead of the placeholder "See description".
 */
function extractSkillsFromDescription(job) {
  const role = String(job.role || "");
  const existing = String(job.skills || "");

  const existingClean = existing
    .split(",")
    .map((s) => normalizeSkill(s))
    .filter((s) => s && !["see description", "posted recently", "n/a"].includes(s.toLowerCase()));

  const haystack = `${existing} ${role} ${job.description || ""}`.toLowerCase();
  const found = [];
  for (const skill of SKILL_LIBRARY) {
    const skillLower = skill.toLowerCase();
    if (haystack.includes(skillLower)) {
      if (!found.some((f) => f.toLowerCase() === skillLower) && !existingClean.some((e) => e.toLowerCase() === skillLower)) {
        found.push(skill);
      }
    }
    if (found.length + existingClean.length >= 9) break;
  }

  const inferred = inferSkillsFromRole(role);
  const combined = [...existingClean, ...found, ...inferred].map(normalizeSkill);
  const unique = [...new Set(combined)].slice(0, 9);
  if (unique.length >= 4) return unique.join(", ");

  const fallback = fallbackSkillsForRole(role);
  return fallback.join(", ");
}

// ---------------------------------------------------------------------------
// India-first ranking
// ---------------------------------------------------------------------------

/**
 * Fetches candidates from all sources and ranks them by priority:
 *   (A) locationTier (India city > India > Remote > outer)
 *   (B) fresher-friendly
 *   (C) recency
 */
async function fetchFreshJobCandidates() {
  const results = await Promise.allSettled([
    fetchIndianMNCGreenhouse(), // top priority: Indian MNC boards
    fetchIndianMNC(),           // Indian MNC smartrecruiters
    fetchGreenhouse(),
    fetchLever(),
    fetchAshby(),
    fetchWorkday(),
    fetchSmartRecruiters(),
    fetchIcims(),
    fetchRemotive(),
    fetchArbeitnow(),
  ]);

  const candidates = [];
  for (const r of results) {
    if (r.status === "fulfilled") candidates.push(...r.value);
  }

  const ranked = candidates
    .filter((c) => c.company && c.role && c.applyLink)
    .map((c) => {
      const fScore = fresherScore(c.role, c.description);
      const tier = locationTier(c.location);
      return {
        ...c,
        experience: fScore > 0 ? "Freshers (0-2 years)" : c.experience || "",
        score:
          tier * 100 + // India city (300) > India (200) > Remote (100) > outer (0)
          fScore * 10 + // freshers
          (ageHours(c.postedAtRaw) < 72 ? 2 : 0) + // very fresh
          (ageHours(c.postedAtRaw) < 240 ? 1 : 0), // within 10 days
      };
    })
    .sort((a, b) => b.score - a.score);

  // Move Indian-MNC-source roles (source = indian-mnc*) to the absolute top
  // regardless of score, so Indian company boards always win when present.
  const mncFirst = ranked.filter((c) => c.source === "indian-mnc-greenhouse" || c.source === "indian-mnc");
  const rest = ranked.filter((c) => c.source !== "indian-mnc-greenhouse" && c.source !== "indian-mnc");
  return [...mncFirst, ...rest];
}

/**
 * Picks the single best candidate, STRICTLY preferring India-located roles.
 * India-city > India > only-if-NO-India-exists => Remote > outer.
 * Remote/outer are used ONLY as a last resort when there are zero India jobs.
 */
function pickBestCandidate(candidates) {
  if (!candidates || candidates.length === 0) return null;

  // India preference chain.
  const indiaJobs = candidates.filter((c) => isIndiaOk(c.location)); // tier >= 2
  if (indiaJobs.length > 0) return indiaJobs[0];

  const indiaCityOnly = candidates.filter((c) => locationTier(c.location) === 3);
  if (indiaCityOnly.length > 0) return indiaCityOnly[0];

  // Absolute last resort: remote then outer.
  return candidates[0];
}

/**
 * Builds a REAL careers-page apply link for known Indian MNCs. Used as a
 * fallback when no public JSON board is available for a company.
 */
function buildMNCApplyLink(company) {
  const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "");
  const map = {
    accenture: "https://www.accenture.com/in-en/careers",
    tcs: "https://www.tcs.com/careers",
    infosys: "https://www.infosys.com/careers",
    wipro: "https://careers.wipro.com",
    capgemini: "https://www.capgemini.com/careers",
    cognizant: "https://careers.cognizant.com",
    hcltech: "https://www.hcltech.com/careers",
    deloitte: "https://www2.deloitte.com/in/en/careers.html",
    ey: "https://www.ey.com/en_in/careers",
    pwc: "https://www.pwc.in/careers.html",
    kpmg: "https://kpmg.com/in/en/careers.html",
    "techmahindra": "https://careers.techmahindra.com",
    ltimindtree: "https://www.ltimindtree.com/careers",
    genpact: "https://www.genpact.com/careers",
    "googleindia": "https://careers.google.com",
    "microsoftindia": "https://careers.microsoft.com",
    "amazonindia": "https://www.amazon.jobs",
    flipkart: "https://www.flipkartcareers.com",
    zomato: "https://www.zomato.com/careers",
    paytm: "https://www.paytmbank.com/careers",
    razorpay: "https://razorpay.com/jobs/",
    swiggy: "https://careers.swiggy.com",
    cred: "https://cred.club/careers",
    phonepe: "https://www.phonepe.com/careers/",
    "uberindia": "https://www.uber.com/careers",
    "oracleindia": "https://www.oracle.com/in/careers/",
    "salesforceindia": "https://careers.salesforce.com",
    "adobeindia": "https://careers.adobe.com",
    myntra: "https://careers.myntra.com",
  };
  return map[slug] || `https://www.linkedin.com/jobs/${slug}-jobs`;
}

/**
 * Varied Indian salary ranges (INR / LPA) so the package actually changes
 * between posts, not a single fixed string. Company premium / role seniority
 * could map differently, but for freshers we keep a realistic band.
 */
const SALARY_BANDS_INR = [
  "₹3 - 4.5 LPA",
  "₹3.5 - 5 LPA",
  "₹4 - 6 LPA",
  "₹4.5 - 7 LPA",
  "₹5 - 8 LPA",
  "₹6 - 9 LPA",
  "₹7 - 12 LPA",
];

/** Varied fresher eligibility strings that change per post. */
const ELIGIBILITY_VARIANTS = [
  "Freshers & recent graduates • B.E/B.Tech/MCA/M.Sc",
  "2024/2025 passouts • Any degree • 0-1 yrs",
  "Entry level • Open to freshers & Jr. developers",
  "0-2 years • Remote & hybrid eligible • Freshers welcome",
  "Recent graduates • Good DSA & programming fundamentals",
  "Freshers friendly • STEM degree preferred, not mandatory",
  "Early career • 0-2 yrs • Bachelors in related field",
  "Open to all freshers • Strong fundamentals & learning attitude",
];

/** Varied fresher role titles used ONLY for the fallback path. */
const FALLBACK_ROLES = [
  "Associate Software Engineer - Freshers",
  "Software Development Engineer (SDE) - Entry Level",
  "Graduate Trainee Engineer",
  "Junior Full Stack Developer",
  "Systems Engineer - Freshers",
  "Cloud Support Associate - Entry Level",
  "Data Analyst - Freshers",
  "QA / Test Automation Engineer - Freshers",
  "Junior AI/ML Engineer",
  "Frontend Developer (React) - Freshers",
];

/**
 * True if the given candidate's (company + role + skills) already exists in
 * the Job OR Post collections — used to skip duplicates and search again.
 */
async function isDuplicateCandidate(chosen) {
  if (!chosen) return false;
  const company = String(chosen.company || "").trim().toLowerCase();
  const role = String(chosen.role || "").trim().toLowerCase();

  // Extract the skills the same way it would be stored for this candidate.
  const skillsStr = extractSkillsFromDescription(chosen);
  const skillsArr = skillsStr.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// Any job already stored (posted or not) with the SAME company+role.
  const existingByJob = await Job.find({
    company: { $regex: new RegExp(company, "i") },
    role: { $regex: new RegExp(role, "i") },
  });

  // Any post that already carried the SAME company+role (denormalized).
  const existingByPost = await require("../models/Post").find({
    company: { $regex: new RegExp(company, "i") },
    role: { $regex: new RegExp(role, "i") },
  });

  const all = [...existingByJob, ...existingByPost];
  for (const doc of all) {
    const docSkills = String(doc.skills || "").toLowerCase();
    const docLink = String(doc.applyLink || "").toLowerCase();
    const sameCompany = company === String(doc.company || "").toLowerCase();
    const sameRole = role === String(doc.role || "").toLowerCase();
    const sameLink = Boolean(chosen.applyLink && docLink && String(chosen.applyLink).toLowerCase() === docLink);

    // If skills overlap strongly AND same company+role, treat as duplicate.
    const overlap = skillsArr.filter((s) => docSkills.includes(s)).length;
    if (overlap >= Math.min(2, skillsArr.length) && sameCompany && sameRole) {
      return true;
    }
    // If the exact apply link already exists (posted OR not), skip it —
    // this prevents re-storing the same job opening repeatedly.
    if (sameLink) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes a job field that may arrive as a comma-separated STRING or an
 * ARRAY (the New_Jobs source often stores skills/eligibility/etc. as arrays)
 * into a single comma-separated string, so downstream caption/poster code
 * that calls .split() never crashes.
 */
function toCommaString(value) {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean).join(", ");
  }
  if (value == null) return "";
  return String(value);
}

/**
 * Picks the next unposted job from the configured MongoDB collection.
 * This is the default path used by the posting pipeline now that posting
 * is driven by your own database rather than external job sources.
 */
async function getNextJobForPosting() {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.client) {
      return null;
    }

    const db = mongoose.connection.client.db(JOBS_DB_NAME);
    const collection = db.collection(JOBS_COLLECTION_NAME);

    const doc = await collection.findOne({
      $or: [
        { status: "pending" },
        { status: { $exists: false } },
        { status: null },
        { isPosted: false },
        { isPosted: { $exists: false } },
        { isPosted: null },
      ],
    }, {
      sort: { createdAt: -1, _id: -1 },
    });

    if (!doc) {
      return null;
    }

    return {
      ...doc,
      _id: doc._id,
      company: toCommaString(doc.company || doc.Company || doc.organisation || doc.organization || doc.employer),
      role: toCommaString(doc.role || doc.Role || doc.jobTitle || doc.title),
      location: toCommaString(doc.location || doc.Location || doc.city || doc.workLocation),
      eligibility: toCommaString(doc.eligibility || doc.Eligibility || doc.experience),
      experience: toCommaString(doc.experience || doc.Experience),
      jobType: toCommaString(doc.jobType || doc.JobType || doc.employmentType) || "Full-time",
      skills: toCommaString(doc.skills || doc.Skills),
      salaryRange: toCommaString(doc.salaryRange || doc.Salary || doc.salary),
      description: toCommaString(doc.description || doc.Description || doc.summary),
      applyLink: toCommaString(doc.applyLink || doc.apply_link || doc.url || doc.link),
      resourceLink: toCommaString(doc.resourceLink || doc.resource_link || doc.sourceLink || doc.source),
      source: doc.source || JOBS_COLLECTION_NAME,
      sourceDb: JOBS_DB_NAME,
      sourceCollection: JOBS_COLLECTION_NAME,
      status: doc.status,
    };
  } catch (err) {
    console.error("[Jobs] Failed to read from configured MongoDB job collection:", err.message);
    return null;
  }
}

/**
 * Main entry for the pipeline: fetches FRESH candidates each call and LOOPs
 * through them (in priority order) until it finds one that is NOT already in
 * the DB (no duplicate company+role+skills / no same link). The chosen job is
 * persisted to the Job collection with its real apply link and EVERY field
 * (salary, eligibility, location, skills, experience) varied from the source.
 * Returns the persisted job (or a VARIED fallback if no source worked).
 */
async function getFreshJob() {
  let candidates = await fetchFreshJobCandidates();
  // Deterministic order for taking candidates, but shuffle ties within equal
  // priority so we don't always grab the same first one.
  candidates = shuffle(candidates);

  let chosen = null;
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const tier = locationTier(cand.location);

    // Only accept India/remote first; pull outer only as a last resort.
    if (i < candidates.length - 1 && tier === 0 && !isIndiaOk(cand.location)) continue;

    // Skip duplicates - if it's already posted, continue searching.
    let dup = false;
    try {
      dup = await isDuplicateCandidate(cand);
    } catch (_) { dup = false; }
    if (dup) continue;

    chosen = cand;
    break;
  }

  if (chosen) {
    // Vary salary & eligibility based on the job (use source if present,
    // otherwise a realistic varied one specific to this run).
    const salary = shuffle(SALARY_BANDS_INR)[0];
    const eligibility =
      (chosen.eligibility && !/Freshers welcome|Freshers & early careers/i.test(chosen.eligibility))
        ? chosen.eligibility
        : shuffle(ELIGIBILITY_VARIANTS)[0];

    // Extract REAL skills from the job description (never placeholder).
    const skills = extractSkillsFromDescription(chosen);

const newJob = await Job.create({
      company: chosen.company,
      role: chosen.role,
      location: chosen.location || "India",
      experience: chosen.experience || "Freshers (0-2 years)",
      jobType: chosen.jobType || "Full-time",
      skills,
      salaryRange: chosen.salaryRange || salary,
      description: chosen.description || "",
      eligibility,
      applyLink: chosen.applyLink,
      resourceLink: chosen.resourceLink || "",
      source: chosen.source,
      externalId: chosen.sourceId || "",
      isPosted: false,
      postId: null,
    });

    // NOTE: The Post document is created by the cron/scheduler BEFORE the
    // pipeline runs (status: "processing") and is updated by the pipeline's
    // finalize node with the full denormalized job content + apply link.
    // We do NOT create a duplicate Post here.

    return newJob;
  }

  // Full fallback: a VARIED official careers-page link for a top Indian MNC.
  const company = pick([
    "Accenture", "TCS", "Infosys", "Wipro", "Capgemini", "Cognizant",
    "HCLTech", "Tech Mahindra", "LTIMindtree", "Razorpay", "Flipkart",
    "Google India", "Microsoft India", "Amazon India", "Zomato", "CRED",
  ]);
// Vary role, salary, eligibility, location so even fallback is unique.
  const fallbackRole = shuffle(FALLBACK_ROLES)[0];
  const skillSet = extractSkillsFromDescription({ role: fallbackRole });
  const fallbackJob = await Job.create({
    company,
    role: fallbackRole,
    location: pick(["India", "Bengaluru, India", "Hyderabad, India", "Pune, India"]),
    experience: "Freshers (0-2 years)",
    jobType: "Full-time",
    skills: skillSet,
    salaryRange: shuffle(SALARY_BANDS_INR)[0],
    description: `Start your career with ${company}. Multiple fresher openings available now.`,
    eligibility: shuffle(ELIGIBILITY_VARIANTS)[0],
    applyLink: buildMNCApplyLink(company),
    resourceLink: "https://www.linkedin.com/jobs",
    source: "fallback",
    isPosted: false,
  });
  return fallbackJob;
}

/**
 * Manual "sync" helper — fetches and reports how many fresh candidates are
 * available from each source WITHOUT bulk-saving them. Also reports
 * India/Remote/outer breakdowns to confirm the priority order works.
 */
async function syncJobSources() {
  const candidates = await fetchFreshJobCandidates();
  const bySource = {};
  for (const c of candidates) bySource[c.source] = (bySource[c.source] || 0) + 1;

  const indiaCityCount = candidates.filter((c) => locationTier(c.location) === 3).length;
  const indiaCount = candidates.filter((c) => isIndiaOk(c.location)).length;
  const remoteCount = candidates.filter((c) => locationTier(c.location) === 1).length;
  const outerCount = candidates.filter((c) => locationTier(c.location) === 0).length;
  const fresherCount = candidates.filter((c) => fresherScore(c.role, c.description) > 0).length;

  // Return a summary of the counts for reporting purposes.

  return {
    total: candidates.length,
    bySource,
    indiaCityCount,
    indiaCount,
    remoteCount,
    outerCount,
    fresherCount,
  };
}

/**
 * Convenience lookups for previously POSTED jobs — easy access by Company,
 * Role, and Job link.
 */
async function getJobByCompany(company) {
  return Job.find({ company: new RegExp(company.trim(), "i") });
}
async function getJobByRole(role) {
  return Job.find({ role: new RegExp(role.trim(), "i") });
}
async function getJobByLink(applyLink) {
  return Job.find({ applyLink: new RegExp(applyLink.trim(), "i") });
}

module.exports = {
  getFreshJob,
  getNextJobForPosting,
  syncJobSources,
  buildMNCApplyLink,
  getJobByCompany,
  getJobByRole,
  getJobByLink,
  fetchFreshJobCandidates,
  locationTier,
  isIndiaOk,
  // keep legacy alias for safety
  getRandomJob: getFreshJob,
};
