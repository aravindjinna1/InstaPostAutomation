/**
 * Quick helper - encrypts a raw access token using your real
 * TOKEN_ENCRYPTION_KEY from .env, so you can manually paste the
 * result into MongoDB's accessToken field.
 *
 * HOW TO USE:
 * 1. Paste your RAW (unencrypted) token below.
 * 2. Run: node encrypt-token.js
 * 3. Copy the printed encrypted string into MongoDB's accessToken field.
 * 4. Delete this file after use.
 */

require("dotenv").config();
const { encrypt } = require("../src/utils/encryption");

const RAW_TOKEN = "IGAAOkrikQKw1BZAFlGX1lTdjh3cEk5czBFNVpkUzhmUmdDWnFsNjh1X3hhM0JpRzNoSFNodlpPU0p2LURJNlJfbFJYdXlHem55dFF0bk9tbXdYX3ctODY4QTN1ekFzQ3RBdTJHRkd1WU9JbWdOMnVYcnNtQkpXZAGIxbzlmWVljNAZDZD";

const encrypted = encrypt(RAW_TOKEN);

console.log("Paste this into MongoDB's accessToken field:");
console.log(encrypted);