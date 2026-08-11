//###########111111111111111111111111111111111111111111111111



// /**
//  * Poster service — renders a premium, structured, Fortune-500-style
//  * recruitment poster (1080x1920 / 9:16).
//  *
//  * FIX NOTES (why the old version overlapped):
//  * 1. drawWrapped() never actually capped line count — it accepted a
//  *    "maxLines" looking argument but never passed it into wrapText(),
//  *    so long values (e.g. "Multiple SAP & Non-SAP Technologies")
//  *    could wrap to 3+ lines and bleed into the row/section below.
//  *    Some call sites even passed the number `2` into the `textAlign`
//  *    slot by mistake, which did nothing useful.
//  * 2. Section Y-positions were hardcoded guesses (e.g. main content
//  *    started at a fixed 320 regardless of the hero box's real
//  *    bottom edge at 334), so boxes silently overlapped by a few
//  *    pixels to a few dozen pixels depending on content length.
//  * 3. The skills-grid title pill pokes up 26px above its container,
//  *    but no extra gap was reserved for that, so it could overlap
//  *    the section above it.
//  *
//  * This version uses a single running cursor (`y`) with named gap
//  * constants, and every section function takes a startY and returns
//  * the exact endY it drew to, so nothing is ever eyeballed twice.
//  */

// const { createCanvas, loadImage } = require("@napi-rs/canvas");
// const { getCompanyColors } = require("../utils/jobPrompts");

// const POSTER_WIDTH = 1080;
// const POSTER_HEIGHT = 1920;
// const PAD = 56;
// const NAVY = "#071B4A";
// const ROYAL = "#0B57D0";
// const WHITE = "#FFFFFF";
// const YELLOW = "#FFD400";
// const RED = "#FF004C";
// const PINK = "#FF0F6D";
// const ORANGE = "#FF9D00";
// const LIGHT_BLUE = "#EAF4FF";
// const DIVIDER = "#E3E8EF";
// const DARK_TEXT = "#16213E";
// const GREY_TEXT = "#5A6478";

// // Layout rhythm — one place to tune spacing for the whole poster.
// const GAP = 28; // default breathing room between major sections
// const PILL_ALLOWANCE = 34; // extra room reserved before a section whose title pill overhangs upward

// // ---------------------------------------------------------------------------
// // Helpers
// // ---------------------------------------------------------------------------
// function roundedRect(ctx, x, y, w, h, r) {
//   ctx.beginPath();
//   ctx.moveTo(x + r, y);
//   ctx.arcTo(x + w, y, x + w, y + h, r);
//   ctx.arcTo(x + w, y + h, x, y + h, r);
//   ctx.arcTo(x, y + h, x, y, r);
//   ctx.arcTo(x, y, x + w, y, r);
//   ctx.closePath();
// }

// function fillRoundedRect(ctx, x, y, w, h, r, color) {
//   ctx.fillStyle = color;
//   roundedRect(ctx, x, y, w, h, r);
//   ctx.fill();
// }

// function strokeRoundedRect(ctx, x, y, w, h, r, color, width = 2) {
//   ctx.strokeStyle = color;
//   ctx.lineWidth = width;
//   roundedRect(ctx, x, y, w, h, r);
//   ctx.stroke();
// }

// // Wraps text to fit maxWidth, hard-capped at maxLines (ellipsizes the
// // last line if content would overflow). This cap is what actually
// // prevents runaway text from overlapping the next section.
// function wrapText(ctx, value, maxWidth, maxLines = Infinity) {
//   const words = String(value || "").trim().split(/\s+/);
//   const lines = [];
//   let current = "";
//   for (const word of words) {
//     const candidate = current ? `${current} ${word}` : word;
//     if (ctx.measureText(candidate).width > maxWidth && current) {
//       lines.push(current);
//       current = word;
//       if (lines.length >= maxLines) break;
//     } else {
//       current = candidate;
//     }
//   }
//   if (lines.length < maxLines && current) lines.push(current);

//   if (lines.length <= maxLines) return lines;

//   const clipped = lines.slice(0, maxLines);
//   let last = clipped[maxLines - 1];
//   while (ctx.measureText(`${last}…`).width > maxWidth && last.length) {
//     last = last.slice(0, -1);
//   }
//   clipped[maxLines - 1] = `${last.trim()}…`;
//   return clipped;
// }

// // Draws wrapped text and returns { lines, height } so callers can
// // reserve exactly the space that was actually used.
// function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines, align = "left") {
//   const lines = wrapText(ctx, text, maxWidth, maxLines);
//   ctx.textAlign = align;
//   lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
//   return { lines: lines.length, height: lines.length * lineHeight };
// }

// // ---------------------------------------------------------------------------
// // Icons (drawn with canvas primitives so they are crisp at any size)
// // ---------------------------------------------------------------------------
// function drawIcon(ctx, kind, cx, cy, size, color) {
//   const s = size;
//   const lw = Math.max(3, Math.round(s * 0.14));
//   ctx.strokeStyle = color;
//   ctx.fillStyle = color;
//   ctx.lineWidth = lw;
//   ctx.lineCap = "round";
//   ctx.lineJoin = "round";
//   const x = cx - s / 2;
//   const y = cy - s / 2;

//   switch (kind) {
//     case "person": {
//       ctx.beginPath(); ctx.arc(cx, y + s * 0.32, s * 0.19, 0, Math.PI * 2); ctx.fill();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.14, y + s * 0.92); ctx.quadraticCurveTo(cx, y + s * 0.58, x + s * 0.86, y + s * 0.92); ctx.stroke();
//       break;
//     }
//     case "pin": {
//       ctx.beginPath(); ctx.arc(cx, y + s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
//       ctx.beginPath(); ctx.arc(cx, y + s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(cx, y + s * 0.6); ctx.lineTo(cx - s * 0.28, y + s * 0.95); ctx.lineTo(cx, y + s * 0.78); ctx.lineTo(cx + s * 0.28, y + s * 0.95); ctx.closePath(); ctx.stroke();
//       break;
//     }
//     case "calendar": {
//       ctx.strokeRect(x + s * 0.08, y + s * 0.14, s * 0.84, s * 0.72);
//       ctx.beginPath(); ctx.moveTo(x + s * 0.08, y + s * 0.36); ctx.lineTo(x + s * 0.92, y + s * 0.36); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.28, y + s * 0.06); ctx.lineTo(x + s * 0.28, y + s * 0.28); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.72, y + s * 0.06); ctx.lineTo(x + s * 0.72, y + s * 0.28); ctx.stroke();
//       break;
//     }
//     case "briefcase": {
//       ctx.strokeRect(x + s * 0.1, y + s * 0.3, s * 0.8, s * 0.6);
//       ctx.beginPath(); ctx.moveTo(x + s * 0.32, y + s * 0.3); ctx.lineTo(x + s * 0.32, y + s * 0.16); ctx.lineTo(x + s * 0.68, y + s * 0.16); ctx.lineTo(x + s * 0.68, y + s * 0.3); ctx.stroke();
//       break;
//     }
//     case "shield": {
//       ctx.beginPath(); ctx.moveTo(cx, y + s * 0.06); ctx.lineTo(x + s * 0.9, y + s * 0.28); ctx.lineTo(x + s * 0.9, y + s * 0.62); ctx.quadraticCurveTo(x + s * 0.9, y + s * 0.9, cx, y + s * 0.95); ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.9, x + s * 0.1, y + s * 0.62); ctx.lineTo(x + s * 0.1, y + s * 0.28); ctx.closePath(); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(cx - s * 0.18, cy); ctx.lineTo(cx - s * 0.05, cy + s * 0.16); ctx.lineTo(cx + s * 0.2, cy - s * 0.16); ctx.stroke();
//       break;
//     }
//     case "cart": {
//       ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.12); ctx.lineTo(x + s * 0.24, y + s * 0.12); ctx.lineTo(x + s * 0.4, y + s * 0.62); ctx.lineTo(x + s * 0.78, y + s * 0.62); ctx.lineTo(x + s * 0.9, y + s * 0.26); ctx.lineTo(x + s * 0.3, y + s * 0.26); ctx.stroke();
//       ctx.beginPath(); ctx.arc(x + s * 0.42, y + s * 0.84, s * 0.1, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.arc(x + s * 0.72, y + s * 0.84, s * 0.1, 0, Math.PI * 2); ctx.stroke();
//       break;
//     }
//     case "gear": {
//       ctx.beginPath(); ctx.arc(cx, cy, s * 0.26, 0, Math.PI * 2); ctx.stroke();
//       for (let i = 0; i < 8; i++) {
//         const a = (i / 8) * Math.PI * 2;
//         const r1 = s * 0.42;
//         const r2 = s * 0.28;
//         ctx.beginPath();
//         ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
//         ctx.lineTo(cx + Math.cos(a + 0.3) * r2, cy + Math.sin(a + 0.3) * r2);
//         ctx.lineTo(cx + Math.cos(a - 0.3) * r2, cy + Math.sin(a - 0.3) * r2);
//         ctx.fill();
//       }
//       break;
//     }
//     case "chart": {
//       ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.1, y + s * 0.1); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.9, y + s * 0.9); ctx.stroke();
//       ctx.fillRect(x + s * 0.2, y + s * 0.5, s * 0.16, s * 0.4);
//       ctx.fillRect(x + s * 0.44, y + s * 0.3, s * 0.16, s * 0.6);
//       ctx.fillRect(x + s * 0.68, y + s * 0.16, s * 0.16, s * 0.74);
//       break;
//     }
//     case "pie": {
//       ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, y + s * 0.1); ctx.arc(cx, cy, s * 0.38, -Math.PI / 2, 0.4); ctx.closePath(); ctx.fill();
//       break;
//     }
//     case "users": {
//       ctx.beginPath(); ctx.arc(cx - s * 0.2, cy - s * 0.16, s * 0.15, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.arc(cx + s * 0.2, cy - s * 0.16, s * 0.15, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.06, cy + s * 0.42); ctx.quadraticCurveTo(cx - s * 0.2, cy + s * 0.08, cx, cy + s * 0.2); ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 0.08, x + s * 0.94, cy + s * 0.42); ctx.stroke();
//       break;
//     }
//     case "desktop": {
//       ctx.strokeRect(x + s * 0.08, y + s * 0.12, s * 0.84, s * 0.6);
//       ctx.beginPath(); ctx.moveTo(cx, y + s * 0.72); ctx.lineTo(cx, y + s * 0.9); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.9); ctx.lineTo(x + s * 0.7, y + s * 0.9); ctx.stroke();
//       break;
//     }
//     case "document": {
//       ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.08); ctx.lineTo(x + s * 0.65, y + s * 0.08); ctx.lineTo(x + s * 0.85, y + s * 0.28); ctx.lineTo(x + s * 0.85, y + s * 0.92); ctx.lineTo(x + s * 0.2, y + s * 0.92); ctx.closePath(); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.36, y + s * 0.4); ctx.lineTo(x + s * 0.68, y + s * 0.4); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.36, y + s * 0.58); ctx.lineTo(x + s * 0.68, y + s * 0.58); ctx.stroke();
//       break;
//     }
//     case "cloud": {
//       ctx.beginPath();
//       ctx.arc(cx - s * 0.22, cy + s * 0.05, s * 0.18, Math.PI, Math.PI * 2);
//       ctx.arc(cx, cy - s * 0.08, s * 0.22, Math.PI, Math.PI * 2);
//       ctx.arc(cx + s * 0.22, cy + s * 0.03, s * 0.18, Math.PI, Math.PI * 2);
//       ctx.lineTo(x + s * 0.9, cy + s * 0.3);
//       ctx.lineTo(x + s * 0.1, cy + s * 0.3);
//       ctx.closePath();
//       ctx.stroke();
//       break;
//     }
//     case "growth": {
//       ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.1, y + s * 0.1); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.9, y + s * 0.9); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.16, y + s * 0.7); ctx.lineTo(x + s * 0.42, y + s * 0.42); ctx.lineTo(x + s * 0.6, y + s * 0.56); ctx.lineTo(x + s * 0.84, y + s * 0.28); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.62, y + s * 0.28); ctx.lineTo(x + s * 0.84, y + s * 0.28); ctx.lineTo(x + s * 0.84, y + s * 0.5); ctx.stroke();
//       break;
//     }
//     case "trophy": {
//       ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.1); ctx.lineTo(x + s * 0.8, y + s * 0.1); ctx.lineTo(x + s * 0.8, y + s * 0.4); ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.7, cx, y + s * 0.7); ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.7, x + s * 0.2, y + s * 0.4); ctx.closePath(); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.1); ctx.lineTo(x + s * 0.05, y + s * 0.1); ctx.lineTo(x + s * 0.05, y + s * 0.26); ctx.quadraticCurveTo(x + s * 0.05, y + s * 0.4, x + s * 0.2, y + s * 0.42); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.8, y + s * 0.1); ctx.lineTo(x + s * 0.95, y + s * 0.1); ctx.lineTo(x + s * 0.95, y + s * 0.26); ctx.quadraticCurveTo(x + s * 0.95, y + s * 0.4, x + s * 0.8, y + s * 0.42); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(cx, y + s * 0.7); ctx.lineTo(cx, y + s * 0.88); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.88); ctx.lineTo(x + s * 0.7, y + s * 0.88); ctx.stroke();
//       break;
//     }
//     case "bubble": {
//       roundedRect(ctx, x + s * 0.05, y + s * 0.05, s * 0.8, s * 0.6, s * 0.18);
//       ctx.fill();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.62); ctx.lineTo(x + s * 0.2, y + s * 0.9); ctx.lineTo(x + s * 0.5, y + s * 0.62); ctx.closePath(); ctx.fill();
//       ctx.fillStyle = WHITE;
//       ctx.beginPath(); ctx.arc(cx - s * 0.16, cy, s * 0.05, 0, Math.PI * 2); ctx.fill();
//       ctx.beginPath(); ctx.arc(cx, cy, s * 0.05, 0, Math.PI * 2); ctx.fill();
//       ctx.beginPath(); ctx.arc(cx + s * 0.16, cy, s * 0.05, 0, Math.PI * 2); ctx.fill();
//       break;
//     }
//     default: {
//       ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.stroke();
//     }
//   }
// }

