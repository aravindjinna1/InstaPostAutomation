# Automated Instagram Daily Poster — System Design

## 1. Overview

A MERN-based system that automatically generates an AI image + caption every day and publishes it to a single Instagram Business account, orchestrated via LangGraph and scheduled via a cron job.

**Stack**
- **Frontend**: React (dashboard — view/manage scheduled & posted content, connect IG account)
- **Backend**: Node.js + Express (API routes, orchestration trigger, token management)
- **Database**: MongoDB (accounts, posts, logs)
- **Orchestration**: LangGraph (AI generation + publish pipeline as a graph of nodes)
- **Storage**: Cloudinary/S3 (public image hosting, required by Instagram API)
- **External APIs**: Instagram Graph API (Meta), Gemini API (image + caption generation)
- **Scheduler**: node-cron / Agenda.js

---

## 2. High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["React Frontend"]
        UI[Dashboard UI]
    end

    subgraph Server["Node.js / Express Backend"]
        API[REST API Routes]
        CRON[Cron Scheduler]
        LG[LangGraph Orchestrator]
        TOKSVC[Token Refresh Service]
    end

    subgraph DB["MongoDB"]
        AccountsCol[(Accounts)]
        PostsCol[(Posts)]
        LogsCol[(Logs)]
    end

    subgraph External["External Services"]
        GEMINI[Gemini API - Image + Caption]
        CLOUD[Cloudinary / S3 - Public Image Host]
        META[Instagram Graph API]
    end

    UI -->|REST calls| API
    API --> AccountsCol
    API --> PostsCol
    API --> LogsCol

    CRON -->|triggers daily| LG
    LG -->|generate caption + image| GEMINI
    LG -->|upload image| CLOUD
    LG -->|create + publish media| META
    LG -->|write result| LogsCol
    LG -->|read/write status| PostsCol

    TOKSVC -->|refresh long-lived token| META
    TOKSVC --> AccountsCol
```

---

## 3. LangGraph Pipeline (Node Flow)

```mermaid
flowchart LR
    START([Cron Trigger - Daily]) --> N1[Generate Caption]
    N1 --> N2[Generate Image]
    N2 --> N3[Upload Image to Cloudinary]
    N3 --> N4[Create IG Media Container]
    N4 --> N5{Container Status?}
    N5 -->|IN_PROGRESS| WAIT[Wait / Poll]
    WAIT --> N5
    N5 -->|FINISHED| N6[Publish to Instagram]
    N5 -->|ERROR| FAIL1[Log Failure]
    N6 --> N7{Publish Success?}
    N7 -->|Yes| LOG_OK[Log Success + IG Media ID]
    N7 -->|No, retryable| RETRY[Retry with Backoff]
    RETRY --> N6
    N7 -->|No, fatal| FAIL2[Log Failure + Alert]
    LOG_OK --> END([Done])
    FAIL1 --> END
    FAIL2 --> END
```

---

## 4. Sequence Diagram — End-to-End Daily Post

```mermaid
sequenceDiagram
    participant Cron
    participant LangGraph as LangGraph Orchestrator
    participant Gemini as Gemini API
    participant Cloud as Cloudinary
    participant Meta as Instagram Graph API
    participant Mongo as MongoDB

    Cron->>LangGraph: trigger daily run
    LangGraph->>Gemini: generate caption (prompt)
    Gemini-->>LangGraph: caption text
    LangGraph->>Gemini: generate image (prompt)
    Gemini-->>LangGraph: image binary/URL
    LangGraph->>Cloud: upload image
    Cloud-->>LangGraph: public image URL
    LangGraph->>Meta: POST /{ig-user-id}/media (image_url, caption)
    Meta-->>LangGraph: creation_id
    loop poll until ready
        LangGraph->>Meta: GET /{creation_id}?fields=status_code
        Meta-->>LangGraph: IN_PROGRESS / FINISHED
    end
    LangGraph->>Meta: POST /{ig-user-id}/media_publish (creation_id)
    Meta-->>LangGraph: ig_media_id
    LangGraph->>Mongo: save Post{status: posted, igMediaId}
    LangGraph->>Mongo: save Log{success, timestamps}
