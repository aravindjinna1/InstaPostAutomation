/**
 * Auth routes - maps endpoints to authController functions.
 * No business logic lives here.
 */

const express = require("express");
const router = express.Router();

const {
  redirectToInstagramAuth,
  handleInstagramCallback,
} = require("../controllers/authController");
const asyncHandler = require("../utils/asyncHandler");

router.get("/instagram", asyncHandler(redirectToInstagramAuth));
router.get("/instagram/callback", asyncHandler(handleInstagramCallback));

module.exports = router;