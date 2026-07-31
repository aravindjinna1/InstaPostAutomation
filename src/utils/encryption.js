/**
 * Encryption utility for sensitive values (the Instagram Page Access
 * Token) stored in MongoDB. Uses AES-256-GCM, which provides both
 * confidentiality and tamper detection (authenticated encryption).
 *
 * Requires TOKEN_ENCRYPTION_KEY in .env - a 64-character hex string
 * (32 bytes). Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended IV length for GCM

/**
 * Loads and validates the encryption key from environment variables.
 * Throws early and clearly if it's missing or the wrong length,
 * rather than failing confusingly deep inside crypto internals.
 */
function getKey() {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set in .env");
  }

  const key = Buffer.from(keyHex, "hex");

  if (key.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }

  return key;
}

/**
 * Encrypts a plain text string.
 * Returns a single string in the format: iv:authTag:ciphertext
 * (all hex-encoded) so it can be stored as one field in MongoDB.
 */
function encrypt(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a string previously produced by encrypt().
 * Throws if the data was tampered with or the key is wrong -
 * this is a feature of GCM, not a bug, so callers should expect
 * decrypt() to potentially throw and handle it accordingly.
 */
function decrypt(encryptedString) {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = encryptedString.split(":");

  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted string - expected iv:authTag:ciphertext");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedData = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  encrypt,
  decrypt,
};