// function drawCircleIcon(ctx, kind, cx, cy, size, color) {
//   ctx.save();
//   ctx.shadowColor = "rgba(11,87,208,0.35)";
//   ctx.shadowBlur = 10;
//   ctx.shadowOffsetY = 4;
//   ctx.beginPath();
//   ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
//   ctx.fillStyle = color;
//   ctx.fill();
//   ctx.shadowColor = "transparent";
//   ctx.strokeStyle = "rgba(255,255,255,0.5)";
//   ctx.lineWidth = 2;
//   ctx.stroke();
//   drawIcon(ctx, kind, cx, cy, size * 0.6, WHITE);
//   ctx.restore();
// }

// // ---------------------------------------------------------------------------
// // Background
// // ---------------------------------------------------------------------------
// function drawBackground(ctx) {
//   ctx.fillStyle = WHITE;
//   ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

//   const g = ctx.createRadialGradient(POSTER_WIDTH / 2, 400, 60, POSTER_WIDTH / 2, 400, 1000);
//   g.addColorStop(0, "rgba(11,87,208,0.06)");
//   g.addColorStop(1, "rgba(255,255,255,0)");
//   ctx.fillStyle = g;
//   ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

//   ctx.fillStyle = "rgba(11,87,208,0.18)";
//   for (let row = 0; row < 6; row++) {
//     for (let col = 0; col < 6; col++) {
//       ctx.beginPath();
//       ctx.arc(40 + col * 22, 40 + row * 22, 3, 0, Math.PI * 2);
//       ctx.fill();
//     }
//   }
//   ctx.fillStyle = "rgba(255,212,0,0.25)";
//   for (let row = 0; row < 6; row++) {
//     for (let col = 0; col < 6; col++) {
//       ctx.beginPath();
//       ctx.arc(POSTER_WIDTH - 40 - col * 22, POSTER_HEIGHT - 40 - row * 22, 3, 0, Math.PI * 2);
//       ctx.fill();
//     }
//   }

//   strokeRoundedRect(ctx, 8, 8, POSTER_WIDTH - 16, POSTER_HEIGHT - 16, 24, "rgba(11,87,208,0.35)", 3);
// }

// // ---------------------------------------------------------------------------
// // 1. Hero header — "WE ARE HIRING!" on the left, a large company
// //    name block top-right (name, tagline, drive title, date pill
// //    stacked underneath it) — returns bottom Y
// // ---------------------------------------------------------------------------
// function drawHeroHeader(ctx, job, startY) {
//   const company = String(job.company || "Your Company").replace(" India", "");
//   const role = String(job.title || job.role || "OPEN ROLE").toUpperCase();
//   const tagline = job.tagline || "";
//   const driveTitle = job.driveTitle || "HIRING DRIVE";
//   const heroHeight = 340;
//   const heroX = PAD;
//   const heroY = startY;
//   const heroW = POSTER_WIDTH - PAD * 2;
//   const colors = getCompanyColors(job.company);
//   const themePrimary = colors.primary || ROYAL;
//   const themeSecondary = colors.secondary || NAVY;
//   const rightEdge = heroX + heroW - 34;

//   const heroGrad = ctx.createLinearGradient(0, heroY, 0, heroY + heroHeight);
//   heroGrad.addColorStop(0, themePrimary);
//   heroGrad.addColorStop(0.5, themePrimary);
//   heroGrad.addColorStop(1, themeSecondary);
//   ctx.save();
//   ctx.shadowColor = "rgba(7,27,74,0.35)";
//   ctx.shadowBlur = 22;
//   ctx.shadowOffsetY = 8;
//   fillRoundedRect(ctx, heroX, heroY, heroW, heroHeight, 40, heroGrad);
//   ctx.restore();
//   strokeRoundedRect(ctx, heroX, heroY, heroW, heroHeight, 40, "rgba(255,255,255,0.18)", 2);

//   // Left: WE ARE / HIRING! with role callout and join text.
//   ctx.textAlign = "left";
//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.35)";
//   ctx.shadowBlur = 10;
//   ctx.shadowOffsetY = 4;
//   ctx.fillStyle = WHITE;
//   ctx.font = "900 74px 'Arial Black', Arial, sans-serif";
//   ctx.fillText("WE ARE", heroX + 36, heroY + 100);
//   ctx.font = "900 104px 'Arial Black', Arial, sans-serif";
//   ctx.fillStyle = YELLOW;
//   ctx.fillText("HIRING!", heroX + 36, heroY + 206);
//   ctx.restore();

//   const roleFont = "800 34px 'Arial Black', Arial, sans-serif";
//   ctx.font = roleFont;
//   const maxRoleWidth = Math.min(heroW - 260, 420);
//   const roleLines = wrapText(ctx, role, maxRoleWidth, 2);
//   const roleLineHeight = 38;
//   const roleBgPaddingX = 18;
//   const roleBgPaddingY = 14;
//   const roleBgW = Math.max(
//     Math.max(...roleLines.map((line) => ctx.measureText(line).width)) + roleBgPaddingX * 2,
//     240
//   );
//   const roleBgH = Math.max(roleLines.length * roleLineHeight + roleBgPaddingY * 2, 58);
//   const roleBgX = heroX + 30;
//   const roleBgY = heroY + 220;
//   const roleBg = ctx.createLinearGradient(roleBgX, roleBgY, roleBgX + roleBgW, roleBgY + roleBgH);
//   roleBg.addColorStop(0, "rgba(255,255,255,0.24)");
//   roleBg.addColorStop(1, "rgba(255,255,255,0.1)");
//   fillRoundedRect(ctx, roleBgX, roleBgY, roleBgW, roleBgH, 24, roleBg);
//   strokeRoundedRect(ctx, roleBgX, roleBgY, roleBgW, roleBgH, 24, "rgba(255,255,255,0.26)", 1);
//   ctx.fillStyle = WHITE;
//   ctx.textAlign = "left";
//   ctx.font = roleFont;
//   roleLines.forEach((line, index) => {
//     ctx.fillText(line, roleBgX + roleBgPaddingX, roleBgY + roleBgPaddingY + (index + 1) * roleLineHeight - 8);
//   });

