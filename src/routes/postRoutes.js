/**
 * Post routes - maps endpoints to postController functions.
 * No business logic lives here.
 */

const express = require("express");
const router = express.Router();

const {
  runNow,
  listPosts,
  getPostById,
  deletePost,
} = require("../controllers/postController");
const asyncHandler = require("../utils/asyncHandler");

router.post("/run-now", asyncHandler(runNow));
router.get("/", asyncHandler(listPosts));
router.get("/:id", asyncHandler(getPostById));
router.delete("/:id", asyncHandler(deletePost));

module.exports = router;