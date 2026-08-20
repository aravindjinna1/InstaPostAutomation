const axios = require("axios");
const { IG_GRAPH_BASE_URL } = require("../config/instagram");

const BASE = IG_GRAPH_BASE_URL;

// Comfortable target below Instagram's 2200-char limit. Kept in sync with the
// value used by the caption builder so publishing never fails on length.
const MAX_CAPTION_LENGTH = 1500;

// ---------------------------------------------------------------------------
// Redaction + logging helpers
// ---------------------------------------------------------------------------

/** Redacts Instagram/IG token-shaped strings in a value (best-effort). */
function redactString(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\b(IGAA[A-Za-z0-9_-]+|EAAB[A-Za-z0-9_-]+|IG[0-9]{5,})\b/g, "[REDACTED]");
}

/**
 * Deep-copies an object and masks known secret keys (access_token, client_secret,
 * etc.) plus token-shaped string values, so logs never leak credentials.
 */
function redactSecrets(value, key = "") {
  const k = String(key).toLowerCase();
  if (/(^|_)(token|secret|password|key|authorization)(_|$)/i.test(k)) {
    if (typeof value === "string" && value) return "[REDACTED]";
  }
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k2, v2] of Object.entries(value)) {
      out[k2] = redactSecrets(v2, k2);
    }
    return out;
  }
  return redactString(value);
}

