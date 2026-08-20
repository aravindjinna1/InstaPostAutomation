/**
 * Verification for the Instagram failure-fix changes. Runs without a DB or network:
 *  - caption builder stays <= 1500 and never leaks the full description/URL
 *  - job-field sanitizer splits the malformed values from the real failure log
 *  - instagramService refuses to publish an over-long caption (stage=caption)
 */
const { buildRealJobCaption, MAX_CAPTION_LENGTH } = require("../src/utils/jobPrompts");
const { cleanJobField, extractRoleFromMerged } = require("../src/services/jobDataService");

const hugeDescription =
  "Senior Assurance Analyst role. Lorem ipsum dolor sit amet, consectetur adipiscing elit, " +
  "sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam. " +
  "FAQ: When does the role start? FAQ: What is the notice period? Table of contents ... " +
  "Sources: https://ey.example/article, https://unrelated-example/jobs, etc.".repeat(20);

let failures = 0;
function check(name, cond, extra) {
  console.log(cond ? "PASS" : "FAIL", "-", name, extra || "");
  if (!cond) failures++;
}

async function main() {
  // 1) Caption built from a job holding a very long description + links
  const fakeJob = {
    company: "EY",
    role: "Analyst – Assurance",
    location: "Bangalore, India",
    experience: "0-1 years",
    eligibility: "B.Com / MBA freshers eligible",
    skills: ["SQL", "Power BI", "Alteryx"],
    salaryRange: "₹ 8-12 LPA",
    jobType: "Full-time",
    description: hugeDescription,
    applyLink: "https://apply.example.invalid/secret",
    resourceLink: "https://resource.example.invalid/secret",
    hashtags: " ".repeat(800) + "#huge ".repeat(200),
  };

  const caption = buildRealJobCaption(fakeJob);
  check("caption overall length <= 1500", typeof caption === "string" && caption.length <= 1500, `(len=${caption.length})`);
  check("caption does NOT embed the full description", typeof caption === "string" && !caption.includes(hugeDescription.slice(0, 120)));
  check("caption does NOT expose apply/resource URL", !caption.includes("example.invalid"));
  check("caption contains the company", caption.includes("EY"));
  check("caption contains the role", caption.toLowerCase().includes("analyst"));
  check("caption contains location", caption.includes("Bangalore"));
  check("exported MAX_CAPTION_LENGTH is 1500", MAX_CAPTION_LENGTH === 1500);

  // 2) Sanitizer: values exactly as in the failure log
  const company = cleanJobField("EYRole: Analyst \u2013 Assurance \u2026");
  const location = cleanJobField("Bangalore, IndiaKey Skills: SQL, Power BI, Alteryx");
  const mergedRole = extractRoleFromMerged("EYRole: Analyst \u2013 Assurance \u2026");
  check("company 'EYRole:...' cleaned to EY", company === "EY", `got='${company}'`);
  check("location 'Bangalore, IndiaKey Skills...' cleaned", location === "Bangalore, India", `got='${location}'`);
  check("merged role recovered from company string", /Analyst/i.test(mergedRole || ""), `got='${mergedRole}'`);

  // 3) instagramService refuses an over-length caption before any API call
  const { postImageToInstagram, postReelToInstagram, MAX_CAPTION_LENGTH: IG_MAX } = require("../src/services/instagramService");
  check("instagramService MAX_CAPTION_LENGTH exported 1500", IG_MAX === 1500);

  const tooLong = "x".repeat(1600);
  const imgRes = await postImageToInstagram({ igUserId: "1", accessToken: "IGAA-secret", imageUrl: "http://x", caption: tooLong });
  check(
    "postImageToInstagram rejects over-long caption (stage=caption)",
    imgRes && imgRes.success === false && imgRes.stage === "caption" && /too long/i.test(imgRes.error)
  );

  const reelRes = await postReelToInstagram({ igUserId: "1", accessToken: "IGAA-secret", videoUrl: "http://x", caption: tooLong });
  check(
    "postReelToInstagram rejects over-long caption (stage=caption)",
    reelRes && reelRes.success === false && reelRes.stage === "caption" && /too long/i.test(reelRes.error)
  );

  const short = buildRealJobCaption(fakeJob);
  const okRes = await postImageToInstagram({ igUserId: "1", accessToken: "IGAA-secret", imageUrl: "http://x", caption: short });
  check("valid short caption proceeds past the caption gate", okRes && okRes.stage !== "caption");

  console.log("\n" + (failures === 0 ? "ALL CAPTION TESTS PASSED" : failures + " FAILURES"));
  process.exit(failures === 0 ? 0 : 1);
}

main();