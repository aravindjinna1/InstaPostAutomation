// /**
//  * Poster service — renders a premium, structured, Fortune-500-style
//  * recruitment poster matching the ultra-detailed reference spec
//  * (poster-preview-v232.png). Built entirely with @napi-rs/canvas so the
//  * text/icons/layout are 100% crisp and correctly spelled (AI image models
//  * are not dependable for text/logos).
//  *
//  * Layout (9:16, 1080x1920):
//  *   1. Hero header — "WE ARE / HIRING!" + company logo/name + date pill
//  *   2. Main content — left info cards + right building image
//  *   3. Skills grid — 3x3 skill cards
//  *   4. Benefits strip — 4 equal columns
//  *   5. CTA banner — gradient pink→red→orange with COMMENT/ANYTHING/FOR LINK
//  *   6. Footer — navy strip
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

// function wrapText(ctx, value, maxWidth, maxLines = Infinity) {
//   const words = String(value || "Not specified").trim().split(/\s+/);
//   const lines = [];
//   let current = "";
//   for (const word of words) {
//     const candidate = current ? `${current} ${word}` : word;
//     if (ctx.measureText(candidate).width > maxWidth && current) {
//       lines.push(current);
//       current = word;
//     } else current = candidate;
//   }
//   if (current) lines.push(current);
//   if (lines.length <= maxLines) return lines;
//   const clipped = lines.slice(0, maxLines);
//   let last = clipped[maxLines - 1];
//   while (ctx.measureText(`${last}...`).width > maxWidth && last.length) last = last.slice(0, -1);
//   clipped[maxLines - 1] = `${last.trim()}...`;
//   return clipped;
// }

// function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, textAlign = "left") {
//   const lines = wrapText(ctx, text, maxWidth);
//   ctx.textAlign = textAlign;
//   lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
//   return lines.length;
// }

// function drawText(ctx, text, x, y, font, color, align = "left") {
//   ctx.font = font;
//   ctx.fillStyle = color;
//   ctx.textAlign = align;
//   ctx.fillText(text, x, y);
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
//       ctx.beginPath(); ctx.arc(cx, y + s * 0.34, s * 0.2, 0, Math.PI * 2); ctx.fill();
//       ctx.beginPath(); ctx.arc(cx, y + s * 0.34, s * 0.2, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.arc(cx - s * 0.22, y + s * 0.78, s * 0.16, 0, Math.PI * 2); ctx.fill();
//       ctx.beginPath(); ctx.arc(cx + s * 0.22, y + s * 0.78, s * 0.16, 0, Math.PI * 2); ctx.fill();
//       ctx.beginPath(); ctx.arc(cx - s * 0.22, y + s * 0.78, s * 0.16, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.arc(cx + s * 0.22, y + s * 0.78, s * 0.16, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.95); ctx.lineTo(cx, y + s * 0.58); ctx.lineTo(x + s * 0.9, y + s * 0.95); ctx.stroke();
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
//       ctx.beginPath(); ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2); ctx.stroke();
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
//       ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, y + s * 0.1); ctx.arc(cx, cy, s * 0.4, -Math.PI / 2, 0.4); ctx.closePath(); ctx.fill();
//       break;
//     }
//     case "users": {
//       ctx.beginPath(); ctx.arc(cx - s * 0.2, cy - s * 0.16, s * 0.16, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.arc(cx + s * 0.2, cy - s * 0.16, s * 0.16, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.arc(cx - s * 0.2, cy + s * 0.1, s * 0.16, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.arc(cx + s * 0.2, cy + s * 0.1, s * 0.16, 0, Math.PI * 2); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.05, cy + s * 0.4); ctx.lineTo(cx - s * 0.2, cy + s * 0.28); ctx.lineTo(cx + s * 0.2, cy + s * 0.28); ctx.lineTo(x + s * 0.95, cy + s * 0.4); ctx.stroke();
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
//       ctx.beginPath(); ctx.moveTo(cx, y + s * 0.7); ctx.lineTo(cx, y + s * 0.9); ctx.stroke();
//       ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.9); ctx.lineTo(x + s * 0.7, y + s * 0.9); ctx.stroke();
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

// // Circle icon badge (white icon on colored circle)
// function drawCircleIcon(ctx, kind, cx, cy, size, color) {
//   ctx.save();
//   ctx.beginPath();
//   ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
//   ctx.fillStyle = color;
//   ctx.fill();
//   // subtle inner ring
//   ctx.strokeStyle = "rgba(255,255,255,0.5)";
//   ctx.lineWidth = 2;
//   ctx.stroke();
//   drawIcon(ctx, kind, cx, cy, size * 0.62, WHITE);
//   ctx.restore();
// }

// // ---------------------------------------------------------------------------
// // Dotted + decorative background
// // ---------------------------------------------------------------------------
// function drawBackground(ctx) {
//   ctx.fillStyle = WHITE;
//   ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

//   // subtle light blue radial gradient
//   const g = ctx.createRadialGradient(POSTER_WIDTH / 2, 400, 60, POSTER_WIDTH / 2, 400, 1000);
//   g.addColorStop(0, "rgba(11,87,208,0.06)");
//   g.addColorStop(1, "rgba(255,255,255,0)");
//   ctx.fillStyle = g;
//   ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

//   // dotted decorative pattern (top-left corner)
//   ctx.fillStyle = "rgba(11,87,208,0.18)";
//   for (let row = 0; row < 6; row++) {
//     for (let col = 0; col < 6; col++) {
//       ctx.beginPath();
//       ctx.arc(40 + col * 22, 40 + row * 22, 3, 0, Math.PI * 2);
//       ctx.fill();
//     }
//   }
//   // dotted pattern (bottom-right corner)
//   ctx.fillStyle = "rgba(255,212,0,0.25)";
//   for (let row = 0; row < 6; row++) {
//     for (let col = 0; col < 6; col++) {
//       ctx.beginPath();
//       ctx.arc(POSTER_WIDTH - 40 - col * 22, POSTER_HEIGHT - 40 - row * 22, 3, 0, Math.PI * 2);
//       ctx.fill();
//     }
//   }

//   // thin royal blue border around the whole poster
//   strokeRoundedRect(ctx, 8, 8, POSTER_WIDTH - 16, POSTER_HEIGHT - 16, 24, "rgba(11,87,208,0.35)", 3);
// }

// // ---------------------------------------------------------------------------
// // Hero header
// // ---------------------------------------------------------------------------
// function drawHeroHeader(ctx, job) {
//   const company = String(job.company || "TCS").replace(" India", "");
//   const role = String(job.title || job.role || "Open Role").toUpperCase();
//   const colors = getCompanyColors(job.company);
//   const heroHeight = 320;
//   const heroX = PAD;
//   const heroY = 14;
//   const heroW = POSTER_WIDTH - PAD * 2;

//   const heroGrad = ctx.createLinearGradient(0, heroY, 0, heroY + heroHeight);
//   heroGrad.addColorStop(0, "rgba(11,87,208,0.96)");
//   heroGrad.addColorStop(0.35, "rgba(11,87,208,0.82)");
//   heroGrad.addColorStop(1, "rgba(1,17,52,0.98)");
//   fillRoundedRect(ctx, heroX, heroY, heroW, heroHeight, 40, heroGrad);
//   strokeRoundedRect(ctx, heroX, heroY, heroW, heroHeight, 40, "rgba(255,255,255,0.18)", 2);