/** Builds a compact, sanitized log line for a stage transition. */
function logStage(stage, httpStatus, extra) {
  const safeExtra = {};
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      safeExtra[k] = redactSecrets(v);
    }
  }
  const line = [`stage=${stage}`, `http=${httpStatus || "n/a"}`];
  for (const [k, v] of Object.entries(safeExtra)) {
    if (v !== undefined && v !== null) {
      line.push(`${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    }
  }
  console.log(`[IG] ${line.join(" ")}`);
}

/**
 * Validates the caption BEFORE an API request. Returns an error string when the
 * caption is missing or exceeds the length limit, otherwise null. Publishing is
 * never attempted when this returns an error.
 */
function captionError(caption) {
  if (typeof caption !== "string" || !caption.trim()) {
    return "Caption is empty.";
  }
  if (caption.length > MAX_CAPTION_LENGTH) {
    return "The caption was too long.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// STEP 1: Create the media container (does NOT publish yet)
// ---------------------------------------------------------------------------

/**
 * STEP 1: Create a media container.
 * Instagram needs the image already hosted at a public URL (Cloudinary etc.).
 * This does NOT publish yet — it just prepares the post and returns a creation_id.
 * HTTP 200 alone is NOT success: the response must include a valid creation id.
 */
async function createMediaContainer({ igUserId, accessToken, imageUrl, caption }) {
  const captionErr = captionError(caption);
  if (captionErr) {
    logStage("caption", "n/a", { error: captionErr });
    return { success: false, stage: "caption", error: captionErr };
  }

  try {
    const response = await axios.post(`${BASE}/${igUserId}/media`, null, {
      params: {
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      },
      timeout: 90000,
    });

    const creationId = response.data?.id;
    logStage("media_container", response.status, { creationId, response_data: { id: creationId } });

    if (!creationId) {
      return { success: false, stage: "media_container", error: "Instagram returned no media id" };
    }
    return { success: true, creationId };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    const http = err.response?.status;
    logStage("media_container", http, { error: msg });
    return { success: false, stage: "media_container", error: msg };
  }
}
/**
 * STEP 1 (Reels): Create a REELS media container.
 * Reels require a VIDEO hosted at a public URL. Local audio is embedded
 * directly inside that MP4 by videoService. `audio_name` is only used when
 * explicitly targeting a track in Instagram's own catalog.
 */
async function createReelsContainer({
  igUserId,
  accessToken,
  videoUrl,
  caption,
  audioName,
  audioAssetId,
}) {
  const captionErr = captionError(caption);
  if (captionErr) {
    logStage("caption", "n/a", { error: captionErr });
    return { success: false, stage: "caption", error: captionErr };
  }

  try {
    const params = {
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: "true",
      access_token: accessToken,
    };

    // Attach Instagram's licensed music. Prefer an explicit audio asset ID when
    // available, otherwise pass the best matching track name from the IG catalog.
    if (audioAssetId) {
      params.audio_asset_id = audioAssetId;
    } else if (audioName) {
      params.audio_name = audioName;
    }

    const response = await axios.post(`${BASE}/${igUserId}/media`, null, {
      params,
      timeout: 90000,
    });

    const creationId = response.data?.id;
    logStage("media_container", response.status, { mediaType: "REELS", creationId });

    if (!creationId) {
      return { success: false, stage: "media_container", error: "Instagram returned no media id" };
    }
    return { success: true, creationId };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    const http = err.response?.status;
    logStage("media_container", http, { error: msg });
    return { success: false, stage: "media_container", error: msg };
  }
}

// ---------------------------------------------------------------------------
// STEP 2: Check container status (async image/video processing)
// ---------------------------------------------------------------------------

/**
 * STEP 2: Check container status.
 * Instagram processes media asynchronously — it is not instantly publishable.
 * Status codes: IN_PROGRESS, FINISHED, ERROR, EXPIRED, PUBLISHED.
 * HTTP 200 alone is NOT success here; the status_code must be validated.
 */
async function checkContainerStatus({ creationId, accessToken }) {
  try {
    const response = await axios.get(`${BASE}/${creationId}`, {
      params: {
        fields: "status_code",
        access_token: accessToken,
      },
      timeout: 30000,
    });

    const status = response.data?.status_code;
    logStage("container_status", response.status, { creationId, status_code: status });

    if (!status) {
      return { success: false, error: "Instagram returned no status_code" };
    }
    return { success: true, status };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    const http = err.response?.status;
    logStage("container_status", http, { creationId, error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Polls container status until it's FINISHED, ERRORs out, or times out.
 * Instagram's docs recommend polling rather than assuming it's instant.
 */
async function waitForContainerReady({
  creationId,
  accessToken,
  intervalMs = 5000,
  timeoutMs = 60000,
}) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await checkContainerStatus({ creationId, accessToken });

    if (!result.success) {
      return { success: false, error: result.error, creationId };
    }

    if (result.status === "FINISHED") {
      return { success: true, status: result.status, creationId };
    }

    if (result.status === "ERROR" || result.status === "EXPIRED") {
      return { success: false, error: `Container status: ${result.status}`, creationId };
    }

    // still IN_PROGRESS - wait and check again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { success: false, error: "Timed out waiting for container to be ready", creationId };
}
// ---------------------------------------------------------------------------
// STEP 3: Publish the container (actually posts it live)
// ---------------------------------------------------------------------------

/**
 * STEP 3: Publish the container to post it live on Instagram.
 * Publishing only succeeds when a valid Instagram media id is returned.
 */
async function publishMedia({ igUserId, accessToken, creationId }) {
  try {
    const response = await axios.post(`${BASE}/${igUserId}/media_publish`, null, {
      params: {
        creation_id: creationId,
        access_token: accessToken,
      },
      timeout: 90000,
    });

    const igMediaId = response.data?.id;
    logStage("media_publish", response.status, { creation_id: creationId, id: igMediaId });

    if (!igMediaId) {
      return { success: false, error: "Instagram publish returned no media id" };
    }
    return { success: true, igMediaId };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    const http = err.response?.status;
    logStage("media_publish", http, { creationId, error: msg });
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Full end-to-end flows (create -> wait -> publish)
// ---------------------------------------------------------------------------

/**
 * Full end-to-end flow: create container -> wait until ready -> publish.
 * Only returns success:true after publishMedia yields a real Instagram media id.
 */
async function postImageToInstagram({ igUserId, accessToken, imageUrl, caption }) {
  const captionErr = captionError(caption);
  if (captionErr) {
    return { success: false, stage: "caption", error: captionErr };
  }

  const containerResult = await createMediaContainer({
    igUserId,
    accessToken,
    imageUrl,
    caption,
  });

  if (!containerResult.success) {
    return { success: false, stage: containerResult.stage || "media_container", error: containerResult.error };
  }

  const readyResult = await waitForContainerReady({
    creationId: containerResult.creationId,
    accessToken,
  });

  if (!readyResult.success) {
    return { success: false, stage: "media_container", error: readyResult.error };
  }

  const publishResult = await publishMedia({
    igUserId,
    accessToken,
    creationId: containerResult.creationId,
  });

  if (!publishResult.success) {
    return { success: false, stage: "media_publish", error: publishResult.error };
  }

  return {
    success: true,
    creationId: containerResult.creationId,
    igMediaId: publishResult.igMediaId,
  };
}

/**
 * Full end-to-end flow for publishing a REEL:
 * create REELS container (video) -> wait until ready -> publish.
 */
async function postReelToInstagram({
  igUserId,
  accessToken,
  videoUrl,
  caption,
  audioName,
}) {
  const captionErr = captionError(caption);
  if (captionErr) {
    return { success: false, stage: "caption", error: captionErr };
  }

  const containerResult = await createReelsContainer({
    igUserId,
    accessToken,
    videoUrl,
    caption,
    audioName,
  });

  if (!containerResult.success) {
    return { success: false, stage: containerResult.stage || "media_container", error: containerResult.error };
  }

  // Reels containers can take longer to process - give it more time
  const readyResult = await waitForContainerReady({
    creationId: containerResult.creationId,
    accessToken,
    intervalMs: 8000,
    timeoutMs: 180000,
  });

  if (!readyResult.success) {
    return { success: false, stage: "media_container", error: readyResult.error };
  }

  const publishResult = await publishMedia({
    igUserId,
    accessToken,
    creationId: containerResult.creationId,
  });

  if (!publishResult.success) {
    return { success: false, stage: "media_publish", error: publishResult.error };
  }

  return {
    success: true,
    creationId: containerResult.creationId,
    igMediaId: publishResult.igMediaId,
  };
}

module.exports = {
  createMediaContainer,
  createReelsContainer,
  checkContainerStatus,
  waitForContainerReady,
  publishMedia,
  postImageToInstagram,
  postReelToInstagram,
  MAX_CAPTION_LENGTH,
};