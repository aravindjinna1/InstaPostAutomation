/**
 * Diagnostic script - checks whether the Account document's stored
 * token actually decrypts correctly. Prints only safe info (length,
 * first/last few characters) - never the full token.
 *
 * HOW TO USE:
 * Run from the project root: node debug-token.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Account = require("../src/models/Account");
const { decrypt } = require("../src/utils/encryption");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const account = await Account.findOne({ isActive: true });

  if (!account) {
    console.log("No active Account found in MongoDB.");
    process.exit(0);
  }

  console.log("igUserId:", account.igUserId);
  console.log("Stored (encrypted) accessToken length:", account.accessToken.length);
  console.log("Stored (encrypted) accessToken preview:", account.accessToken.slice(0, 20) + "...");
  console.log();

  try {
    const decrypted = decrypt(account.accessToken);
    console.log("Decryption SUCCEEDED");
    console.log("Decrypted token length:", decrypted.length);
    console.log("Decrypted token starts with:", decrypted.slice(0, 8));
    console.log("Decrypted token ends with:", decrypted.slice(-8));
    console.log();
    console.log("A real Instagram token should start with 'IGAA' and be 150-250+ characters long.");
    console.log("Compare the length/prefix above against what you actually copied from the dashboard.");
  } catch (err) {
    console.log("Decryption FAILED:", err.message);
    console.log("This means the TOKEN_ENCRYPTION_KEY used to encrypt does not match the one in your current .env.");
  }

  process.exit(0);
})();