//   ctx.textAlign = "left";
//   ctx.fillStyle = WHITE;
//   ctx.font = "900 82px 'Arial Black', Arial, sans-serif";
//   ctx.fillText("WE ARE", heroX + 36, heroY + 138);
//   ctx.font = "900 118px 'Arial Black', Arial, sans-serif";
//   ctx.fillStyle = YELLOW;
//   ctx.fillText("HIRING!", heroX + 36, heroY + 218);

//   ctx.font = "900 32px 'Arial Black', Arial, sans-serif";
//   ctx.fillStyle = WHITE;
//   ctx.fillText(company.toUpperCase(), heroX + 36, heroY + 276);

//   ctx.font = "700 20px Arial, sans-serif";
//   ctx.fillStyle = "rgba(255,255,255,0.92)";
//   ctx.fillText(role, heroX + 36, heroY + 304);

//   const pillText = job.dateText || "25th Drive in Bangalore";
//   ctx.font = "700 16px Arial, sans-serif";
//   const pw = ctx.measureText(pillText).width + 72;
//   const ph = 42;
//   const px = heroX + heroW - pw - 22;
//   const py = heroY + 20;
//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.25)";
//   ctx.shadowBlur = 12;
//   fillRoundedRect(ctx, px, py, pw, ph, 22, YELLOW);
//   ctx.restore();
//   drawIcon(ctx, "calendar", px + 24, py + ph / 2, 18, NAVY);
//   ctx.fillStyle = NAVY;
//   ctx.textAlign = "left";
//   ctx.fillText(pillText, px + 44, py + 28);
// }

// // ---------------------------------------------------------------------------
// // Main content: left info cards + right building image
// // ---------------------------------------------------------------------------
// async function drawMainContent(ctx, job, bgImage) {
//   const colors = getCompanyColors(job.company);
//   const leftW = 450;
//   const rightX = PAD + leftW + 30;
//   const rightW = POSTER_WIDTH - PAD - rightX - 6;
//   const topY = 320;

//   // ===== LEFT column: info cards =====
//   const rows = [
//     { icon: "person", label: "EXPERIENCE", value: job.experience || "Freshers (0-2 years)" },
//     { icon: "pin", label: "LOCATION", value: job.location || "India" },
//     { icon: "calendar", label: "DRIVE DATE", value: "25th" },
//     { icon: "briefcase", label: "OPEN SKILLS", value: "Multiple SAP & Non-SAP Technologies" },
//   ];
//   const rowH = 96;
//   rows.forEach((row, i) => {
//     const y = topY + i * rowH;
//     drawCircleIcon(ctx, row.icon, PAD + 30, y + 34, 56, colors.primary || ROYAL);
//     ctx.fillStyle = GREY_TEXT;
//     ctx.font = "800 20px Arial, sans-serif";
//     ctx.textAlign = "left";
//     ctx.fillText(row.label, PAD + 78, y + 26);
//     ctx.fillStyle = DARK_TEXT;
//     ctx.font = "900 30px 'Arial Black', Arial, sans-serif";
//     drawWrapped(ctx, row.value, PAD + 78, y + 60, leftW - 78, 32, 2);

//     // divider line
//     if (i < rows.length - 1) {
//       ctx.strokeStyle = DIVIDER;
//       ctx.lineWidth = 2;
//       ctx.beginPath();
//       ctx.moveTo(PAD, y + rowH - 8);
//       ctx.lineTo(PAD + leftW, y + rowH - 8);
//       ctx.stroke();
//     }
//   });

//   // ===== RIGHT column: building image =====
//   const imgBoxY = topY;
//   const imgH = rows.length * rowH; // match left column height
//   // curved blue shape wrapping behind
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
//     // fallback: draw a stylized building silhouette
//     ctx.fillStyle = LIGHT_BLUE;
//     ctx.fillRect(rightX, imgBoxY, rightW, imgH);
//     ctx.fillStyle = ROYAL;
//     for (let i = 0; i < 4; i++) {
//       const bx = rightX + 30 + i * ((rightW - 60) / 4);
//       const bh = 120 + (i % 3) * 40;
//       fillRoundedRect(ctx, bx, imgBoxY + imgH - bh - 20, (rightW - 60) / 4 - 14, bh, 8, i % 2 ? "#7AA7E8" : ROYAL);
//     }
//   }
//   // soft overlay gradient at bottom
//   const fade = ctx.createLinearGradient(0, imgBoxY + imgH * 0.6, 0, imgBoxY + imgH);
//   fade.addColorStop(0, "rgba(0,0,0,0)");
//   fade.addColorStop(1, "rgba(7,27,74,0.35)");
//   ctx.fillStyle = fade;
//   ctx.fillRect(rightX, imgBoxY, rightW, imgH);
//   ctx.restore();

//   // caption chip on image
//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.3)";
//   ctx.shadowBlur = 8;
//   fillRoundedRect(ctx, rightX + 16, imgBoxY + imgH - 56, 190, 40, 20, YELLOW);
//   ctx.restore();
//   ctx.fillStyle = NAVY;
//   ctx.font = "900 20px Arial, sans-serif";
//   ctx.textAlign = "center";
//   ctx.fillText("OUR CAMPUS", rightX + 16 + 95, imgBoxY + imgH - 30);

//   return imgBoxY + imgH;
// }

// // ---------------------------------------------------------------------------
// // Skills grid (3x3)
// // ---------------------------------------------------------------------------
// function drawSkillsGrid(ctx, job, topY) {
//   const colors = getCompanyColors(job.company);
//   const gridW = POSTER_WIDTH - PAD * 2;
//   const gridH = 300;
//   const gridX = PAD;
//   const gridY = topY + 6;

//   // container
//   ctx.save();
//   ctx.shadowColor = "rgba(11,87,208,0.12)";
//   ctx.shadowBlur = 14;
//   fillRoundedRect(ctx, gridX, gridY, gridW, gridH, 24, WHITE);
//   ctx.restore();
//   strokeRoundedRect(ctx, gridX, gridY, gridW, gridH, 24, ROYAL, 2);

//   // overlapping title pill
//   ctx.save();
//   ctx.shadowColor = "rgba(7,27,74,0.35)";
//   ctx.shadowBlur = 10;
//   fillRoundedRect(ctx, gridX + 40, gridY - 26, gridW - 80, 52, 26, NAVY);
//   ctx.restore();
//   ctx.fillStyle = WHITE;
//   ctx.font = "900 24px 'Arial Black', Arial, sans-serif";
//   ctx.textAlign = "center";
//   ctx.fillText("SKILLS WE ARE LOOKING FOR", POSTER_WIDTH / 2, gridY + 6);

//   // skill cards
//   const skills = [
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
//   const cardW = (gridW - 80) / 3;
//   const cardH = (gridH - 60) / 3;
//   skills.forEach((skill, i) => {
//     const col = i % 3;
//     const row = Math.floor(i / 3);
//     const x = gridX + 20 + col * (cardW + 10);
//     const y = gridY + 40 + row * (cardH + 10);
//     ctx.save();
//     ctx.shadowColor = "rgba(11,87,208,0.1)";
//     ctx.shadowBlur = 8;
//     fillRoundedRect(ctx, x, y, cardW, cardH, 14, WHITE);
//     ctx.restore();
//     strokeRoundedRect(ctx, x, y, cardW, cardH, 14, DIVIDER, 2);
//     drawCircleIcon(ctx, skill.icon, x + 30, y + 30, 40, colors.primary || ROYAL);
//     ctx.fillStyle = DARK_TEXT;
//     ctx.font = "900 23px 'Arial Black', Arial, sans-serif";
//     ctx.textAlign = "left";
//     ctx.fillText(skill.name, x + 56, y + 30);
//     ctx.fillStyle = GREY_TEXT;
//     ctx.font = "700 16px Arial, sans-serif";
//     ctx.fillText(skill.sub.toUpperCase(), x + 56, y + 52);
//   });

