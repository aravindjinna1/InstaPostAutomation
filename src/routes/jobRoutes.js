/**
 * Job routes - endpoints for browsing/searching stored real jobs,
 * and manually syncing fresh data from the external source.
 */

const express = require("express");
const router = express.Router();

const {
  listJobs,
  getJobById,
  syncJobs,
} = require("../controllers/jobController");
const asyncHandler = require("../utils/asyncHandler");

router.get("/", asyncHandler(listJobs));
router.get("/sync", asyncHandler(syncJobs));
router.get("/:id", asyncHandler(getJobById));

module.exports = router;
