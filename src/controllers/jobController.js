/**
 * Job controller - exposes the stored (POSTED) real job openings so they can
 * be browsed/searched by Company, Role, and Job link, plus a manual "sync"
 * endpoint that reports fresh data availability from the external sources
 * WITHOUT bulk-saving (only the actually-posted job is persisted).
 */

const Job = require("../models/Job");
const { syncJobSources } = require("../services/jobDataService");

/**
 * GET /api/jobs
 * Lists POSTED jobs (with their apply links), optionally filtered.
 * Query: ?company=Google&role=Developer&link=...
 * By default only jobs that have been turned into an IG post (isPosted:true)
 * are shown, so the DB only ever contains what was actually posted.
 */
async function listJobs(req, res) {
  const { company, role, link, all } = req.query;
  const filter = {};

  // Only show actually-posted jobs unless `all=true` is explicitly asked.
  if (all !== "true") filter.isPosted = true;

  if (company) filter.company = new RegExp(company.trim(), "i");
  if (role) filter.role = new RegExp(role.trim(), "i");
  if (link) filter.applyLink = new RegExp(link.trim(), "i");

  const jobs = await Job.find(filter)
    .sort({ createdAt: -1 })
    .select("company role location experience jobType skills salaryRange description applyLink resourceLink source isPosted postId postedDate");

  res.json({ success: true, count: jobs.length, jobs });
}

/**
 * GET /api/jobs/:id
 * Gets a single job by its Mongo _id (includes apply link + resource link).
 */
async function getJobById(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }
  res.json({ success: true, job });
}

/**
 * POST /api/jobs/sync
 * Fetches fresh candidates from ALL external sources and reports how many are
 * available per source (plus India/fresher counts) WITHOUT bulk-saving them.
 * Only the single job that actually gets posted is persisted to the DB.
 */
async function syncJobs(req, res) {
  const result = await syncJobSources();
  res.json({ success: true, ...result });
}

module.exports = {
  listJobs,
  getJobById,
  syncJobs,
};
