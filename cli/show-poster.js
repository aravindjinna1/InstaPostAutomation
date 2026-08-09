#!/usr/bin/env node
/**
 * cli/show-poster.js
 * Renders a sample poster to `cli/sample-poster.png` so you can quickly review
 * the layout locally without running the entire pipeline.
 *
 * Usage:
 *   node cli/show-poster.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { renderJobPoster } = require('../src/services/posterService');

async function main() {
  const sampleJob = {
    company: 'Meesho',
    title: 'Senior Business Development',
    tagline: 'Join our growth team',
    driveTitle: 'HIRING DRIVE',
    dateText: 'Online applications open',
    experience: '3+ years',
    location: 'Delhi, India',
    eligibility: '0-2 years • Remote & hybrid eligible • Freshers welcome',
    skills: ['Problem Solving', 'Communication', 'Teamwork', 'SQL', 'DSA'],
    salaryRange: '₹7 - 12 LPA',
  };

  console.log('[show-poster] Rendering sample poster...');
  const result = await renderJobPoster({ job: sampleJob });

  if (!result.success) {
    console.error('[show-poster] Failed to render poster:', result.error);
    process.exit(1);
  }

  const outPath = path.join(__dirname, 'sample-poster.png');
  fs.writeFileSync(outPath, result.buffer);
  console.log('[show-poster] Poster written to', outPath);
}

main().catch((err) => {
  console.error('[show-poster] Unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
