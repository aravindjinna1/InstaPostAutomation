/**
 * Account routes - maps endpoints to accountController functions.
 * No business logic lives here.
 */

const express = require("express");
const router = express.Router();

const { getAccountStatus } = require("../controllers/accountController");

router.get("/", getAccountStatus);

module.exports = router;