//   // Position a compact "Join our team." beside the role badge when space allows.
//   const joinText = "Join our team.";
//   ctx.font = "700 16px Arial, sans-serif";
//   ctx.fillStyle = "rgba(255,255,255,0.94)";

//   const joinTextWidth = ctx.measureText(joinText).width;
//   // prefer to the right of the role badge, vertically centered with it
//   let joinX = roleBgX + roleBgW + 20;
//   let joinY = roleBgY + roleBgH / 2 + 6;

//   // if there's not enough room (collides with company block on right), fallback to right-aligned beside company
//   if (joinX + joinTextWidth > rightEdge - 110) {
//     // place it to the left of the company block, aligned to its left edge
//     joinX = Math.max(roleBgX + roleBgW + 8, rightEdge - joinTextWidth - 20);
//   }

//   ctx.fillText(joinText, joinX, joinY);

//   // subtle underline to reinforce callout (thin, semi-transparent)
//   ctx.strokeStyle = "rgba(255,255,255,0.22)";
//   ctx.lineWidth = 2;
//   ctx.beginPath();
//   ctx.moveTo(joinX, joinY + 8);
//   ctx.lineTo(joinX + joinTextWidth + 8, joinY + 8);
//   ctx.stroke();

//   // Right: big company name block aligned with WE ARE
//   ctx.textAlign = "right";
//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.28)";
//   ctx.shadowBlur = 10;
//   ctx.shadowOffsetY = 3;
//   ctx.fillStyle = WHITE;
//   ctx.font = "900 66px 'Arial Black', Arial, sans-serif";
//   const companyText = company.toUpperCase();
//   const maxCompanyWidth = 340;
//   let companyLines = [companyText];
//   if (ctx.measureText(companyText).width > maxCompanyWidth) {
//     const words = companyText.split(" ");
//     if (words.length > 1) {
//       const splitIndex = Math.ceil(words.length / 2);
//       companyLines = [words.slice(0, splitIndex).join(" "), words.slice(splitIndex).join(" ")];
//     }
//   }
//   companyLines.forEach((line, index) => {
//     ctx.fillText(line, rightEdge, heroY + 100 + index * 70);
//   });
//   ctx.restore();

//   let nextY = heroY + 100 + (companyLines.length - 1) * 70;
//   if (tagline) {
//     ctx.font = "700 20px Arial, sans-serif";
//     ctx.fillStyle = "rgba(255,255,255,0.85)";
//     ctx.fillText(tagline, rightEdge, nextY + 32);
//     nextY += 32;
//   }

//   ctx.font = "900 26px 'Arial Black', Arial, sans-serif";
//   ctx.fillStyle = YELLOW;
//   ctx.fillText(driveTitle.toUpperCase(), rightEdge, nextY + 46);
//   nextY += 46;

//   const pillText = job.dateText || job.applicationText || "Online applications open";
//   ctx.font = "700 17px Arial, sans-serif";
//   const pw = ctx.measureText(pillText).width + 76;
//   const ph = 44;
//   const px = rightEdge - pw;
//   const py = nextY + 26;
//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.25)";
//   ctx.shadowBlur = 12;
//   ctx.shadowOffsetY = 4;
//   fillRoundedRect(ctx, px, py, pw, ph, 22, WHITE);
//   ctx.restore();
//   drawIcon(ctx, "calendar", px + 26, py + ph / 2, 19, NAVY);
//   ctx.fillStyle = NAVY;
//   ctx.textAlign = "left";
//   ctx.fillText(pillText, px + 48, py + 29);

//   return heroY + heroHeight;
// }

// // ---------------------------------------------------------------------------
// // 2. Main content: left info cards + right building image — returns bottom Y
// // ---------------------------------------------------------------------------
// async function drawMainContent(ctx, job, bgImage, startY) {
//   const colors = getCompanyColors(job.company);
//   const themePrimary = colors.primary || ROYAL;
//   const themeSecondary = colors.secondary || NAVY;
//   const accent = getAccentColor(themePrimary, themeSecondary);
//   const leftW = 440;
//   const rightX = PAD + leftW + 32;
//   const rightW = POSTER_WIDTH - PAD - rightX - 6;
//   const topY = startY;

//   const rows = [
//     { icon: "star", label: "ELIGIBILITY", value: job.eligibility || "Freshers & early careers welcome • Any degree pass-outs eligible" },
//     { icon: "person", label: "EXPERIENCE", value: job.experience || "Freshers (0-2 years)" },
//     { icon: "pin", label: "LOCATION", value: job.location || "India" },
//     ...(job.driveDate ? [{ icon: "calendar", label: "DRIVE DATE", value: job.driveDate }] : []),
//     { icon: "briefcase", label: "OPEN SKILLS", value: Array.isArray(job.skills) ? job.skills.join(", ") : job.skills || "Multiple roles available" },
//   ];
//   const MIN_ROW_H = 90;
//   const VALUE_LINE_HEIGHT = 25;
//   const VALUE_MAX_LINES = 6;
//   const panelH = rows.length * 104 + 28;

//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.08)";
//   ctx.shadowBlur = 18;
//   fillRoundedRect(ctx, PAD, topY - 8, leftW + 12, panelH, 26, WHITE);
//   ctx.restore();

//   let cursorY = topY;
//   rows.forEach((row, i) => {
//     // Clean, premium white row with subtle shadow for 3D effect
//     ctx.save();
//     ctx.shadowColor = "rgba(0,0,0,0.06)";
//     ctx.shadowBlur = 12;
//     fillRoundedRect(ctx, PAD + 6, cursorY + 6, leftW - 12, 92, 18, WHITE);
//     ctx.restore();

//     // Label (small) using theme primary for subtle branding
//     ctx.fillStyle = themePrimary;
//     ctx.font = "800 16px Arial, sans-serif";
//     ctx.textAlign = "left";
//     ctx.fillText(row.label, PAD + 78, cursorY + 30);

//     // Value text (bold, dark) — wrapped and constrained
//     ctx.fillStyle = DARK_TEXT;
//     ctx.font = "900 24px 'Arial Black', Arial, sans-serif";
//     drawWrapped(ctx, row.value, PAD + 78, cursorY + 54, leftW - 96, VALUE_LINE_HEIGHT, VALUE_MAX_LINES, "left");

//     // Icon uses theme primary on a small white badge
//     drawCircleIcon(ctx, row.icon, PAD + 36, cursorY + 52, 44, themePrimary);

//     if (i < rows.length - 1) {
//       ctx.strokeStyle = "rgba(0,0,0,0.06)";
//       ctx.lineWidth = 1.5;
//       ctx.beginPath();
//       ctx.moveTo(PAD + 12, cursorY + 104);
//       ctx.lineTo(PAD + leftW - 12, cursorY + 104);
//       ctx.stroke();
//     }

//     cursorY += 104;
//   });

//   const contentH = cursorY - topY;

//   // right column: building image
//   const imgBoxY = topY;
//   const imgH = contentH;
//   ctx.save();
//   ctx.shadowColor = "rgba(7,27,74,0.25)";
//   ctx.shadowBlur = 18;
//   fillRoundedRect(ctx, rightX + 6, imgBoxY - 6, rightW, imgH, 26, colors.secondary || NAVY);
//   ctx.restore();

//   ctx.save();
//   roundedRect(ctx, rightX, imgBoxY, rightW, imgH, 22);
//   ctx.clip();
//   if (bgImage) {
//     const scale = Math.max(rightW / bgImage.width, imgH / bgImage.height);
//     const dw = bgImage.width * scale;
//     const dh = bgImage.height * scale;
//     ctx.drawImage(bgImage, rightX + (rightW - dw) / 2, imgBoxY + (imgH - dh) / 2, dw, dh);
//   } else {
//     ctx.fillStyle = LIGHT_BLUE;
//     ctx.fillRect(rightX, imgBoxY, rightW, imgH);
//     for (let i = 0; i < 4; i++) {
//       const bx = rightX + 30 + i * ((rightW - 60) / 4);
//       const bh = 120 + (i % 3) * 40;
//       fillRoundedRect(ctx, bx, imgBoxY + imgH - bh - 20, (rightW - 60) / 4 - 14, bh, 8, i % 2 ? "#7AA7E8" : ROYAL);
//     }
//   }
//   const fade = ctx.createLinearGradient(0, imgBoxY + imgH * 0.6, 0, imgBoxY + imgH);
//   fade.addColorStop(0, "rgba(0,0,0,0)");
//   fade.addColorStop(1, "rgba(7,27,74,0.35)");
//   ctx.fillStyle = fade;
//   ctx.fillRect(rightX, imgBoxY, rightW, imgH);
//   ctx.restore();

//   return topY + contentH;
// }

// function getAccentColor(primary, secondary) {
//   const palette = ["#FFB600", "#FF6A00", "#FFC107", "#F9A825", "#FF7043", "#FFB74D"];
//   if (!primary || !secondary) return palette[0];
//   if (primary === "#2874F0" || primary === "#0C6BAA" || primary === "#4285F4") return "#FFC107";
//   if (primary === "#1E3D6E" || primary === "#00338D" || primary === "#09091A") return "#FF7043";
//   if (primary === "#A100FF" || primary === "#6A2C91" || primary === "#5F259F") return "#FFB74D";
//   if (primary === "#FFE600" || primary === "#F80000" || primary === "#E23744") return "#00B8D4";
//   return palette[Math.floor(Date.now() / 1000) % palette.length];
// }

