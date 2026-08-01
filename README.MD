# IG Auto Poster Backend

Backend for an automated Instagram poster that generates a daily image and caption, uploads the image, and publishes it to one Instagram Business or Creator account using Instagram Login.

## Overview

- Generates captions and images with Gemini
- Uploads images to Cloudinary
- Publishes posts through the Instagram Graph API
- Refreshes long-lived Instagram tokens on a cron schedule
- Stores account tokens encrypted in MongoDB

## Stack

- Node.js + Express
- MongoDB + Mongoose
- LangGraph
- Gemini API
- Cloudinary
- Instagram API with Instagram Login

## How It Works

1. The user opens `GET /api/auth/instagram`
2. The backend redirects to `https://www.instagram.com/oauth/authorize`
3. Instagram returns an OAuth `code` to `GET /api/auth/instagram/callback`
4. The backend exchanges that code for a short-lived token, then a long-lived token
5. The backend encrypts and stores `igUserId`, `accessToken`, and `tokenExpiresAt`
6. The daily cron job generates content and publishes the post
7. The token refresh cron job renews long-lived tokens before expiry

## Setup Requirements

- The Instagram account must be Business or Creator
- The Meta Developer App must use the Instagram product
- In Meta, choose `API setup with Instagram login`
- No Facebook Page is required
- No Facebook Login is used at any step

## Local Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Fill in the Instagram, Gemini, Cloudinary, MongoDB, and token encryption values
4. Start the server with `npm run dev`

## API Routes

- `GET /api/auth/instagram`
- `GET /api/auth/instagram/callback`
- `GET /api/account`
- `POST /api/posts/run-now`
- `GET /api/posts`
- `GET /api/posts/:id`
- `DELETE /api/posts/:id`

## Key Files

- [`src/config/instagram.js`](src/config/instagram.js) - Instagram API config and env vars
- [`src/services/instagramAuthService.js`](src/services/instagramAuthService.js) - OAuth exchange and token refresh
- [`src/services/instagramService.js`](src/services/instagramService.js) - Create media container, poll status, publish media
- [`src/controllers/authController.js`](src/controllers/authController.js) - Connect flow and account upsert
- [`src/controllers/tokenController.js`](src/controllers/tokenController.js) - Weekly token refresh logic
- [`src/models/Account.js`](src/models/Account.js) - Connected account schema
- [`src/cron/scheduler.js`](src/cron/scheduler.js) - Daily post trigger and token refresh cron jobs
- [`src/graph/postPipeline.js`](src/graph/postPipeline.js) - AI generation and publish pipeline

## Data Model

### Account

| Field | Type | Notes |
| --- | --- | --- |
| `igUserId` | String | Instagram user ID returned by Instagram Login |
| `igUsername` | String | Display only |
| `accessToken` | String | Encrypted long-lived Instagram token |
| `tokenExpiresAt` | Date | Token expiry timestamp |
| `isActive` | Boolean | Whether the account is used for auto-posting |

### Post

| Field | Type | Notes |
| --- | --- | --- |
| `accountId` | ObjectId | Refers to `Account` |
| `caption` | String | AI-generated caption |
| `imageUrl` | String | Public Cloudinary image URL |
| `igCreationId` | String | Media container ID |
| `igMediaId` | String | Published Instagram media ID |
| `status` | String | `pending`, `processing`, `posted`, or `failed` |
| `scheduledTime` | Date | Time the post was scheduled |
| `publishedAt` | Date | Set when publish succeeds |
| `errorMessage` | String | Populated when a run fails |

### Log

| Field | Type | Notes |
| --- | --- | --- |
| `postId` | ObjectId | Refers to `Post` |
| `stage` | String | Pipeline stage name |
| `status` | String | `success` or `failure` |
| `message` | String | Human-readable details |

## Environment Variables

```env
# --- Server ---
PORT=5000
NODE_ENV=development

# --- MongoDB ---
MONGO_URI=mongodb://localhost:27017/perplexity

# --- Token Encryption ---
TOKEN_ENCRYPTION_KEY=

# --- Instagram Login ---
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=http://localhost:5000/api/auth/instagram/callback

# --- Gemini API ---
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# --- Cloudinary ---
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# --- Scheduler ---
DAILY_POST_CRON=0 9 * * *
TOKEN_REFRESH_CRON=0 3 * * 1
```

## Manual Instagram Setup

1. Create or open your Meta Developer App
2. Add the Instagram product
3. Choose `API setup with Instagram login`
4. Confirm the Instagram account is Business or Creator
5. Copy the App ID and App Secret into `.env`
6. Make sure `INSTAGRAM_REDIRECT_URI` matches the redirect URI in the app settings exactly

## Legacy Data Note

If your MongoDB still has accounts created under the old Page-based flow, they are not compatible with the current schema. Delete those legacy documents and reconnect the account through `GET /api/auth/instagram`.
