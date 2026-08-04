#!/usr/bin/env node
/**
 * cli/run-daily-post.js
 *
 * CLI TOOL — one function, does the whole job, exits.
 * No server, no scheduler.js changes, no controllers touched.
 *
 * Run it:
 *   node cli/run-daily-post.js
 *
 * GitHub Actions runs this exact command on a schedule.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const Account = require('../src/models/Account');
const Post = require('../src/models/Post');
const { decrypt } = require('../src/utils/encryption');
const { runDailyPostPipeline } = require('../src/graph/postPipeline');

/**
 * THE ONE FUNCTION.
 * Connects to Mongo, grabs the active account, decrypts its token,
 * runs the LangGraph pipeline (caption -> image -> upload -> publish),
 * and returns the result.
 */
async function runDailyPost() {
  await connectDB();

  const account = await Account.findOne({ isActive: true });
  if (!account) {
    throw new Error('No active Instagram account found (Account.isActive is false for all accounts).');
  }

  const post = await Post.create({
    accountId: account._id,
    status: 'processing',
  });

  const accessToken = decrypt(account.accessToken);

  const result = await runDailyPostPipeline({
    accountId: account._id,
    postId: post._id,
    igUserId: account.igUserId,
    accessToken,
  });

  return result;
}

// --- CLI entry point ---
if (require.main === module) {
  runDailyPost()
    .then(async (result) => {
      console.log('✅ Daily post complete:', result || 'done');
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Daily post failed:', err.message);
      if (err.stack) console.error(err.stack);
      try {
        await mongoose.connection.close();
      } catch (_) {}
      process.exit(1);
    });
}

module.exports = { runDailyPost };

/**
 * ---- ESM version (only if package.json has "type": "module") ----
 * import 'dotenv/config';
 * import mongoose from 'mongoose';
 * import { connectDB } from '../src/config/db.js';
 * import Account from '../src/models/Account.js';
 * import Post from '../src/models/Post.js';
 * import { decrypt } from '../src/utils/encryption.js';
 * import { runDailyPostPipeline } from '../src/graph/postPipeline.js';
 * (same function body, swap require -> import, module.exports -> export)
 */