// // ---------------------------------------------------------------------------
// // 3. Skills grid (3x3) — returns bottom Y. Caller must add PILL_ALLOWANCE
// //    to the gap before this section, since the title pill overhangs upward.
// // ---------------------------------------------------------------------------
// function drawSkillsGrid(ctx, job, startY) {
//   const colors = getCompanyColors(job.company);
//   const themePrimary = colors.primary || ROYAL;
//   const themeSecondary = colors.secondary || NAVY;
//   const gridW = POSTER_WIDTH - PAD * 2;
//   const gridH = 292;
//   const gridX = PAD;
//   const gridY = startY;

//   ctx.save();
//   ctx.globalAlpha = 0.12;
//   fillRoundedRect(ctx, gridX, gridY, gridW, gridH, 24, themePrimary);
//   ctx.restore();
//   strokeRoundedRect(ctx, gridX, gridY, gridW, gridH, 24, themePrimary, 2);

//   ctx.save();
//   ctx.shadowColor = "rgba(7,27,74,0.35)";
//   ctx.shadowBlur = 10;
//   fillRoundedRect(ctx, gridX + 40, gridY - 26, gridW - 80, 52, 26, themeSecondary);
//   ctx.restore();
//   ctx.fillStyle = WHITE;
//   ctx.font = "900 24px 'Arial Black', Arial, sans-serif";
//   ctx.textAlign = "center";
//   ctx.fillText("SKILLS WE ARE LOOKING FOR", POSTER_WIDTH / 2, gridY + 6);

// // Allow dynamic skills from job.skills. The job object carries skills as a
//   // comma-separated STRING (e.g. "Java, SQL, Spring Boot, AWS") — parse it
//   // into an array. If job.skills is already an array, use it directly.
//   // Only fall back to the SAP sample list when no skills are provided.
//   const defaultSkills = [
//     { name: "SAP GRC", sub: "Security", icon: "shield" },
//     { name: "SAP WM", sub: "Warehouse", icon: "cart" },
//     { name: "SAP FICO", sub: "Finance", icon: "chart" },
//     { name: "SAP BW", sub: "Analytics", icon: "pie" },
//     { name: "SAP CPI", sub: "Integration", icon: "gear" },
//     { name: "Workday", sub: "HCM", icon: "users" },
//     { name: "SAP EWM", sub: "Logistics", icon: "briefcase" },
//     { name: "SAP SD", sub: "Sales", icon: "desktop" },
//     { name: "Salesforce", sub: "CRM", icon: "cloud" },
//   ];

//   // Normalize job.skills (string OR array) into an array of trimmed names.
//   let rawSkills = [];
//   if (Array.isArray(job.skills)) {
//     rawSkills = job.skills;
//   } else if (typeof job.skills === "string" && job.skills.trim()) {
//     rawSkills = job.skills.split(",").map((s) => s.trim()).filter(Boolean);
//   }
//   if (rawSkills.length === 0) rawSkills = defaultSkills;

//   // icons rotate through a pool so every skill card still gets an icon
//   const iconPool = ["shield", "cart", "gear", "chart", "pie", "users", "desktop", "document", "cloud"];
//   const skills = rawSkills.slice(0, 9).map((s, index) => {
//     if (typeof s === "string") return { name: s, sub: "", icon: iconPool[index % iconPool.length] };
//     return { name: s.name || s.title || "Skill", sub: s.sub || s.subtitle || "", icon: s.icon || iconPool[index % iconPool.length] };
//   });

//   const cardGap = 12;
//   const cardW = (gridW - 40 - cardGap * 2) / 3;
//   const cardH = (gridH - 56 - cardGap * 2) / 3;
//   skills.forEach((skill, i) => {
//     const col = i % 3;
//     const row = Math.floor(i / 3);
//     const x = gridX + 20 + col * (cardW + cardGap);
//     const y = gridY + 36 + row * (cardH + cardGap);
//     ctx.save();
//     ctx.globalAlpha = 0.08;
//     fillRoundedRect(ctx, x, y, cardW, cardH, 14, themePrimary);
//     ctx.restore();
//     strokeRoundedRect(ctx, x, y, cardW, cardH, 14, themeSecondary, 2);
//     drawCircleIcon(ctx, skill.icon, x + 30, y + cardH / 2, 40, themePrimary);
//     ctx.fillStyle = DARK_TEXT;
//     ctx.font = "900 21px 'Arial Black', Arial, sans-serif";
//     ctx.textAlign = "left";
//     ctx.fillText(skill.name, x + 56, y + cardH / 2 - 4);
//     ctx.fillStyle = GREY_TEXT;
//     ctx.font = "700 14px Arial, sans-serif";
//     if (skill.sub) ctx.fillText(String(skill.sub).toUpperCase(), x + 56, y + cardH / 2 + 16);
//   });

//   return gridY + gridH;
// }

// // ---------------------------------------------------------------------------
// // 4. Benefits strip (4 columns) — returns bottom Y
// // ---------------------------------------------------------------------------
// function drawBenefitsStrip(ctx, startY, job) {
//   const stripW = POSTER_WIDTH - PAD * 2;
//   const stripH = 150;
//   const stripX = PAD;
//   const stripY = startY;
//   const colors = getCompanyColors(job.company);
//   const stripColor = colors.secondary || NAVY;

//   ctx.save();
//   ctx.shadowColor = "rgba(7,27,74,0.3)";
//   ctx.shadowBlur = 16;
//   fillRoundedRect(ctx, stripX, stripY, stripW, stripH, 24, stripColor);
//   ctx.restore();

//   const defaultBenefits = [
//     { icon: "users", title: "Work with a Global Leader" },
//     { icon: "growth", title: "Grow Your Career" },
//     { icon: "gear", title: "Learn & Upskill Continuously" },
//     { icon: "trophy", title: "Be Part of Something Big" },
//   ];
//   const benefits = Array.isArray(job.benefits) && job.benefits.length ? job.benefits.slice(0,4).map(b => (typeof b === 'string' ? { icon: 'dot', title: b } : { icon: b.icon || 'dot', title: b.title || b.text || '' })) : defaultBenefits;

//   const colW = stripW / 4;
//   benefits.forEach((b, i) => {
//     const x = stripX + i * colW;
//     const cx = x + colW / 2;
//     drawIcon(ctx, b.icon, cx, stripY + 42, 36, WHITE);
//     ctx.fillStyle = YELLOW;
//     ctx.font = "900 18px 'Arial Black', Arial, sans-serif";
//     // Capped at 3 lines and sized to the real column width (minus
//     // inner padding) instead of a fixed 80px guess.
//     drawWrapped(ctx, b.title, cx, stripY + 88, colW - 26, 22, 3, "center");
//     if (i < 3) {
//       ctx.strokeStyle = "rgba(255,255,255,0.35)";
//       ctx.lineWidth = 2;
//       ctx.beginPath();
//       ctx.moveTo(x + colW, stripY + 20);
//       ctx.lineTo(x + colW, stripY + stripH - 20);
//       ctx.stroke();
//     }
//   });

//   return stripY + stripH;
// }

// // ---------------------------------------------------------------------------
// // 5. Compensation panel — returns bottom Y
// // ---------------------------------------------------------------------------
// function drawCompensation(ctx, startY, job) {
//   const w = POSTER_WIDTH - PAD * 2;
//   const h = 130;
//   const x = PAD;
//   const y = startY;
//   const colors = getCompanyColors(job.company);
//   const themePrimary = colors.primary || ROYAL;
//   const themeSecondary = colors.secondary || NAVY;

//   const g = ctx.createLinearGradient(x, y, x + w, y + h);
//   g.addColorStop(0, themePrimary);
//   g.addColorStop(1, themeSecondary);
//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.25)";
//   ctx.shadowBlur = 18;
//   fillRoundedRect(ctx, x, y, w, h, 18, g);
//   ctx.restore();

//   ctx.fillStyle = WHITE;
//   ctx.textAlign = "center";
//   ctx.font = "900 32px 'Arial Black', Arial, sans-serif";
//   ctx.fillText("COMPENSATION PACKAGE", POSTER_WIDTH / 2, y + 42);

//   // Use job.salaryRange when present (the real field from generateJobPost).
//   const comp = job.salaryRange || job.compensation || "INR 3.5-6 LPA";
//   ctx.fillStyle = YELLOW;
//   ctx.font = "900 60px 'Arial Black', Arial, sans-serif";
//   ctx.fillText(comp, POSTER_WIDTH / 2, y + 104);

//   return y + h;
// }

// // ---------------------------------------------------------------------------
// // 6. CTA banner — clean, icon-free gradient banner — returns bottom Y
// // ---------------------------------------------------------------------------
// function drawCtaBanner(ctx, startY) {
//   const bW = POSTER_WIDTH - PAD * 2;
//   const bH = 210;
//   const bX = PAD;
//   const bY = startY;

//   ctx.save();
//   ctx.shadowColor = "rgba(255,0,76,0.45)";
//   ctx.shadowBlur = 24;
//   ctx.shadowOffsetY = 8;
//   const grad = ctx.createLinearGradient(bX, 0, bX + bW, 0);
//   grad.addColorStop(0, PINK);
//   grad.addColorStop(0.5, RED);
//   grad.addColorStop(1, ORANGE);
//   fillRoundedRect(ctx, bX, bY, bW, bH, 26, grad);
//   ctx.restore();

//   const gloss = ctx.createLinearGradient(0, bY, 0, bY + bH);
//   gloss.addColorStop(0, "rgba(255,255,255,0.22)");
//   gloss.addColorStop(0.28, "rgba(255,255,255,0)");
//   gloss.addColorStop(0.72, "rgba(0,0,0,0)");
//   gloss.addColorStop(1, "rgba(0,0,0,0.18)");
//   ctx.fillStyle = gloss;
//   ctx.fillRect(bX, bY, bW, bH);

//   ctx.textAlign = "center";
//   ctx.lineJoin = "round";
//   ctx.lineCap = "round";
//   const cx = bX + bW / 2;

//   ctx.font = "900 42px 'Arial Black', Arial, sans-serif";
//   ctx.lineWidth = 9;
//   ctx.strokeStyle = NAVY;
//   ctx.strokeText("COMMENT", cx, bY + 62);
//   ctx.fillStyle = WHITE;
//   ctx.fillText("COMMENT", cx, bY + 62);

