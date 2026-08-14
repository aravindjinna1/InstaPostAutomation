#!/usr/bin/env node
/**
 * cli/add-account.js
 *
 * Helper script to add or update an Instagram account document in MongoDB.
 * This encrypts the access token using the app's TOKEN_ENCRYPTION_KEY,
 * so the stored Account document matches the format expected by the pipeline.
 *
 * Usage:
 *   node cli/add-account.js <igUserId> <igUsername> <accessTokenOrEncryptedToken> <expiresAtISO> [createdAtISO] [updatedAtISO] [--encrypted]
 *
 * Examples:
 *   node cli/add-account.js 28068128506116286 bunty1.ai "LONG_LIVED_TOKEN" "2026-10-01T00:00:00Z"
 *   node cli/add-account.js 28068128506116286 bunty1.ai "ENCRYPTED_TOKEN" "2026-10-01T00:00:00Z" "2026-08-06T08:08:29.749Z" "2026-08-06T08:08:29.749Z" --encrypted
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Account = require('../src/models/Account');
const { encrypt } = require('../src/utils/encryption');

async function main() {
  const rawArgs = process.argv.slice(2);
  const args = [];
  const options = {
    encrypted: false,
    igUsername: '',
    createdAt: null,
    updatedAt: null,
  };

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === '--encrypted') {
      options.encrypted = true;
      continue;
    }

    if (arg === '--igUsername' || arg === '--username') {
      options.igUsername = rawArgs[++i] || '';
      continue;
    }

    if (arg === '--createdAt') {
      options.createdAt = rawArgs[++i] || null;
      continue;
    }

    if (arg === '--updatedAt') {
      options.updatedAt = rawArgs[++i] || null;
      continue;
    }

    args.push(arg);
  }

  const [igUserId, accessTokenOrEncrypted, tokenExpiresAt, usernameArg, createdAtArg, updatedAtArg] = args;
  const igUsername = options.igUsername || usernameArg || '';
  const createdAt = options.createdAt || createdAtArg;
  const updatedAt = options.updatedAt || updatedAtArg;

  if (!igUserId || !accessTokenOrEncrypted || !tokenExpiresAt) {
    console.error('Usage: node cli/add-account.js <igUserId> <accessTokenOrEncryptedToken> <expiresAtISO> [igUsername] [createdAtISO] [updatedAtISO] [--encrypted]');
    console.error('Example: node cli/add-account.js 28068128506116286 c6... 2026-10-05T08:08:29.743Z bunty1.ai --encrypted');
    process.exit(1);
  }

  await connectDB();

  const accessToken = options.encrypted ? accessTokenOrEncrypted : encrypt(accessTokenOrEncrypted);
  const expiresAtDate = new Date(tokenExpiresAt);

  if (Number.isNaN(expiresAtDate.getTime())) {
    console.error('Invalid expiresAtISO. Use a valid ISO timestamp like 2026-10-05T08:08:29.743Z.');
    process.exit(1);
  }

  const updateData = {
    igUserId,
    igUsername,
    accessToken,
    tokenExpiresAt: expiresAtDate,
    isActive: true,
  };

  if (createdAt) {
    const createdAtDate = new Date(createdAt);
    if (Number.isNaN(createdAtDate.getTime())) {
      console.error('Invalid createdAtISO. Use a valid ISO timestamp like 2026-08-06T08:08:29.749Z.');
      process.exit(1);
    }
    updateData.createdAt = createdAtDate;
  }

  if (updatedAt) {
    const updatedAtDate = new Date(updatedAt);
    if (Number.isNaN(updatedAtDate.getTime())) {
      console.error('Invalid updatedAtISO. Use a valid ISO timestamp like 2026-08-06T08:08:29.749Z.');
      process.exit(1);
    }
    updateData.updatedAt = updatedAtDate;
  }

  const account = await Account.findOneAndUpdate(
    { igUserId },
    updateData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Account added/updated successfully:', {
    igUserId: account.igUserId,
    igUsername: account.igUsername,
    tokenExpiresAt: account.tokenExpiresAt.toISOString(),
    isActive: account.isActive,
    createdAt: account.createdAt?.toISOString(),
    updatedAt: account.updatedAt?.toISOString(),
  });

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to add account:', err.message);
  console.error(err.stack);
  process.exit(1);
});