//   return gridY + gridH + 8;
// }

// // ---------------------------------------------------------------------------
// // Benefits strip (4 columns)
// // ---------------------------------------------------------------------------
// function drawBenefitsStrip(ctx, topY) {
//   const stripW = POSTER_WIDTH - PAD * 2;
//   const stripH = 150;
//   const stripX = PAD;
//   const stripY = topY + 6;

//   ctx.save();
//   ctx.shadowColor = "rgba(7,27,74,0.3)";
//   ctx.shadowBlur = 16;
//   fillRoundedRect(ctx, stripX, stripY, stripW, stripH, 24, NAVY);
//   ctx.restore();

//   const benefits = [
//     { icon: "users", title: "Work with a Global Leader" },
//     { icon: "growth", title: "Grow Your Career" },
//     { icon: "gear", title: "Learn & Upskill Continuously" },
//     { icon: "trophy", title: "Be Part of Something Big" },
//   ];

//   const colW = stripW / 4;
//   benefits.forEach((b, i) => {
//     const x = stripX + i * colW;
//     const cx = x + colW / 2;
//     drawIcon(ctx, b.icon, cx, stripY + 44, 40, WHITE);
//     ctx.fillStyle = YELLOW;
//     ctx.font = "900 20px 'Arial Black', Arial, sans-serif";
//     ctx.textAlign = "center";
//     drawWrapped(ctx, b.title, cx - 40, stripY + 100, 80, 22, "center");
//     if (i < 3) {
//       ctx.strokeStyle = "rgba(255,255,255,0.35)";
//       ctx.lineWidth = 2;
//       ctx.beginPath();
//       ctx.moveTo(x + colW, stripY + 24);
//       ctx.lineTo(x + colW, stripY + stripH - 24);
//       ctx.stroke();
//     }
//   });

//   return stripY + stripH;
// }

// // ---------------------------------------------------------------------------
// // Compensation panel (large, centered)
// // ---------------------------------------------------------------------------
// function drawCompensation(ctx, topY, job) {
//   const w = POSTER_WIDTH - PAD * 2;
//   const h = 140;
//   const x = PAD;
//   const y = topY + 18;

//   // subtle gradient panel
//   const g = ctx.createLinearGradient(x, y, x + w, y + h);
//   g.addColorStop(0, "rgba(11,87,208,0.96)");
//   g.addColorStop(1, "rgba(7,27,74,0.96)");
//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.25)";
//   ctx.shadowBlur = 18;
//   fillRoundedRect(ctx, x, y, w, h, 18, g);
//   ctx.restore();

//   ctx.fillStyle = WHITE;
//   ctx.textAlign = "center";
//   ctx.font = "900 40px 'Arial Black', Arial, sans-serif";
//   ctx.fillText("COMPENSATION PACKAGE", POSTER_WIDTH / 2, y + 46);

//   const comp = job.compensation || "INR 3.5-6 LPA";
//   ctx.fillStyle = YELLOW;
//   ctx.font = "900 84px 'Arial Black', Arial, sans-serif";
//   ctx.fillText(comp, POSTER_WIDTH / 2, y + 110);

//   return y + h;
// }

// // ---------------------------------------------------------------------------
// // CTA banner (gradient pink -> red -> orange)
// // ---------------------------------------------------------------------------
// function drawCtaBanner(ctx, topY) {
//   const bW = POSTER_WIDTH - PAD * 2;
//   const bH = 220;
//   const bX = PAD;
//   const bY = topY + 24;

//   ctx.save();
//   ctx.shadowColor = "rgba(255,0,76,0.45)";
//   ctx.shadowBlur = 24;
//   const grad = ctx.createLinearGradient(bX, 0, bX + bW, 0);
//   grad.addColorStop(0, PINK);
//   grad.addColorStop(0.5, RED);
//   grad.addColorStop(1, ORANGE);
//   fillRoundedRect(ctx, bX, bY, bW, bH, 26, grad);
//   ctx.restore();

//   // gloss effect
//   const gloss = ctx.createLinearGradient(0, bY, 0, bY + bH);
//   gloss.addColorStop(0, "rgba(255,255,255,0.22)");
//   gloss.addColorStop(0.28, "rgba(255,255,255,0)");
//   gloss.addColorStop(0.72, "rgba(0,0,0,0)");
//   gloss.addColorStop(1, "rgba(0,0,0,0.18)");
//   ctx.fillStyle = gloss;
//   fillRoundedRect(ctx, bX, bY, bW, bH, 26, "rgba(255,255,255,0)");
//   ctx.fillRect(bX, bY, bW, bH);

//   // speech bubble icon on the left
//   drawIcon(ctx, "bubble", bX + 90, bY + bH / 2, 90, WHITE);

//   // yellow rays decoration
//   ctx.strokeStyle = "rgba(255,212,0,0.7)";
//   ctx.lineWidth = 4;
//   for (let i = 0; i < 5; i++) {
//     const a = -0.6 + i * 0.3;
//     ctx.beginPath();
//     ctx.moveTo(bX + bW - 40, bY + bH / 2);
//     ctx.lineTo(bX + bW - 40 + Math.cos(a) * 70, bY + bH / 2 + Math.sin(a) * 70);
//     ctx.stroke();
//   }

//   // stacked CTA text
//   ctx.textAlign = "center";
//   ctx.lineJoin = "round";
//   ctx.lineCap = "round";
//   const cx = bX + bW / 2 + 40;

//   ctx.font = "900 46px 'Arial Black', Arial, sans-serif";
//   ctx.lineWidth = 10;
//   ctx.strokeStyle = NAVY;
//   ctx.strokeText("COMMENT", cx, bY + 62);
//   ctx.fillStyle = WHITE;
//   ctx.fillText("COMMENT", cx, bY + 62);

//   ctx.font = "900 74px 'Arial Black', Arial, sans-serif";
//   ctx.lineWidth = 12;
//   ctx.strokeText("ANYTHING", cx, bY + 132);
//   ctx.fillStyle = YELLOW;
//   ctx.fillText("ANYTHING", cx, bY + 132);

//   ctx.font = "900 46px 'Arial Black', Arial, sans-serif";
//   ctx.lineWidth = 10;
//   ctx.strokeText("FOR LINK", cx, bY + 196);
//   ctx.fillStyle = WHITE;
//   ctx.fillText("FOR LINK", cx, bY + 196);

//   return bY + bH;
// }

// // ---------------------------------------------------------------------------
// // Footer
// // ---------------------------------------------------------------------------
// function drawFooter(ctx, topY) {
//   const fY = topY + 20;
//   const fH = POSTER_HEIGHT - fY - 8;
//   fillRoundedRect(ctx, 8, fY, POSTER_WIDTH - 16, fH, 22, NAVY);
//   ctx.fillStyle = WHITE;
//   ctx.font = "700 27px 'Arial Black', Arial, sans-serif";
//   ctx.textAlign = "center";
//   ctx.fillText("FOLLOW FOR DAILY VERIFIED JOB UPDATES", POSTER_WIDTH / 2, fY + 66);
//   ctx.fillStyle = YELLOW;
//   ctx.font = "900 30px Arial, sans-serif";
//   ctx.fillText("•", POSTER_WIDTH / 2, fY + 102);
//   ctx.fillStyle = WHITE;
//   ctx.font = "700 27px 'Arial Black', Arial, sans-serif";
//   ctx.fillText("SAVE & SHARE", POSTER_WIDTH / 2, fY + 138);
// }

