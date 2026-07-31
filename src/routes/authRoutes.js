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

router.get("/instagram", redirectToInstagramAuth);
router.get("/instagram/callback", handleInstagramCallback);

module.exports = router;