//   ctx.font = "900 68px 'Arial Black', Arial, sans-serif";
//   ctx.lineWidth = 11;
//   ctx.strokeText("ANYTHING", cx, bY + 130);
//   ctx.fillStyle = YELLOW;
//   ctx.fillText("ANYTHING", cx, bY + 130);

//   ctx.font = "900 42px 'Arial Black', Arial, sans-serif";
//   ctx.lineWidth = 9;
//   ctx.strokeText("FOR LINK", cx, bY + 190);
//   ctx.fillStyle = WHITE;
//   ctx.fillText("FOR LINK", cx, bY + 190);

//   return bY + bH;
// }

// // ---------------------------------------------------------------------------
// // 7. Footer — fills all remaining space down to the bottom margin
// // ---------------------------------------------------------------------------
// // Footer keeps a fixed, compact height regardless of how much room is
// // left — any extra leftover space is added as breathing room *above*
// // the footer (by the caller) instead of stretching the footer itself
// // into an empty-looking bar.
// const FOOTER_HEIGHT = 130;

// function drawFooter(ctx, startY, job) {
//   const fY = startY;
//   const fH = FOOTER_HEIGHT;
//   const colors = getCompanyColors(job.company);
//   const footerColor = colors.secondary || NAVY;
//   fillRoundedRect(ctx, 8, fY, POSTER_WIDTH - 16, fH, 22, footerColor);
//   ctx.fillStyle = WHITE;
//   ctx.textAlign = "center";
//   ctx.font = "700 24px 'Arial Black', Arial, sans-serif";
//   ctx.fillText("FOLLOW FOR DAILY VERIFIED JOB UPDATES", POSTER_WIDTH / 2, fY + 46);
//   ctx.fillStyle = YELLOW;
//   ctx.font = "900 22px Arial, sans-serif";
//   ctx.fillText("•", POSTER_WIDTH / 2, fY + 76);
//   ctx.fillStyle = WHITE;
//   ctx.font = "700 24px 'Arial Black', Arial, sans-serif";
//   ctx.fillText("SAVE & SHARE", POSTER_WIDTH / 2, fY + 106);
// }

// // ---------------------------------------------------------------------------
// // Main entry point
// // ---------------------------------------------------------------------------
// async function renderJobPoster({ backgroundBuffer, job }) {
//   try {
//     const canvas = createCanvas(POSTER_WIDTH, POSTER_HEIGHT);
//     const ctx = canvas.getContext("2d");

//     let bgImage = null;
//     if (backgroundBuffer) {
//       try {
//         bgImage = await loadImage(backgroundBuffer);
//       } catch (_) {
//         bgImage = null;
//       }
//     }

//     drawBackground(ctx);

//     // Single running cursor — every section reports back exactly
//     // where it ended, so the next section's gap is always accurate.
//     // Starting cursor moved down from 14 to 110: with all section
//     // heights fixed, that shifts ~96px of the old "dead space before
//     // the footer" up to the top instead, so top and bottom margins
//     // read as balanced rather than "content glued to the top."
//     let y = 110;
//     y = drawHeroHeader(ctx, job, y);
//     y = await drawMainContent(ctx, job, bgImage, y + GAP);
//     y = drawSkillsGrid(ctx, job, y + GAP + PILL_ALLOWANCE);
//     y = drawBenefitsStrip(ctx, y + GAP, job);
//     y = drawCompensation(ctx, y + GAP, job);
//     y = drawCtaBanner(ctx, y + GAP);

//     // Any extra leftover space becomes gap *above* the footer (so the
//     // footer stays a compact bar) rather than stretching the footer
//     // itself into an empty-looking block.
// const remaining = POSTER_HEIGHT - 8 - y;
//     const footerGap = Math.max(GAP, remaining - FOOTER_HEIGHT);
//     drawFooter(ctx, y + footerGap, job);

//     return { success: true, buffer: canvas.toBuffer("image/png") };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

// module.exports = { renderJobPoster, POSTER_WIDTH, POSTER_HEIGHT, colors: { NAVY, ROYAL, WHITE, YELLOW, RED, PINK, ORANGE } };































































// #######################2222222222222222222222222222222222222
























/**
 * Poster service — renders a poster that matches the provided Accenture-style
 * reference image: white header with a slanted purple building panel,
 * "WE ARE / HIRING!" headline, black "JOIN OUR TEAM" ribbon tag, a purple
 * role bar, a two-column info section (left: eligibility/experience/
 * location/job type cards, right: "WHY JOIN THIS TEAM?" panel), a purple
 * compensation banner, a "KEY SKILLS" row, a black "APPLY TODAY!" CTA
 * banner, and a purple footer bar.
 *
 * Layout uses a single running cursor (`y`) with named gap constants; every
 * section function takes a startY and returns the exact endY it drew to.
 */

const { createCanvas, loadImage } = require("@napi-rs/canvas");
let getCompanyColors;
try {
  // Optional — falls back to the Accenture purple theme if unavailable.
  ({ getCompanyColors } = require("../utils/jobPrompts"));
} catch (_) {
  getCompanyColors = () => ({});
}

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1920;
const PAD = 40;

// Reference palette (Accenture-style violet).
const PURPLE = "#6E1FD6";
const PURPLE_DARK = "#2C0A6E";
const PURPLE_LIGHT = "#9B4DFF";
const BLACK = "#0A0A10";
const WHITE = "#FFFFFF";
const YELLOW = "#FFD400";
const GREY_TEXT = "#5B6478";
const DIVIDER = "#E7E1F7";
const CARD_BG = "#FFFFFF";

const GAP = 16; // default breathing room between major sections

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRoundedRect(ctx, x, y, w, h, r, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  roundedRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

function wrapText(ctx, value, maxWidth, maxLines = Infinity) {
  const words = String(value || "").trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length <= maxLines) return lines;

  const clipped = lines.slice(0, maxLines);
  let last = clipped[maxLines - 1];
  while (ctx.measureText(`${last}…`).width > maxWidth && last.length) {
    last = last.slice(0, -1);
  }
  clipped[maxLines - 1] = `${last.trim()}…`;
  return clipped;
}

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines, align = "left") {
  const lines = wrapText(ctx, text, maxWidth, maxLines);
  ctx.textAlign = align;
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return { lines: lines.length, height: lines.length * lineHeight };
}

