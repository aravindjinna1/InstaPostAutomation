const axios = require("axios");
const { IG_GRAPH_BASE_URL } = require("../config/instagram");

const BASE = IG_GRAPH_BASE_URL;

/**
 * STEP 1: Create a media container.
 * Instagram needs the image already hosted at a public URL (Cloudinary etc.)
 * This does NOT publish yet - it just prepares the post and returns a creation_id.
 */
async function createMediaContainer({ igUserId, accessToken, imageUrl, caption }) {
  try {
    const response = await axios.post(`${BASE}/${igUserId}/media`, null, {
      params: {
        image_url: imageUrl,
        caption: caption,
        access_token: accessToken,
      },
    });

    // response.data.id is the creation_id we need for the next steps
    return { success: true, creationId: response.data.id };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

/**
 * STEP 2: Check container status.
 * Instagram processes the image asynchronously - it's not always
 * instantly ready to publish. Status is one of:
 * IN_PROGRESS, FINISHED, ERROR, EXPIRED, PUBLISHED
 */
async function checkContainerStatus({ creationId, accessToken }) {
  try {
    const response = await axios.get(`${BASE}/${creationId}`, {
      params: {
        fields: "status_code",
        access_token: accessToken,
      },
    });

    return { success: true, status: response.data.status_code };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

/**
 * Polls container status until it's FINISHED, ERRORs out, or times out.
 * Instagram's own docs recommend polling rather than assuming it's instant.
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
      return { success: false, error: result.error };
    }

    if (result.status === "FINISHED") {
      return { success: true };
    }

    if (result.status === "ERROR" || result.status === "EXPIRED") {
      return { success: false, error: `Container status: ${result.status}` };
    }

    // still IN_PROGRESS - wait and check again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { success: false, error: "Timed out waiting for container to be ready" };
}

/**
 * STEP 3: Publish the container to actually post it live on Instagram.
 */
async function publishMedia({ igUserId, accessToken, creationId }) {
  try {
    const response = await axios.post(`${BASE}/${igUserId}/media_publish`, null, {
      params: {
        creation_id: creationId,
        access_token: accessToken,
      },
    });

    return { success: true, igMediaId: response.data.id };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

/**
 * Full end-to-end flow: create container -> wait until ready -> publish.
 * This is the single function the LangGraph "publish" node will call.
 */
async function postImageToInstagram({ igUserId, accessToken, imageUrl, caption }) {
  const containerResult = await createMediaContainer({
    igUserId,
    accessToken,
    imageUrl,
    caption,
  });

  if (!containerResult.success) {
    return { success: false, stage: "media_container", error: containerResult.error };
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

module.exports = {
  createMediaContainer,
  checkContainerStatus,
  waitForContainerReady,
  publishMedia,
  postImageToInstagram,
};