// // ---------------------------------------------------------------------------
// // Main entry point
// // ---------------------------------------------------------------------------
// async function renderJobPoster({ backgroundBuffer, job }) {
//   try {
//     const canvas = createCanvas(POSTER_WIDTH, POSTER_HEIGHT);
//     const ctx = canvas.getContext("2d");
//     const colors = getCompanyColors(job.company);

//     // Load the corporate building background (optional; graceful fallback if absent)
//     let bgImage = null;
//     if (backgroundBuffer) {
//       try {
//         bgImage = await loadImage(backgroundBuffer);
//       } catch (_) {
//         bgImage = null;
//       }
//     }

//     drawBackground(ctx);

//     // 1. Hero header
//     drawHeroHeader(ctx, job);

//     // 2. Main content (left info + right building image)
//     const afterMain = await drawMainContent(ctx, job, bgImage);

//     // 3. Skills grid
//     const afterSkills = drawSkillsGrid(ctx, job, afterMain);

//     // 4. Benefits strip
//     // 4. Benefits strip
//     const afterBenefits = drawBenefitsStrip(ctx, afterSkills);

//     // 4.5 Compensation
//     const afterComp = drawCompensation(ctx, afterBenefits, job);

//     // 5. CTA banner
//     const afterCta = drawCtaBanner(ctx, afterComp);

//     // 6. Footer
//     drawFooter(ctx, afterCta);

//     return { success: true, buffer: canvas.toBuffer("image/png") };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

// module.exports = { renderJobPoster, POSTER_WIDTH, POSTER_HEIGHT, colors: { NAVY, ROYAL, WHITE, YELLOW, RED, PINK, ORANGE } };











































































































/**
 * Poster service — renders a premium, structured, Fortune-500-style
 * recruitment poster (1080x1920 / 9:16).
 *
 * FIX NOTES (why the old version overlapped):
 * 1. drawWrapped() never actually capped line count — it accepted a
 *    "maxLines" looking argument but never passed it into wrapText(),
 *    so long values (e.g. "Multiple SAP & Non-SAP Technologies")
 *    could wrap to 3+ lines and bleed into the row/section below.
 *    Some call sites even passed the number `2` into the `textAlign`
 *    slot by mistake, which did nothing useful.
 * 2. Section Y-positions were hardcoded guesses (e.g. main content
 *    started at a fixed 320 regardless of the hero box's real
 *    bottom edge at 334), so boxes silently overlapped by a few
 *    pixels to a few dozen pixels depending on content length.
 * 3. The skills-grid title pill pokes up 26px above its container,
 *    but no extra gap was reserved for that, so it could overlap
 *    the section above it.
 *
 * This version uses a single running cursor (`y`) with named gap
 * constants, and every section function takes a startY and returns
 * the exact endY it drew to, so nothing is ever eyeballed twice.
 */

const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { getCompanyColors } = require("../utils/jobPrompts");

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1920;
const PAD = 56;
const NAVY = "#071B4A";
const ROYAL = "#0B57D0";
const WHITE = "#FFFFFF";
const YELLOW = "#FFD400";
const RED = "#FF004C";
const PINK = "#FF0F6D";
const ORANGE = "#FF9D00";
const LIGHT_BLUE = "#EAF4FF";
const DIVIDER = "#E3E8EF";
const DARK_TEXT = "#16213E";
const GREY_TEXT = "#5A6478";

// Layout rhythm — one place to tune spacing for the whole poster.
const GAP = 28; // default breathing room between major sections
const PILL_ALLOWANCE = 34; // extra room reserved before a section whose title pill overhangs upward

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

// Wraps text to fit maxWidth, hard-capped at maxLines (ellipsizes the
// last line if content would overflow). This cap is what actually
// prevents runaway text from overlapping the next section.
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

// Draws wrapped text and returns { lines, height } so callers can
// reserve exactly the space that was actually used.
function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines, align = "left") {
  const lines = wrapText(ctx, text, maxWidth, maxLines);
  ctx.textAlign = align;
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return { lines: lines.length, height: lines.length * lineHeight };
}