function letterSpaced(ctx, text, x, y, spacing, align = "left") {
  const chars = String(text).split("");
  const widths = chars.map((c) => ctx.measureText(c).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let cursor = x;
  if (align === "center") cursor = x - total / 2;
  else if (align === "right") cursor = x - total;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, cursor, y);
    cursor += widths[i];
  });
  ctx.textAlign = prevAlign;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function drawIcon(ctx, kind, cx, cy, size, color) {
  const s = size;
  const lw = Math.max(3, Math.round(s * 0.13));
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const x = cx - s / 2;
  const y = cy - s / 2;

  switch (kind) {
    case "person": {
      ctx.beginPath(); ctx.arc(cx, y + s * 0.32, s * 0.19, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + s * 0.14, y + s * 0.92); ctx.quadraticCurveTo(cx, y + s * 0.58, x + s * 0.86, y + s * 0.92); ctx.stroke();
      break;
    }
    case "pin": {
      ctx.beginPath(); ctx.arc(cx, y + s * 0.38, s * 0.19, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, y + s * 0.38, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.16, y + s * 0.52); ctx.lineTo(cx, y + s * 0.94); ctx.lineTo(cx + s * 0.16, y + s * 0.52); ctx.stroke();
      break;
    }
    case "briefcase": {
      ctx.strokeRect(x + s * 0.1, y + s * 0.32, s * 0.8, s * 0.56);
      ctx.beginPath(); ctx.moveTo(x + s * 0.34, y + s * 0.32); ctx.lineTo(x + s * 0.34, y + s * 0.18); ctx.lineTo(x + s * 0.66, y + s * 0.18); ctx.lineTo(x + s * 0.66, y + s * 0.32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.58); ctx.lineTo(x + s * 0.9, y + s * 0.58); ctx.stroke();
      break;
    }
    case "clock": {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - s * 0.24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + s * 0.18, cy + s * 0.08); ctx.stroke();
      break;
    }
    case "growth": {
      ctx.beginPath(); ctx.moveTo(x + s * 0.08, y + s * 0.86); ctx.lineTo(x + s * 0.08, y + s * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.08, y + s * 0.86); ctx.lineTo(x + s * 0.92, y + s * 0.86); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.18, y + s * 0.66); ctx.lineTo(x + s * 0.42, y + s * 0.4); ctx.lineTo(x + s * 0.58, y + s * 0.54); ctx.lineTo(x + s * 0.84, y + s * 0.24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.62, y + s * 0.24); ctx.lineTo(x + s * 0.84, y + s * 0.24); ctx.lineTo(x + s * 0.84, y + s * 0.46); ctx.stroke();
      break;
    }
    case "gradcap": {
      ctx.beginPath(); ctx.moveTo(cx, y + s * 0.14); ctx.lineTo(x + s * 0.94, y + s * 0.4); ctx.lineTo(cx, y + s * 0.66); ctx.lineTo(x + s * 0.06, y + s * 0.4); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.28, y + s * 0.48); ctx.lineTo(x + s * 0.28, y + s * 0.68); ctx.quadraticCurveTo(cx, y + s * 0.82, x + s * 0.72, y + s * 0.68); ctx.lineTo(x + s * 0.72, y + s * 0.48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.9, y + s * 0.42); ctx.lineTo(x + s * 0.9, y + s * 0.7); ctx.stroke();
      break;
    }
    case "users": {
      ctx.beginPath(); ctx.arc(cx - s * 0.2, cy - s * 0.14, s * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + s * 0.2, cy - s * 0.14, s * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.04, cy + s * 0.44); ctx.quadraticCurveTo(cx - s * 0.2, cy + s * 0.1, cx, cy + s * 0.22); ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 0.1, x + s * 0.96, cy + s * 0.44); ctx.stroke();
      break;
    }
    case "globe": {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.18, s * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.1, cy); ctx.lineTo(x + s * 0.9, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.2, cy - s * 0.22); ctx.lineTo(x + s * 0.8, cy - s * 0.22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.2, cy + s * 0.22); ctx.lineTo(x + s * 0.8, cy + s * 0.22); ctx.stroke();
      break;
    }
    case "target": {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.26, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.5, cy - s * 0.5); ctx.lineTo(cx + s * 0.08, cy - s * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.5, cy - s * 0.5); ctx.lineTo(cx + s * 0.5, cy - s * 0.22); ctx.moveTo(cx + s * 0.5, cy - s * 0.5); ctx.lineTo(cx + s * 0.22, cy - s * 0.5); ctx.stroke();
      break;
    }
    case "bell": {
      ctx.beginPath(); ctx.moveTo(cx, y + s * 0.06); ctx.lineTo(cx, y + s * 0.16); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, y + s * 0.5, s * 0.32, Math.PI, 0); ctx.lineTo(x + s * 0.86, y + s * 0.78); ctx.lineTo(x + s * 0.14, y + s * 0.78); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, y + s * 0.88, s * 0.1, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "share": {
      ctx.beginPath(); ctx.arc(x + s * 0.2, cy, s * 0.13, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + s * 0.82, y + s * 0.22, s * 0.13, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + s * 0.82, y + s * 0.78, s * 0.13, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.3, cy - s * 0.06); ctx.lineTo(x + s * 0.72, y + s * 0.26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.3, cy + s * 0.06); ctx.lineTo(x + s * 0.72, y + s * 0.74); ctx.stroke();
      break;
    }
    case "megaphone": {
      ctx.beginPath(); ctx.moveTo(x + s * 0.06, y + s * 0.36); ctx.lineTo(x + s * 0.06, y + s * 0.6); ctx.lineTo(x + s * 0.24, y + s * 0.6); ctx.lineTo(x + s * 0.6, y + s * 0.86); ctx.lineTo(x + s * 0.6, y + s * 0.1); ctx.lineTo(x + s * 0.24, y + s * 0.36); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + s * 0.6, y + s * 0.22); ctx.quadraticCurveTo(x + s * 0.94, y + s * 0.48, x + s * 0.6, y + s * 0.74); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.18, y + s * 0.62); ctx.lineTo(x + s * 0.14, y + s * 0.88); ctx.lineTo(x + s * 0.3, y + s * 0.88); ctx.lineTo(x + s * 0.28, y + s * 0.62); ctx.fill();
      break;
    }
    case "star": {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
        const px = cx + Math.cos(angle) * s * 0.42;
        const py = cy + Math.sin(angle) * s * 0.42;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

function drawSquareIcon(ctx, kind, cx, cy, size, bgColor) {
  const r = 14;
  ctx.save();
  ctx.shadowColor = "rgba(110,31,214,0.30)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  fillRoundedRect(ctx, cx - size / 2, cy - size / 2, size, size, r, bgColor);
  ctx.restore();
  drawIcon(ctx, kind, cx, cy, size * 0.52, WHITE);
}

function drawCircleIcon(ctx, kind, cx, cy, size, bgColor) {
  ctx.save();
  ctx.shadowColor = "rgba(110,31,214,0.30)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.restore();
  drawIcon(ctx, kind, cx, cy, size * 0.52, WHITE);
}

// ---------------------------------------------------------------------------
// Theme resolution — defaults to Accenture purple to match the reference.
// ---------------------------------------------------------------------------
function resolveTheme(job) {
  let colors = {};
  try {
    colors = getCompanyColors(job.company) || {};
  } catch (_) {
    colors = {};
  }
  return {
    primary: colors.primary || PURPLE,
    dark: colors.secondary || PURPLE_DARK,
    light: colors.light || PURPLE_LIGHT,
  };
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------
function drawBackground(ctx) {
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
}

function drawDotGrid(ctx, x, y, cols, rows, spacing, radius, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.beginPath();
      ctx.arc(x + c * spacing, y + r * spacing, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Header — logo, WE ARE / HIRING!, slanted building panel, JOIN OUR TEAM
//    ribbon, role bar, eligibility line. Returns bottom Y.
// ---------------------------------------------------------------------------
async function drawHeader(ctx, job, bgImage, startY, theme) {
  const company = String(job.company || "Accenture").replace(" India", "");
  const role = String(job.title || job.role || "OPEN ROLE").toUpperCase();
  const eligibilityLine = job.eligibilityLine || "FRESHERS & EARLY-CAREER TALENT WELCOME";

  // Small reel-safe top margin so nothing sits flush against the very top
  // edge (where Instagram/Reels UI chrome usually overlaps).
  const y = startY;

  // --- WE ARE / HIRING! (pushed to the top) -------------------------------
  ctx.textAlign = "left";
  ctx.fillStyle = BLACK;
  ctx.font = "900 76px 'Arial Black', Arial, sans-serif";
  ctx.fillText("WE ARE", PAD, y + 78);

  ctx.save();
  ctx.shadowColor = "rgba(110,31,214,0.35)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = theme.primary;
  ctx.font = "900 106px 'Arial Black', Arial, sans-serif";
  ctx.fillText("HIRING!", PAD, y + 196);
  ctx.restore();

  // --- Company name (big, highlighted, right under HIRING!) --------------
  ctx.font = "900 72px 'Arial Black', Arial, sans-serif";
  const companyDisplay = company;
  const companyWidth = ctx.measureText(companyDisplay).width;
  const companyBoxY = y + 224;

  ctx.save();
  ctx.translate(PAD - 8, companyBoxY);
  ctx.rotate(-0.02);
  fillRoundedRect(ctx, 0, 0, companyWidth + 30, 58, 10, "rgba(255,212,0,0.6)");
  ctx.restore();

  ctx.fillStyle = BLACK;
  ctx.fillText(companyDisplay, PAD, companyBoxY + 46);

  ctx.fillStyle = theme.primary;
  ctx.font = "800 19px Arial, sans-serif";
  letterSpaced(ctx, "CAREERS", PAD, companyBoxY + 80, 3, "left");

  // decorative dot grid, upper area
  drawDotGrid(ctx, 470, y - 4, 8, 6, 21, 3, "rgba(110,31,214,0.35)");

  // --- JOIN OUR TEAM ribbon ----------------------------------------------
  const tagY = companyBoxY + 110;
  const tagH = 54;
  const tagText = "JOIN OUR TEAM";
  ctx.font = "800 24px Arial, sans-serif";
  const tagTextW = ctx.measureText(tagText).width;
  const tagW = tagTextW + 100;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(PAD, tagY);
  ctx.lineTo(PAD + tagW, tagY);
  ctx.lineTo(PAD + tagW - 22, tagY + tagH);
  ctx.lineTo(PAD, tagY + tagH);
  ctx.closePath();
  ctx.fillStyle = BLACK;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = theme.primary;
  ctx.font = "900 26px Arial, sans-serif";
  ctx.fillText("\u203A", PAD + 22, tagY + tagH / 2 + 10);
  ctx.fillStyle = WHITE;
  ctx.font = "800 24px Arial, sans-serif";
  ctx.fillText(tagText, PAD + 54, tagY + tagH / 2 + 8);

  // --- Slanted building panel (right side) — stretches from just below
  //     the top margin all the way down to the JOIN OUR TEAM ribbon, so
  //     there's no dead space beneath it. -----------------------------
  const rightEdge = POSTER_WIDTH - PAD;
  const panelTop = y - 12;
  const panelBottom = tagY - 16;
  const panelXTop = 590;
  const panelXBottom = 480;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(panelXTop, panelTop);
  ctx.lineTo(rightEdge, panelTop);
  ctx.lineTo(rightEdge, panelBottom);
  ctx.lineTo(panelXBottom, panelBottom);
  ctx.closePath();
  ctx.clip();

  if (bgImage) {
    const pw = rightEdge - Math.min(panelXTop, panelXBottom);
    const ph = panelBottom - panelTop;
    const px = Math.min(panelXTop, panelXBottom);
    const scale = Math.max(pw / bgImage.width, ph / bgImage.height);
    const dw = bgImage.width * scale;
    const dh = bgImage.height * scale;
    ctx.drawImage(bgImage, px + (pw - dw) / 2, panelTop + (ph - dh) / 2, dw, dh);
    const tint = ctx.createLinearGradient(0, panelTop, 0, panelBottom);
    tint.addColorStop(0, "rgba(46,10,110,0.35)");
    tint.addColorStop(1, "rgba(20,4,56,0.55)");
    ctx.fillStyle = tint;
    ctx.fillRect(panelXBottom - 40, panelTop, rightEdge - panelXBottom + 40, panelBottom - panelTop);
  } else {
    const g = ctx.createLinearGradient(panelXTop, panelTop, rightEdge, panelBottom);
    g.addColorStop(0, theme.light);
    g.addColorStop(1, theme.dark);
    ctx.fillStyle = g;
    ctx.fillRect(panelXBottom - 40, panelTop, rightEdge - panelXBottom + 40, panelBottom - panelTop);

    // simple building silhouette
    const buildX = panelXTop + 30;
    const buildW = rightEdge - buildX - 20;
    const buildTop = panelTop + 140;
    const buildBottom = panelBottom - 10;
    ctx.fillStyle = "rgba(10,4,30,0.55)";
    fillRoundedRect(ctx, buildX, buildTop, buildW, buildBottom - buildTop, 4);
    // lit windows grid
    const winCols = 5;
    const winRows = Math.max(6, Math.round((buildBottom - buildTop) / 46));
    const winPadX = 14;
    const winPadY = 16;
    const cellW = (buildW - winPadX * 2) / winCols;
    const cellH = (buildBottom - buildTop - winPadY * 2) / winRows;
    for (let r = 0; r < winRows; r++) {
      for (let c = 0; c < winCols; c++) {
        const lit = (r + c) % 3 !== 0;
        ctx.fillStyle = lit ? "rgba(255,212,0,0.55)" : "rgba(255,255,255,0.08)";
        ctx.fillRect(
          buildX + winPadX + c * cellW + 3,
          buildTop + winPadY + r * cellH + 3,
          cellW - 6,
          cellH - 6
        );
      }
    }
    // small logo plate on the building
    ctx.fillStyle = "rgba(10,4,30,0.75)";
    fillRoundedRect(ctx, buildX + buildW * 0.5 - 60, buildTop - 34, 120, 28, 6);
    ctx.fillStyle = WHITE;
    ctx.font = "700 15px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(company.toLowerCase(), buildX + buildW * 0.5, buildTop - 15);
    ctx.textAlign = "left";
  }

  // decorative dot grids over the panel (top + bottom corners)
  drawDotGrid(ctx, panelXTop + 40, panelTop + 10, 8, 5, 22, 3, "rgba(255,255,255,0.5)");
  drawDotGrid(ctx, rightEdge - 190, panelBottom - 70, 8, 4, 22, 3, "rgba(255,255,255,0.35)");
  ctx.restore();

  ctx.textAlign = "left";

  // --- Role bar ------------------------------------------------------------
  const barY = tagY + tagH + 12;
  const barH = 72;
  const barW = rightEdge - PAD;
  const barGrad = ctx.createLinearGradient(PAD, barY, PAD + barW, barY);
  barGrad.addColorStop(0, theme.primary);
  barGrad.addColorStop(1, theme.dark);
  ctx.save();
  ctx.shadowColor = "rgba(46,10,110,0.35)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  fillRoundedRect(ctx, PAD, barY, barW, barH, 16, barGrad);
  ctx.restore();
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.font = "900 40px 'Arial Black', Arial, sans-serif";
  const roleLines = wrapText(ctx, role, barW - 60, 1);
  ctx.fillText(roleLines[0], POSTER_WIDTH / 2, barY + barH / 2 + 14);

  // --- Eligibility subtitle -------------------------------------------------
  const subY = barY + barH + 32;
  ctx.font = "700 18px Arial, sans-serif";
  ctx.fillStyle = GREY_TEXT;
  const subText = eligibilityLine.toUpperCase();
  const subW = ctx.measureText(subText).width;
  ctx.fillText(subText, POSTER_WIDTH / 2, subY);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(POSTER_WIDTH / 2 - subW / 2 - 40, subY - 6);
  ctx.lineTo(POSTER_WIDTH / 2 - subW / 2 - 12, subY - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(POSTER_WIDTH / 2 + subW / 2 + 12, subY - 6);
  ctx.lineTo(POSTER_WIDTH / 2 + subW / 2 + 40, subY - 6);
  ctx.stroke();
  ctx.textAlign = "left";

  return subY + 20;
}

// ---------------------------------------------------------------------------
// 2. Two-column info section — left info cards, right "why join" panel.
//    Returns bottom Y.
// ---------------------------------------------------------------------------
function drawTwoColumnSection(ctx, job, startY, theme) {
  const totalW = POSTER_WIDTH - PAD * 2;
  const colGap = 24;
  const colW = (totalW - colGap) / 2;
  const leftX = PAD;
  const rightX = PAD + colW + colGap;

  // ---- Left column: info cards ----
  const infoRows = [
    { icon: "person", label: "ELIGIBILITY", value: job.eligibility || "Freshers / recent graduates" },
    { icon: "briefcase", label: "EXPERIENCE", value: job.experience || "Freshers (0-2 years)" },
    { icon: "pin", label: "LOCATION", value: job.location || "India" },
    { icon: "clock", label: "JOB TYPE", value: job.jobType || "Full-time / Hybrid" },
  ];
  const rowH = 92;
  const rowGap = 14;
  let cy = startY;
  infoRows.forEach((row) => {
    ctx.save();
    ctx.shadowColor = "rgba(20,10,50,0.08)";
    ctx.shadowBlur = 14;
    fillRoundedRect(ctx, leftX, cy, colW, rowH, 18, CARD_BG);
    ctx.restore();
    // thin purple accent line on the right inner edge
    ctx.strokeStyle = "rgba(110,31,214,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftX + colW - 18, cy + 16);
    ctx.lineTo(leftX + colW - 18, cy + rowH - 16);
    ctx.stroke();

    drawSquareIcon(ctx, row.icon, leftX + 52, cy + rowH / 2, 60, theme.primary);

    ctx.fillStyle = theme.primary;
    ctx.font = "800 17px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(row.label, leftX + 100, cy + 34);

    ctx.fillStyle = BLACK;
    ctx.font = "900 24px 'Arial Black', Arial, sans-serif";
    drawWrapped(ctx, row.value, leftX + 100, cy + 66, colW - 130, 26, 2, "left");

    cy += rowH + rowGap;
  });
  const leftBottom = cy - rowGap;

  // ---- Right column: "WHY JOIN THIS TEAM?" panel ----
  const benefits = Array.isArray(job.benefits) && job.benefits.length
    ? job.benefits.slice(0, 4).map((b) =>
        typeof b === "string"
          ? { icon: "growth", title: b, sub: "" }
          : { icon: b.icon || "growth", title: b.title || b.text || "", sub: b.sub || b.subtitle || "" }
      )
    : [
        { icon: "growth", title: "CAREER GROWTH", sub: "Build a meaningful career" },
        { icon: "gradcap", title: "LEARN & UPSKILL", sub: "Work with modern tools" },
        { icon: "users", title: "INCLUSIVE CULTURE", sub: "People-first workplace" },
        { icon: "globe", title: "GLOBAL IMPACT", sub: "Projects that matter" },
      ];

  const headerH = 74;
  const benefitRowH = (leftBottom - startY - headerH) / benefits.length;

  ctx.save();
  ctx.shadowColor = "rgba(20,10,50,0.1)";
  ctx.shadowBlur = 16;
  fillRoundedRect(ctx, rightX, startY, colW, leftBottom - startY, 20, CARD_BG);
  ctx.restore();

  const headerGrad = ctx.createLinearGradient(rightX, startY, rightX + colW, startY);
  headerGrad.addColorStop(0, theme.primary);
  headerGrad.addColorStop(1, theme.dark);
  ctx.save();
  roundedRect(ctx, rightX, startY, colW, headerH, 20);
  ctx.clip();
  ctx.fillStyle = headerGrad;
  ctx.fillRect(rightX, startY, colW, headerH);
  ctx.restore();

  ctx.fillStyle = WHITE;
  ctx.font = "800 21px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("WHY JOIN THIS TEAM?", rightX + colW / 2, startY + 32);
  ctx.fillStyle = YELLOW;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const sx = rightX + colW / 2 - 46 + i * 30;
    drawIcon(ctx, "star", sx, startY + 54, 14, YELLOW);
  }

  let by = startY + headerH;
  benefits.forEach((b, i) => {
    drawCircleIcon(ctx, b.icon, rightX + 44, by + benefitRowH / 2, 48, theme.primary);
    ctx.fillStyle = BLACK;
    ctx.font = "800 19px 'Arial Black', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(b.title, rightX + 82, by + benefitRowH / 2 - 4);
    ctx.fillStyle = GREY_TEXT;
    ctx.font = "600 15px Arial, sans-serif";
    ctx.fillText(b.sub, rightX + 82, by + benefitRowH / 2 + 18);

    if (i < benefits.length - 1) {
      ctx.strokeStyle = DIVIDER;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rightX + 20, by + benefitRowH);
      ctx.lineTo(rightX + colW - 20, by + benefitRowH);
      ctx.stroke();
    }
    by += benefitRowH;
  });

  return leftBottom;
}

// ---------------------------------------------------------------------------
// 3. Compensation banner — returns bottom Y
// ---------------------------------------------------------------------------
function drawCompensation(ctx, startY, job, theme) {
  const w = POSTER_WIDTH - PAD * 2;
  const h = 132;
  const x = PAD;
  const y = startY;

  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, theme.primary);
  g.addColorStop(1, theme.dark);
  ctx.save();
  ctx.shadowColor = "rgba(46,10,110,0.35)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  fillRoundedRect(ctx, x, y, w, h, 20, g);
  ctx.restore();

  drawDotGrid(ctx, x + 30, y + 32, 3, 4, 18, 3, "rgba(255,255,255,0.35)");
  drawDotGrid(ctx, x + w - 66, y + 32, 3, 4, 18, 3, "rgba(255,255,255,0.35)");

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.textAlign = "center";
  ctx.font = "700 20px Arial, sans-serif";
  letterSpaced(ctx, "\u2014  COMPENSATION PACKAGE  \u2014", POSTER_WIDTH / 2, y + 42, 2, "center");

  const comp = job.salaryRange || job.compensation || "INR 3.5-6 LPA";
  const parts = String(comp).match(/^([A-Za-z]*\s*)([\d.\-–\s]+)(\s*[A-Za-z]*)$/);
  ctx.font = "900 58px 'Arial Black', Arial, sans-serif";
  if (parts) {
    const [, pre, mid, post] = parts;
    const midClean = mid.trim().replace(/-/g, " - ");
    const preW = ctx.measureText(pre.trim()).width;
    const midW = ctx.measureText(midClean).width;
    const postW = ctx.measureText(post.trim()).width;
    const gap = 16;
    const total = preW + midW + postW + gap * 2;
    let cx = POSTER_WIDTH / 2 - total / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = WHITE;
    ctx.fillText(pre.trim(), cx, y + 106);
    cx += preW + gap;
    ctx.fillStyle = YELLOW;
    ctx.fillText(midClean, cx, y + 106);
    cx += midW + gap;
    ctx.fillStyle = WHITE;
    ctx.fillText(post.trim(), cx, y + 106);
    ctx.textAlign = "center";
  } else {
    ctx.fillStyle = WHITE;
    ctx.fillText(comp, POSTER_WIDTH / 2, y + 106);
  }

  return y + h;
}

// ---------------------------------------------------------------------------
// 4. Key skills — bigger, eye-catching bulleted grid (each skill as its own
//    row with a filled disc bullet), generous spacing between items.
//    Returns bottom Y.
// ---------------------------------------------------------------------------
function drawKeySkills(ctx, startY, job, theme) {
  const w = POSTER_WIDTH - PAD * 2;
  const x = PAD;
  const y = startY;

  const rawSkills = Array.isArray(job.skills)
    ? job.skills
    : typeof job.skills === "string" && job.skills.trim()
      ? job.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : ["Communication", "Problem solving", "Content review", "Attention to detail"];

  const titleH = 60;
  const itemGapY = 20; // extra breathing room between each skill row
  const itemH = 50;
  const cols = 2;
  const rows = Math.ceil(rawSkills.length / cols);
  const colGap = 20;
  const colW = (w - 48 - colGap) / cols;
  const bodyH = rows * itemH + (rows - 1) * itemGapY;
  const h = titleH + bodyH + 40;

  ctx.save();
  ctx.shadowColor = "rgba(20,10,50,0.1)";
  ctx.shadowBlur = 16;
  fillRoundedRect(ctx, x, y, w, h, 22, CARD_BG);
  ctx.restore();

  drawCircleIcon(ctx, "target", x + 54, y + titleH / 2 + 10, 52, theme.primary);
  ctx.fillStyle = theme.primary;
  ctx.font = "900 26px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("KEY SKILLS", x + 96, y + titleH / 2 + 20);

  ctx.strokeStyle = DIVIDER;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 24, y + titleH + 4);
  ctx.lineTo(x + w - 24, y + titleH + 4);
  ctx.stroke();

  rawSkills.forEach((skill, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ix = x + 24 + col * (colW + colGap);
    const iy = y + titleH + 20 + row * (itemH + itemGapY);

    ctx.save();
    ctx.globalAlpha = 0.07;
    fillRoundedRect(ctx, ix, iy, colW, itemH, 14, theme.primary);
    ctx.restore();
    strokeRoundedRect(ctx, ix, iy, colW, itemH, 14, "rgba(110,31,214,0.18)", 1.5);

    ctx.save();
    ctx.shadowColor = "rgba(110,31,214,0.4)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(ix + 26, iy + itemH / 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = theme.primary;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(ix + 26, iy + itemH / 2, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.fill();

    ctx.fillStyle = BLACK;
    ctx.font = "700 19px Arial, sans-serif";
    ctx.textAlign = "left";
    drawWrapped(ctx, skill, ix + 48, iy + itemH / 2 + 7, colW - 64, 20, 1, "left");
  });

  return y + h;
}

// ---------------------------------------------------------------------------
// 5. CTA banner — black, with purple accent + megaphone. Returns bottom Y.
// ---------------------------------------------------------------------------
function drawCtaBanner(ctx, startY, theme) {
  const bW = POSTER_WIDTH - PAD * 2;
  const bH = 214;
  const bX = PAD;
  const bY = startY;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  fillRoundedRect(ctx, bX, bY, bW, bH, 24, BLACK);
  ctx.restore();

  // purple diagonal accent, top-left corner
  ctx.save();
  roundedRect(ctx, bX, bY, bW, bH, 24);
  ctx.clip();
  const accentGrad = ctx.createLinearGradient(bX, bY, bX + 220, bY + bH);
  accentGrad.addColorStop(0, theme.primary);
  accentGrad.addColorStop(1, "rgba(110,31,214,0)");
  ctx.fillStyle = accentGrad;
  ctx.beginPath();
  ctx.moveTo(bX, bY);
  ctx.lineTo(bX + 220, bY);
  ctx.lineTo(bX, bY + bH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const cx = bX + bW / 2;
  ctx.textAlign = "center";

  ctx.font = "700 19px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  letterSpaced(ctx, "\u2014  INTERESTED CANDIDATES  \u2014", cx, bY + 40, 2, "center");

  ctx.font = "900 60px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "left";
  const applyW = ctx.measureText("APPLY ").width;
  const todayW = ctx.measureText("TODAY!").width;
  let ax = cx - (applyW + todayW) / 2;
  ctx.fillStyle = WHITE;
  ctx.fillText("APPLY ", ax, bY + 100);
  ax += applyW;
  ctx.fillStyle = YELLOW;
  ctx.fillText("TODAY!", ax, bY + 100);
  ctx.textAlign = "center";

  // pill button
  const pillText = "COMMENT \u201CAPPLY\u201D FOR THE LINK";
  ctx.font = "800 19px Arial, sans-serif";
  const pillTextW = ctx.measureText(pillText).width;
  const pillW = pillTextW + 90;
  const pillH = 52;
  const pillX = cx - pillW / 2;
  const pillY = bY + 130;
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
  pillGrad.addColorStop(0, theme.primary);
  pillGrad.addColorStop(1, theme.dark);
  fillRoundedRect(ctx, pillX, pillY, pillW, pillH, 26, pillGrad);
  drawIcon(ctx, "megaphone", pillX + 36, pillY + pillH / 2, 26, WHITE);
  ctx.textAlign = "left";
  ctx.font = "800 19px Arial, sans-serif";
  let px = pillX + 60;
  const segs = pillText.split("APPLY");
  ctx.fillStyle = WHITE;
  ctx.fillText(segs[0], px, pillY + pillH / 2 + 7);
  px += ctx.measureText(segs[0]).width;
  ctx.fillStyle = YELLOW;
  ctx.fillText("APPLY", px, pillY + pillH / 2 + 7);
  px += ctx.measureText("APPLY").width;
  ctx.fillStyle = WHITE;
  ctx.fillText(segs[1], px, pillY + pillH / 2 + 7);
  ctx.textAlign = "left";

  return bY + bH;
}

// ---------------------------------------------------------------------------
// 6. Footer — purple bar with bell + follow text, share + save text.
// ---------------------------------------------------------------------------
const FOOTER_HEIGHT = 118;

function drawFooter(ctx, startY, job, theme) {
  const fY = startY;
  const fH = FOOTER_HEIGHT;
  const g = ctx.createLinearGradient(PAD, fY, POSTER_WIDTH - PAD, fY);
  g.addColorStop(0, theme.primary);
  g.addColorStop(1, theme.dark);
  fillRoundedRect(ctx, PAD, fY, POSTER_WIDTH - PAD * 2, fH, 20, g);

  const midX = POSTER_WIDTH / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(midX, fY + 22);
  ctx.lineTo(midX, fY + fH - 22);
  ctx.stroke();

  // Left: bell + follow text
  const leftCx = PAD + (midX - PAD) / 2;
  drawIcon(ctx, "bell", PAD + 70, fY + fH / 2, 30, WHITE);
  ctx.textAlign = "left";
  ctx.font = "800 18px Arial, sans-serif";
  ctx.fillStyle = WHITE;
  ctx.fillText("FOLLOW FOR DAILY", PAD + 106, fY + fH / 2 - 6);
  ctx.fillStyle = YELLOW;
  ctx.fillText("VERIFIED", PAD + 106, fY + fH / 2 + 20);
  ctx.fillStyle = WHITE;
  ctx.fillText(" JOB UPDATES", PAD + 106 + ctx.measureText("VERIFIED").width, fY + fH / 2 + 20);

  // Right: share + save text
  drawIcon(ctx, "share", midX + 64, fY + fH / 2, 28, WHITE);
  ctx.fillStyle = WHITE;
  ctx.font = "800 18px Arial, sans-serif";
  ctx.fillText("SAVE & SHARE", midX + 98, fY + fH / 2 - 6);
  ctx.fillText("WITH YOUR FRIENDS", midX + 98, fY + fH / 2 + 20);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
async function renderJobPoster({ backgroundBuffer, job }) {
  try {
    let bgImage = null;
    if (backgroundBuffer) {
      try {
        bgImage = await loadImage(backgroundBuffer);
      } catch (_) {
        bgImage = null;
      }
    }

    const theme = resolveTheme(job);

    // Pass 1 (measure): draw on a scratch canvas with the base GAP just to
    // find out how much vertical space the fixed-height sections actually
    // use, so any leftover space can be spread evenly between sections
    // instead of collapsing into one big gap above the footer.
    const measureCanvas = createCanvas(POSTER_WIDTH, POSTER_HEIGHT);
    const measureCtx = measureCanvas.getContext("2d");
    let my = 84;
    my = await drawHeader(measureCtx, job, bgImage, my, theme);
    my = drawTwoColumnSection(measureCtx, job, my + GAP, theme);
    my = drawCompensation(measureCtx, my + GAP, job, theme);
    my = drawKeySkills(measureCtx, my + GAP, job, theme);
    my = drawCtaBanner(measureCtx, my + GAP, theme);

    const GAP_COUNT = 5; // header->cols, cols->comp, comp->skills, skills->cta, cta->footer
    const available = POSTER_HEIGHT - PAD - FOOTER_HEIGHT - my;
    const extraPerGap = Math.max(0, available / GAP_COUNT);
    const effectiveGap = Math.min(GAP + extraPerGap, 46);

    // Pass 2 (final): redraw everything using the evenly distributed gap.
    const canvas = createCanvas(POSTER_WIDTH, POSTER_HEIGHT);
    const ctx = canvas.getContext("2d");
    drawBackground(ctx);

    let y = 84;
    y = await drawHeader(ctx, job, bgImage, y, theme);
    y = drawTwoColumnSection(ctx, job, y + effectiveGap, theme);
    y = drawCompensation(ctx, y + effectiveGap, job, theme);
    y = drawKeySkills(ctx, y + effectiveGap, job, theme);
    y = drawCtaBanner(ctx, y + effectiveGap, theme);
    drawFooter(ctx, y + effectiveGap, job, theme);

    return { success: true, buffer: canvas.toBuffer("image/png") };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  renderJobPoster,
  POSTER_WIDTH,
  POSTER_HEIGHT,
  colors: { PURPLE, PURPLE_DARK, PURPLE_LIGHT, WHITE, YELLOW, BLACK },
};