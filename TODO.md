# TODO - Real-Time Job Data with Apply Links

Goal: Fetch real-time job openings (company, role, eligibility, apply link) from an external source, store the actually-posted job in a dedicated DB collection, and expose/search them by Company, Role, and Job link.

## Completed

- [x] 0. Analyze task and existing pipeline
- [x] 1. Create `src/models/Job.js` — dedicated Job schema with indexes on company, role, applyLink; `eligibility` field
- [x] 2. Create `src/services/jobDataService.js` — India-first multi-source fetcher (Indian MNC boards, Greenhouse, Lever, Ashby, Workday, SmartRecruiters, iCIMS, Remotive, Arbeitnow); `getFreshJob()` persists ONLY the chosen job; `syncJobSources()` reports counts; plus `extractSkillsFromDescription()` reads the job description to derive REAL skills
- [x] 3. Update `src/utils/jobPrompts.js` — `buildRealJobCaption()` caption WITHOUT apply/resource link (DM "APPLY" instead); poster prompt uses real skills
- [x] 4. Create `src/controllers/jobController.js` + `src/routes/jobRoutes.js` — list/filter by company/role/link, get by id, sync endpoint
- [x] 5. Register job routes in `src/app.js`
- [x] 6. Update `src/models/Post.js` — store FULL job content: company, role, location, eligibility, jobType, skills, salaryRange, description, applyLink, resourceLink, source
- [x] 7. Update `src/graph/postPipeline.js` — `generateCaptionNode` uses `getFreshJob()`; `finalizeNode` stores ALL job details in the Post doc + marks job posted
- [x] 8. posterService already renders dynamic job.skills (real skills now flow in from extraction)

## Verification

- [x] Syntax check passed on all edited/new files (node --check)
- [x] Live test with DB: verified 31 real jobs stored with real apply links (PhonePe, Groww, Clera via Greenhouse/Arbeitnow) and a pipeline run succeeded (`server.out.log` shows `Pipeline succeeded - IG media ID: 18014288402867638`)

## Optional / Future

- [ ] Add a way to share the apply link via DM/comment reply if needed
- [ ] Add .env toggle to enable/disable specific sources