// ---------------------------------------------------------------------------
// Icons (drawn with canvas primitives so they are crisp at any size)
// ---------------------------------------------------------------------------
function drawIcon(ctx, kind, cx, cy, size, color) {
  const s = size;
  const lw = Math.max(3, Math.round(s * 0.14));
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
      ctx.beginPath(); ctx.arc(cx, y + s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, y + s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, y + s * 0.6); ctx.lineTo(cx - s * 0.28, y + s * 0.95); ctx.lineTo(cx, y + s * 0.78); ctx.lineTo(cx + s * 0.28, y + s * 0.95); ctx.closePath(); ctx.stroke();
      break;
    }
    case "calendar": {
      ctx.strokeRect(x + s * 0.08, y + s * 0.14, s * 0.84, s * 0.72);
      ctx.beginPath(); ctx.moveTo(x + s * 0.08, y + s * 0.36); ctx.lineTo(x + s * 0.92, y + s * 0.36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.28, y + s * 0.06); ctx.lineTo(x + s * 0.28, y + s * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.72, y + s * 0.06); ctx.lineTo(x + s * 0.72, y + s * 0.28); ctx.stroke();
      break;
    }
    case "briefcase": {
      ctx.strokeRect(x + s * 0.1, y + s * 0.3, s * 0.8, s * 0.6);
      ctx.beginPath(); ctx.moveTo(x + s * 0.32, y + s * 0.3); ctx.lineTo(x + s * 0.32, y + s * 0.16); ctx.lineTo(x + s * 0.68, y + s * 0.16); ctx.lineTo(x + s * 0.68, y + s * 0.3); ctx.stroke();
      break;
    }
    case "shield": {
      ctx.beginPath(); ctx.moveTo(cx, y + s * 0.06); ctx.lineTo(x + s * 0.9, y + s * 0.28); ctx.lineTo(x + s * 0.9, y + s * 0.62); ctx.quadraticCurveTo(x + s * 0.9, y + s * 0.9, cx, y + s * 0.95); ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.9, x + s * 0.1, y + s * 0.62); ctx.lineTo(x + s * 0.1, y + s * 0.28); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.18, cy); ctx.lineTo(cx - s * 0.05, cy + s * 0.16); ctx.lineTo(cx + s * 0.2, cy - s * 0.16); ctx.stroke();
      break;
    }
    case "cart": {
      ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.12); ctx.lineTo(x + s * 0.24, y + s * 0.12); ctx.lineTo(x + s * 0.4, y + s * 0.62); ctx.lineTo(x + s * 0.78, y + s * 0.62); ctx.lineTo(x + s * 0.9, y + s * 0.26); ctx.lineTo(x + s * 0.3, y + s * 0.26); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + s * 0.42, y + s * 0.84, s * 0.1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + s * 0.72, y + s * 0.84, s * 0.1, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "gear": {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.26, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r1 = s * 0.42;
        const r2 = s * 0.28;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a + 0.3) * r2, cy + Math.sin(a + 0.3) * r2);
        ctx.lineTo(cx + Math.cos(a - 0.3) * r2, cy + Math.sin(a - 0.3) * r2);
        ctx.fill();
      }
      break;
    }
    case "chart": {
      ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.1, y + s * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.9, y + s * 0.9); ctx.stroke();
      ctx.fillRect(x + s * 0.2, y + s * 0.5, s * 0.16, s * 0.4);
      ctx.fillRect(x + s * 0.44, y + s * 0.3, s * 0.16, s * 0.6);
      ctx.fillRect(x + s * 0.68, y + s * 0.16, s * 0.16, s * 0.74);
      break;
    }
    case "pie": {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, y + s * 0.1); ctx.arc(cx, cy, s * 0.38, -Math.PI / 2, 0.4); ctx.closePath(); ctx.fill();
      break;
    }
    case "users": {
      ctx.beginPath(); ctx.arc(cx - s * 0.2, cy - s * 0.16, s * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + s * 0.2, cy - s * 0.16, s * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.06, cy + s * 0.42); ctx.quadraticCurveTo(cx - s * 0.2, cy + s * 0.08, cx, cy + s * 0.2); ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 0.08, x + s * 0.94, cy + s * 0.42); ctx.stroke();
      break;
    }
    case "desktop": {
      ctx.strokeRect(x + s * 0.08, y + s * 0.12, s * 0.84, s * 0.6);
      ctx.beginPath(); ctx.moveTo(cx, y + s * 0.72); ctx.lineTo(cx, y + s * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.9); ctx.lineTo(x + s * 0.7, y + s * 0.9); ctx.stroke();
      break;
    }
    case "document": {
      ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.08); ctx.lineTo(x + s * 0.65, y + s * 0.08); ctx.lineTo(x + s * 0.85, y + s * 0.28); ctx.lineTo(x + s * 0.85, y + s * 0.92); ctx.lineTo(x + s * 0.2, y + s * 0.92); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.36, y + s * 0.4); ctx.lineTo(x + s * 0.68, y + s * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.36, y + s * 0.58); ctx.lineTo(x + s * 0.68, y + s * 0.58); ctx.stroke();
      break;
    }
    case "cloud": {
      ctx.beginPath();
      ctx.arc(cx - s * 0.22, cy + s * 0.05, s * 0.18, Math.PI, Math.PI * 2);
      ctx.arc(cx, cy - s * 0.08, s * 0.22, Math.PI, Math.PI * 2);
      ctx.arc(cx + s * 0.22, cy + s * 0.03, s * 0.18, Math.PI, Math.PI * 2);
      ctx.lineTo(x + s * 0.9, cy + s * 0.3);
      ctx.lineTo(x + s * 0.1, cy + s * 0.3);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "growth": {
      ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.1, y + s * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.9, y + s * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.16, y + s * 0.7); ctx.lineTo(x + s * 0.42, y + s * 0.42); ctx.lineTo(x + s * 0.6, y + s * 0.56); ctx.lineTo(x + s * 0.84, y + s * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.62, y + s * 0.28); ctx.lineTo(x + s * 0.84, y + s * 0.28); ctx.lineTo(x + s * 0.84, y + s * 0.5); ctx.stroke();
      break;
    }
    case "trophy": {
      ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.1); ctx.lineTo(x + s * 0.8, y + s * 0.1); ctx.lineTo(x + s * 0.8, y + s * 0.4); ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.7, cx, y + s * 0.7); ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.7, x + s * 0.2, y + s * 0.4); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.1); ctx.lineTo(x + s * 0.05, y + s * 0.1); ctx.lineTo(x + s * 0.05, y + s * 0.26); ctx.quadraticCurveTo(x + s * 0.05, y + s * 0.4, x + s * 0.2, y + s * 0.42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.8, y + s * 0.1); ctx.lineTo(x + s * 0.95, y + s * 0.1); ctx.lineTo(x + s * 0.95, y + s * 0.26); ctx.quadraticCurveTo(x + s * 0.95, y + s * 0.4, x + s * 0.8, y + s * 0.42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, y + s * 0.7); ctx.lineTo(cx, y + s * 0.88); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.88); ctx.lineTo(x + s * 0.7, y + s * 0.88); ctx.stroke();
      break;
    }
    case "bubble": {
      roundedRect(ctx, x + s * 0.05, y + s * 0.05, s * 0.8, s * 0.6, s * 0.18);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.62); ctx.lineTo(x + s * 0.2, y + s * 0.9); ctx.lineTo(x + s * 0.5, y + s * 0.62); ctx.closePath(); ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.beginPath(); ctx.arc(cx - s * 0.16, cy, s * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.16, cy, s * 0.05, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

function drawCircleIcon(ctx, kind, cx, cy, size, color) {
  ctx.save();
  ctx.shadowColor = "rgba(11,87,208,0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawIcon(ctx, kind, cx, cy, size * 0.6, WHITE);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------
function drawBackground(ctx) {
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  const g = ctx.createRadialGradient(POSTER_WIDTH / 2, 400, 60, POSTER_WIDTH / 2, 400, 1000);
  g.addColorStop(0, "rgba(11,87,208,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  ctx.fillStyle = "rgba(11,87,208,0.18)";
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      ctx.beginPath();
      ctx.arc(40 + col * 22, 40 + row * 22, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "rgba(255,212,0,0.25)";
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      ctx.beginPath();
      ctx.arc(POSTER_WIDTH - 40 - col * 22, POSTER_HEIGHT - 40 - row * 22, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  strokeRoundedRect(ctx, 8, 8, POSTER_WIDTH - 16, POSTER_HEIGHT - 16, 24, "rgba(11,87,208,0.35)", 3);
}

// ---------------------------------------------------------------------------
// 1. Hero header — "WE ARE HIRING!" on the left, a large company
//    name block top-right (name, tagline, drive title, date pill
//    stacked underneath it) — returns bottom Y
// ---------------------------------------------------------------------------
function drawHeroHeader(ctx, job, startY) {
  const company = String(job.company || "Your Company").replace(" India", "");
  const role = String(job.title || job.role || "OPEN ROLE").toUpperCase();
  const tagline = job.tagline || "";
  const driveTitle = job.driveTitle || "HIRING DRIVE";
  const heroHeight = 340;
  const heroX = PAD;
  const heroY = startY;
  const heroW = POSTER_WIDTH - PAD * 2;
  const colors = getCompanyColors(job.company);
  const themePrimary = colors.primary || ROYAL;
  const themeSecondary = colors.secondary || NAVY;
  const rightEdge = heroX + heroW - 34;

  const heroGrad = ctx.createLinearGradient(0, heroY, 0, heroY + heroHeight);
  heroGrad.addColorStop(0, themePrimary);
  heroGrad.addColorStop(0.5, themePrimary);
  heroGrad.addColorStop(1, themeSecondary);
  ctx.save();
  ctx.shadowColor = "rgba(7,27,74,0.35)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  fillRoundedRect(ctx, heroX, heroY, heroW, heroHeight, 40, heroGrad);
  ctx.restore();
  strokeRoundedRect(ctx, heroX, heroY, heroW, heroHeight, 40, "rgba(255,255,255,0.18)", 2);

  // Left: WE ARE / HIRING! with role callout and join text.
  ctx.textAlign = "left";
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = WHITE;
  ctx.font = "900 74px 'Arial Black', Arial, sans-serif";
  ctx.fillText("WE ARE", heroX + 36, heroY + 100);
  ctx.font = "900 104px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = YELLOW;
  ctx.fillText("HIRING!", heroX + 36, heroY + 206);
  ctx.restore();

  const roleFont = "800 34px 'Arial Black', Arial, sans-serif";
  ctx.font = roleFont;
  const maxRoleWidth = Math.min(heroW - 260, 420);
  const roleLines = wrapText(ctx, role, maxRoleWidth, 2);
  const roleLineHeight = 38;
  const roleBgPaddingX = 18;
  const roleBgPaddingY = 14;
  const roleBgW = Math.max(
    Math.max(...roleLines.map((line) => ctx.measureText(line).width)) + roleBgPaddingX * 2,
    240
  );
  const roleBgH = Math.max(roleLines.length * roleLineHeight + roleBgPaddingY * 2, 58);
  const roleBgX = heroX + 30;
  const roleBgY = heroY + 220;
  const roleBg = ctx.createLinearGradient(roleBgX, roleBgY, roleBgX + roleBgW, roleBgY + roleBgH);
  roleBg.addColorStop(0, "rgba(255,255,255,0.24)");
  roleBg.addColorStop(1, "rgba(255,255,255,0.1)");
  fillRoundedRect(ctx, roleBgX, roleBgY, roleBgW, roleBgH, 24, roleBg);
  strokeRoundedRect(ctx, roleBgX, roleBgY, roleBgW, roleBgH, 24, "rgba(255,255,255,0.26)", 1);
  ctx.fillStyle = WHITE;
  ctx.textAlign = "left";
  ctx.font = roleFont;
  roleLines.forEach((line, index) => {
    ctx.fillText(line, roleBgX + roleBgPaddingX, roleBgY + roleBgPaddingY + (index + 1) * roleLineHeight - 8);
  });

  // Position a compact "Join our team." beside the role badge when space allows.
  const joinText = "Join our team.";
  ctx.font = "700 16px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.94)";

  const joinTextWidth = ctx.measureText(joinText).width;
  // prefer to the right of the role badge, vertically centered with it
  let joinX = roleBgX + roleBgW + 20;
  let joinY = roleBgY + roleBgH / 2 + 6;

  // if there's not enough room (collides with company block on right), fallback to right-aligned beside company
  if (joinX + joinTextWidth > rightEdge - 110) {
    // place it to the left of the company block, aligned to its left edge
    joinX = Math.max(roleBgX + roleBgW + 8, rightEdge - joinTextWidth - 20);
  }

  ctx.fillText(joinText, joinX, joinY);

  // subtle underline to reinforce callout (thin, semi-transparent)
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(joinX, joinY + 8);
  ctx.lineTo(joinX + joinTextWidth + 8, joinY + 8);
  ctx.stroke();

  // Right: big company name block aligned with WE ARE
  ctx.textAlign = "right";
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = WHITE;
  ctx.font = "900 66px 'Arial Black', Arial, sans-serif";
  const companyText = company.toUpperCase();
  const maxCompanyWidth = 340;
  let companyLines = [companyText];
  if (ctx.measureText(companyText).width > maxCompanyWidth) {
    const words = companyText.split(" ");
    if (words.length > 1) {
      const splitIndex = Math.ceil(words.length / 2);
      companyLines = [words.slice(0, splitIndex).join(" "), words.slice(splitIndex).join(" ")];
    }
  }
  companyLines.forEach((line, index) => {
    ctx.fillText(line, rightEdge, heroY + 100 + index * 70);
  });
  ctx.restore();

  let nextY = heroY + 100 + (companyLines.length - 1) * 70;
  if (tagline) {
    ctx.font = "700 20px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(tagline, rightEdge, nextY + 32);
    nextY += 32;
  }

  ctx.font = "900 26px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = YELLOW;
  ctx.fillText(driveTitle.toUpperCase(), rightEdge, nextY + 46);
  nextY += 46;

  const pillText = job.dateText || job.applicationText || "Online applications open";
  ctx.font = "700 17px Arial, sans-serif";
  const pw = ctx.measureText(pillText).width + 76;
  const ph = 44;
  const px = rightEdge - pw;
  const py = nextY + 26;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  fillRoundedRect(ctx, px, py, pw, ph, 22, WHITE);
  ctx.restore();
  drawIcon(ctx, "calendar", px + 26, py + ph / 2, 19, NAVY);
  ctx.fillStyle = NAVY;
  ctx.textAlign = "left";
  ctx.fillText(pillText, px + 48, py + 29);

  return heroY + heroHeight;
}

// ---------------------------------------------------------------------------
// 2. Main content: left info cards + right building image — returns bottom Y
// ---------------------------------------------------------------------------
async function drawMainContent(ctx, job, bgImage, startY) {
  const colors = getCompanyColors(job.company);
  const themePrimary = colors.primary || ROYAL;
  const themeSecondary = colors.secondary || NAVY;
  const accent = getAccentColor(themePrimary, themeSecondary);
  const leftW = 440;
  const rightX = PAD + leftW + 32;
  const rightW = POSTER_WIDTH - PAD - rightX - 6;
  const topY = startY;

  const rows = [
    { icon: "star", label: "ELIGIBILITY", value: job.eligibility || "Freshers & early careers welcome • Any degree pass-outs eligible" },
    { icon: "person", label: "EXPERIENCE", value: job.experience || "Freshers (0-2 years)" },
    { icon: "pin", label: "LOCATION", value: job.location || "India" },
    ...(job.driveDate ? [{ icon: "calendar", label: "DRIVE DATE", value: job.driveDate }] : []),
    { icon: "briefcase", label: "OPEN SKILLS", value: Array.isArray(job.skills) ? job.skills.join(", ") : job.skills || "Multiple roles available" },
  ];
  const MIN_ROW_H = 90;
  const VALUE_LINE_HEIGHT = 25;
  const VALUE_MAX_LINES = 6;
  const panelH = rows.length * 104 + 28;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 18;
  fillRoundedRect(ctx, PAD, topY - 8, leftW + 12, panelH, 26, WHITE);
  ctx.restore();

  let cursorY = topY;
  rows.forEach((row, i) => {
    // Clean, premium white row with subtle shadow for 3D effect
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.06)";
    ctx.shadowBlur = 12;
    fillRoundedRect(ctx, PAD + 6, cursorY + 6, leftW - 12, 92, 18, WHITE);
    ctx.restore();

    // Label (small) using theme primary for subtle branding
    ctx.fillStyle = themePrimary;
    ctx.font = "800 16px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(row.label, PAD + 78, cursorY + 30);

    // Value text (bold, dark) — wrapped and constrained
    ctx.fillStyle = DARK_TEXT;
    ctx.font = "900 24px 'Arial Black', Arial, sans-serif";
    drawWrapped(ctx, row.value, PAD + 78, cursorY + 54, leftW - 96, VALUE_LINE_HEIGHT, VALUE_MAX_LINES, "left");

    // Icon uses theme primary on a small white badge
    drawCircleIcon(ctx, row.icon, PAD + 36, cursorY + 52, 44, themePrimary);

    if (i < rows.length - 1) {
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD + 12, cursorY + 104);
      ctx.lineTo(PAD + leftW - 12, cursorY + 104);
      ctx.stroke();
    }

    cursorY += 104;
  });

  const contentH = cursorY - topY;

  // right column: building image
  const imgBoxY = topY;
  const imgH = contentH;
  ctx.save();
  ctx.shadowColor = "rgba(7,27,74,0.25)";
  ctx.shadowBlur = 18;
  fillRoundedRect(ctx, rightX + 6, imgBoxY - 6, rightW, imgH, 26, colors.secondary || NAVY);
  ctx.restore();

  ctx.save();
  roundedRect(ctx, rightX, imgBoxY, rightW, imgH, 22);
  ctx.clip();
  if (bgImage) {
    const scale = Math.max(rightW / bgImage.width, imgH / bgImage.height);
    const dw = bgImage.width * scale;
    const dh = bgImage.height * scale;
    ctx.drawImage(bgImage, rightX + (rightW - dw) / 2, imgBoxY + (imgH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = LIGHT_BLUE;
    ctx.fillRect(rightX, imgBoxY, rightW, imgH);
    for (let i = 0; i < 4; i++) {
      const bx = rightX + 30 + i * ((rightW - 60) / 4);
      const bh = 120 + (i % 3) * 40;
      fillRoundedRect(ctx, bx, imgBoxY + imgH - bh - 20, (rightW - 60) / 4 - 14, bh, 8, i % 2 ? "#7AA7E8" : ROYAL);
    }
  }
  const fade = ctx.createLinearGradient(0, imgBoxY + imgH * 0.6, 0, imgBoxY + imgH);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(7,27,74,0.35)");
  ctx.fillStyle = fade;
  ctx.fillRect(rightX, imgBoxY, rightW, imgH);
  ctx.restore();

  return topY + contentH;
}

function getAccentColor(primary, secondary) {
  const palette = ["#FFB600", "#FF6A00", "#FFC107", "#F9A825", "#FF7043", "#FFB74D"];
  if (!primary || !secondary) return palette[0];
  if (primary === "#2874F0" || primary === "#0C6BAA" || primary === "#4285F4") return "#FFC107";
  if (primary === "#1E3D6E" || primary === "#00338D" || primary === "#09091A") return "#FF7043";
  if (primary === "#A100FF" || primary === "#6A2C91" || primary === "#5F259F") return "#FFB74D";
  if (primary === "#FFE600" || primary === "#F80000" || primary === "#E23744") return "#00B8D4";
  return palette[Math.floor(Date.now() / 1000) % palette.length];
}

// ---------------------------------------------------------------------------
// 3. Skills grid (3x3) — returns bottom Y. Caller must add PILL_ALLOWANCE
//    to the gap before this section, since the title pill overhangs upward.
// ---------------------------------------------------------------------------
function drawSkillsGrid(ctx, job, startY) {
  const colors = getCompanyColors(job.company);
  const themePrimary = colors.primary || ROYAL;
  const themeSecondary = colors.secondary || NAVY;
  const gridW = POSTER_WIDTH - PAD * 2;
  const gridH = 292;
  const gridX = PAD;
  const gridY = startY;

  ctx.save();
  ctx.globalAlpha = 0.12;
  fillRoundedRect(ctx, gridX, gridY, gridW, gridH, 24, themePrimary);
  ctx.restore();
  strokeRoundedRect(ctx, gridX, gridY, gridW, gridH, 24, themePrimary, 2);

  ctx.save();
  ctx.shadowColor = "rgba(7,27,74,0.35)";
  ctx.shadowBlur = 10;
  fillRoundedRect(ctx, gridX + 40, gridY - 26, gridW - 80, 52, 26, themeSecondary);
  ctx.restore();
  ctx.fillStyle = WHITE;
  ctx.font = "900 24px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SKILLS WE ARE LOOKING FOR", POSTER_WIDTH / 2, gridY + 6);

// Allow dynamic skills from job.skills. The job object carries skills as a
  // comma-separated STRING (e.g. "Java, SQL, Spring Boot, AWS") — parse it
  // into an array. If job.skills is already an array, use it directly.
  // Only fall back to the SAP sample list when no skills are provided.
  const defaultSkills = [
    { name: "SAP GRC", sub: "Security", icon: "shield" },
    { name: "SAP WM", sub: "Warehouse", icon: "cart" },
    { name: "SAP FICO", sub: "Finance", icon: "chart" },
    { name: "SAP BW", sub: "Analytics", icon: "pie" },
    { name: "SAP CPI", sub: "Integration", icon: "gear" },
    { name: "Workday", sub: "HCM", icon: "users" },
    { name: "SAP EWM", sub: "Logistics", icon: "briefcase" },
    { name: "SAP SD", sub: "Sales", icon: "desktop" },
    { name: "Salesforce", sub: "CRM", icon: "cloud" },
  ];

  // Normalize job.skills (string OR array) into an array of trimmed names.
  let rawSkills = [];
  if (Array.isArray(job.skills)) {
    rawSkills = job.skills;
  } else if (typeof job.skills === "string" && job.skills.trim()) {
    rawSkills = job.skills.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (rawSkills.length === 0) rawSkills = defaultSkills;

  // icons rotate through a pool so every skill card still gets an icon
  const iconPool = ["shield", "cart", "gear", "chart", "pie", "users", "desktop", "document", "cloud"];
  const skills = rawSkills.slice(0, 9).map((s, index) => {
    if (typeof s === "string") return { name: s, sub: "", icon: iconPool[index % iconPool.length] };
    return { name: s.name || s.title || "Skill", sub: s.sub || s.subtitle || "", icon: s.icon || iconPool[index % iconPool.length] };
  });

  const cardGap = 12;
  const cardW = (gridW - 40 - cardGap * 2) / 3;
  const cardH = (gridH - 56 - cardGap * 2) / 3;
  skills.forEach((skill, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = gridX + 20 + col * (cardW + cardGap);
    const y = gridY + 36 + row * (cardH + cardGap);
    ctx.save();
    ctx.globalAlpha = 0.08;
    fillRoundedRect(ctx, x, y, cardW, cardH, 14, themePrimary);
    ctx.restore();
    strokeRoundedRect(ctx, x, y, cardW, cardH, 14, themeSecondary, 2);
    drawCircleIcon(ctx, skill.icon, x + 30, y + cardH / 2, 40, themePrimary);
    ctx.fillStyle = DARK_TEXT;
    ctx.font = "900 21px 'Arial Black', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(skill.name, x + 56, y + cardH / 2 - 4);
    ctx.fillStyle = GREY_TEXT;
    ctx.font = "700 14px Arial, sans-serif";
    if (skill.sub) ctx.fillText(String(skill.sub).toUpperCase(), x + 56, y + cardH / 2 + 16);
  });

  return gridY + gridH;
}

// ---------------------------------------------------------------------------
// 4. Benefits strip (4 columns) — returns bottom Y
// ---------------------------------------------------------------------------
function drawBenefitsStrip(ctx, startY, job) {
  const stripW = POSTER_WIDTH - PAD * 2;
  const stripH = 150;
  const stripX = PAD;
  const stripY = startY;
  const colors = getCompanyColors(job.company);
  const stripColor = colors.secondary || NAVY;

  ctx.save();
  ctx.shadowColor = "rgba(7,27,74,0.3)";
  ctx.shadowBlur = 16;
  fillRoundedRect(ctx, stripX, stripY, stripW, stripH, 24, stripColor);
  ctx.restore();

  const defaultBenefits = [
    { icon: "users", title: "Work with a Global Leader" },
    { icon: "growth", title: "Grow Your Career" },
    { icon: "gear", title: "Learn & Upskill Continuously" },
    { icon: "trophy", title: "Be Part of Something Big" },
  ];
  const benefits = Array.isArray(job.benefits) && job.benefits.length ? job.benefits.slice(0,4).map(b => (typeof b === 'string' ? { icon: 'dot', title: b } : { icon: b.icon || 'dot', title: b.title || b.text || '' })) : defaultBenefits;

  const colW = stripW / 4;
  benefits.forEach((b, i) => {
    const x = stripX + i * colW;
    const cx = x + colW / 2;
    drawIcon(ctx, b.icon, cx, stripY + 42, 36, WHITE);
    ctx.fillStyle = YELLOW;
    ctx.font = "900 18px 'Arial Black', Arial, sans-serif";
    // Capped at 3 lines and sized to the real column width (minus
    // inner padding) instead of a fixed 80px guess.
    drawWrapped(ctx, b.title, cx, stripY + 88, colW - 26, 22, 3, "center");
    if (i < 3) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + colW, stripY + 20);
      ctx.lineTo(x + colW, stripY + stripH - 20);
      ctx.stroke();
    }
  });

  return stripY + stripH;
}

// ---------------------------------------------------------------------------
// 5. Compensation panel — returns bottom Y
// ---------------------------------------------------------------------------
function drawCompensation(ctx, startY, job) {
  const w = POSTER_WIDTH - PAD * 2;
  const h = 130;
  const x = PAD;
  const y = startY;
  const colors = getCompanyColors(job.company);
  const themePrimary = colors.primary || ROYAL;
  const themeSecondary = colors.secondary || NAVY;

  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, themePrimary);
  g.addColorStop(1, themeSecondary);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 18;
  fillRoundedRect(ctx, x, y, w, h, 18, g);
  ctx.restore();

  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.font = "900 32px 'Arial Black', Arial, sans-serif";
  ctx.fillText("COMPENSATION PACKAGE", POSTER_WIDTH / 2, y + 42);

  // Use job.salaryRange when present (the real field from generateJobPost).
  const comp = job.salaryRange || job.compensation || "INR 3.5-6 LPA";
  ctx.fillStyle = YELLOW;
  ctx.font = "900 60px 'Arial Black', Arial, sans-serif";
  ctx.fillText(comp, POSTER_WIDTH / 2, y + 104);

  return y + h;
}

// ---------------------------------------------------------------------------
// 6. CTA banner — clean, icon-free gradient banner — returns bottom Y
// ---------------------------------------------------------------------------
function drawCtaBanner(ctx, startY) {
  const bW = POSTER_WIDTH - PAD * 2;
  const bH = 210;
  const bX = PAD;
  const bY = startY;

  ctx.save();
  ctx.shadowColor = "rgba(255,0,76,0.45)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  const grad = ctx.createLinearGradient(bX, 0, bX + bW, 0);
  grad.addColorStop(0, PINK);
  grad.addColorStop(0.5, RED);
  grad.addColorStop(1, ORANGE);
  fillRoundedRect(ctx, bX, bY, bW, bH, 26, grad);
  ctx.restore();

  const gloss = ctx.createLinearGradient(0, bY, 0, bY + bH);
  gloss.addColorStop(0, "rgba(255,255,255,0.22)");
  gloss.addColorStop(0.28, "rgba(255,255,255,0)");
  gloss.addColorStop(0.72, "rgba(0,0,0,0)");
  gloss.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = gloss;
  ctx.fillRect(bX, bY, bW, bH);

  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const cx = bX + bW / 2;

  ctx.font = "900 42px 'Arial Black', Arial, sans-serif";
  ctx.lineWidth = 9;
  ctx.strokeStyle = NAVY;
  ctx.strokeText("COMMENT", cx, bY + 62);
  ctx.fillStyle = WHITE;
  ctx.fillText("COMMENT", cx, bY + 62);

  ctx.font = "900 68px 'Arial Black', Arial, sans-serif";
  ctx.lineWidth = 11;
  ctx.strokeText("ANYTHING", cx, bY + 130);
  ctx.fillStyle = YELLOW;
  ctx.fillText("ANYTHING", cx, bY + 130);

  ctx.font = "900 42px 'Arial Black', Arial, sans-serif";
  ctx.lineWidth = 9;
  ctx.strokeText("FOR LINK", cx, bY + 190);
  ctx.fillStyle = WHITE;
  ctx.fillText("FOR LINK", cx, bY + 190);

  return bY + bH;
}

// ---------------------------------------------------------------------------
// 7. Footer — fills all remaining space down to the bottom margin
// ---------------------------------------------------------------------------
// Footer keeps a fixed, compact height regardless of how much room is
// left — any extra leftover space is added as breathing room *above*
// the footer (by the caller) instead of stretching the footer itself
// into an empty-looking bar.
const FOOTER_HEIGHT = 130;

function drawFooter(ctx, startY, job) {
  const fY = startY;
  const fH = FOOTER_HEIGHT;
  const colors = getCompanyColors(job.company);
  const footerColor = colors.secondary || NAVY;
  fillRoundedRect(ctx, 8, fY, POSTER_WIDTH - 16, fH, 22, footerColor);
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.font = "700 24px 'Arial Black', Arial, sans-serif";
  ctx.fillText("FOLLOW FOR DAILY VERIFIED JOB UPDATES", POSTER_WIDTH / 2, fY + 46);
  ctx.fillStyle = YELLOW;
  ctx.font = "900 22px Arial, sans-serif";
  ctx.fillText("•", POSTER_WIDTH / 2, fY + 76);
  ctx.fillStyle = WHITE;
  ctx.font = "700 24px 'Arial Black', Arial, sans-serif";
  ctx.fillText("SAVE & SHARE", POSTER_WIDTH / 2, fY + 106);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
async function renderJobPoster({ backgroundBuffer, job }) {
  try {
    const canvas = createCanvas(POSTER_WIDTH, POSTER_HEIGHT);
    const ctx = canvas.getContext("2d");

    let bgImage = null;
    if (backgroundBuffer) {
      try {
        bgImage = await loadImage(backgroundBuffer);
      } catch (_) {
        bgImage = null;
      }
    }

    drawBackground(ctx);

    // Single running cursor — every section reports back exactly
    // where it ended, so the next section's gap is always accurate.
    // Starting cursor moved down from 14 to 110: with all section
    // heights fixed, that shifts ~96px of the old "dead space before
    // the footer" up to the top instead, so top and bottom margins
    // read as balanced rather than "content glued to the top."
    let y = 110;
    y = drawHeroHeader(ctx, job, y);
    y = await drawMainContent(ctx, job, bgImage, y + GAP);
    y = drawSkillsGrid(ctx, job, y + GAP + PILL_ALLOWANCE);
    y = drawBenefitsStrip(ctx, y + GAP, job);
    y = drawCompensation(ctx, y + GAP, job);
    y = drawCtaBanner(ctx, y + GAP);

    // Any extra leftover space becomes gap *above* the footer (so the
    // footer stays a compact bar) rather than stretching the footer
    // itself into an empty-looking block.
const remaining = POSTER_HEIGHT - 8 - y;
    const footerGap = Math.max(GAP, remaining - FOOTER_HEIGHT);
    drawFooter(ctx, y + footerGap, job);

    return { success: true, buffer: canvas.toBuffer("image/png") };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { renderJobPoster, POSTER_WIDTH, POSTER_HEIGHT, colors: { NAVY, ROYAL, WHITE, YELLOW, RED, PINK, ORANGE } };