```

---

## 5. Instagram OAuth / Token Setup Flow (one-time + refresh)

```mermaid
sequenceDiagram
    participant User
    participant React as React Frontend
    participant Express as Express Backend
    participant Meta as Meta Graph API
    participant Mongo as MongoDB

    User->>React: Click "Connect Instagram"
    React->>Meta: Redirect to OAuth consent
    Meta-->>React: redirect back with auth code
    React->>Express: send auth code
    Express->>Meta: exchange code for short-lived token
    Meta-->>Express: short-lived user token
    Express->>Meta: exchange for long-lived token (60 days)
    Meta-->>Express: long-lived token
    Express->>Meta: GET /me/accounts (Page ID + Page token)
    Meta-->>Express: page data
    Express->>Meta: GET /{page-id}?fields=instagram_business_account
    Meta-->>Express: IG Business Account ID
    Express->>Mongo: store encrypted token + IG account ID

    Note over Express,Meta: Weekly cron job refreshes token before 60-day expiry
    Express->>Meta: refresh long-lived token
    Meta-->>Express: new token + new expiry
    Express->>Mongo: update stored token
```

---

## 6. Data Model (ER Diagram)

```mermaid
erDiagram
    ACCOUNT {
        ObjectId _id
        string igUserId
        string pageAccessToken
        date tokenExpiresAt
        string igUsername
        date createdAt
    }

    POST {
        ObjectId _id
        ObjectId accountId
        string caption
        string imageUrl
        string igCreationId
        string igMediaId
        string status
        date scheduledTime
        date publishedAt
    }

    LOG {
        ObjectId _id
        ObjectId postId
        string stage
        string status
        string message
        date timestamp
    }

    ACCOUNT ||--o{ POST : owns
    POST ||--o{ LOG : generates
```

---

## 7. MongoDB Collections (Schema Summary)

**accounts**
| Field | Type | Notes |
|---|---|---|
| igUserId | String | Instagram Business Account ID |
| pageAccessToken | String (encrypted) | AES-encrypted at rest |
| tokenExpiresAt | Date | Used by refresh cron |
| igUsername | String | Display only |

**posts**
| Field | Type | Notes |
|---|---|---|
| accountId | ObjectId (ref Account) | |
| caption | String | AI-generated |
| imageUrl | String | Cloudinary public URL |
| igCreationId | String | From media container step |
| igMediaId | String | Final published media ID |
| status | Enum | `pending / processing / posted / failed` |
| scheduledTime | Date | When cron should run it |
| publishedAt | Date | Set on success |

**logs**
| Field | Type | Notes |
|---|---|---|
| postId | ObjectId (ref Post) | |
| stage | String | e.g. `caption_gen`, `image_gen`, `publish` |
| status | Enum | `success / failure` |
| message | String | Error detail or confirmation |

---

## 8. REST API Routes

```mermaid
flowchart LR
    subgraph Auth
        A1["GET /api/auth/instagram"]
        A2["GET /api/auth/instagram/callback"]
    end
    subgraph Posts
        P1["POST /api/posts/run-now"]
        P2["GET /api/posts"]
        P3["GET /api/posts/:id"]
        P4["DELETE /api/posts/:id"]
    end
    subgraph Accounts
        AC1["GET /api/account"]
        AC2["POST /api/account/refresh-token"]
    end
```

---

## 9. Failure Handling & Retry Strategy

| Failure Point | Strategy |
|---|---|
| Gemini image/caption generation fails | Retry 2x with backoff → fallback to template caption/stock image |
| Cloudinary upload fails | Retry 2x → fail run, log, alert |
| IG container stuck `IN_PROGRESS` | Poll every 5s, timeout after 60s → fail run |
| IG publish returns rate-limit error | Backoff + retry once after delay |
| Access token expired | Auto-refresh job runs before 60-day expiry; if refresh fails, alert to reconnect account manually |

---

## 10. Deployment View

```mermaid
flowchart TB
    subgraph Client Side
        Browser[User Browser - React App]
    end
    subgraph Hosting
        FE[Frontend Host - Vercel/Netlify]
        BE[Backend Host - Render/Railway/EC2]
        CronJob[Cron Job - node-cron inside BE or external scheduler]
    end
    subgraph Data
        MongoAtlas[(MongoDB Atlas)]
    end
    subgraph Third Party
        MetaAPI[Instagram Graph API]
        GeminiAPI[Gemini API]
        CloudinaryS[Cloudinary]
    end

    Browser --> FE
    FE --> BE
    BE --> MongoAtlas
    CronJob --> BE
    BE --> MetaAPI
    BE --> GeminiAPI
    BE --> CloudinaryS
```

---

## 11. Build Milestones

1. Meta App setup + manual test post via Postman (validate credentials work)
2. Express backend: MongoDB models + Instagram service (auth, media container, publish, polling)
3. AI service module: caption generation + image generation (standalone tested)
4. Cloudinary upload service
5. LangGraph pipeline wiring all nodes together with retry/error edges
6. Cron trigger for daily automated run
7. React dashboard: connect account, view post history/logs, manual "run now" trigger
8. Token refresh cron job