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

router.post("/run-now", runNow);
router.get("/", listPosts);
router.get("/:id", getPostById);
router.delete("/:id", deletePost);

module.exports = router;