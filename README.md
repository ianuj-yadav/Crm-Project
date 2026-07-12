# AURA CRM - Reply-Intent Operations Demo

A complete vanilla HTML, CSS, JavaScript, and Node.js prototype for the AI/ML Challenge Option B. It classifies creator replies, records every operational decision in PostgreSQL, drafts campaign-grounded responses, and routes uncertain cases to a human review queue.

## What It Demonstrates

- Five intent categories: `interested`, `not_interested`, `pricing_query`, `availability_query`, and `unclear`.
- A hybrid reliability pipeline: deterministic rules first, NVIDIA Nemotron adjudication for uncertain or compound replies, strict JSON validation, and a grounded fallback.
- PostgreSQL auditability for replies, classifications, AI generations, manager overrides, simulated CRM actions, batches, campaign knowledge, and timelines.
- A complete demo UI: live inbox, human review queue, campaign knowledge editor, analytics, batch analysis, evaluation, and integration architecture.

## Setup

Requirements: Node.js 18+ and a reachable PostgreSQL database. Docker is not required.

```powershell
npm install
Copy-Item .env.example .env.local
```

Set `DATABASE_URL` in `.env.local` with your private PostgreSQL connection string. For a managed provider, set `PGSSL=true`.

Run migrations and seed data:

```powershell
npm run migrate
npm run seed
npm start
```

Open `http://localhost:3000`.

## Database Commands

```powershell
npm run migrate        # applies versioned SQL migrations
npm run seed           # inserts demo campaigns, knowledge, creators, and replies
npm run import-legacy  # imports the old JSON store once when present
npm run test:db        # runs only when DATABASE_URL_TEST is configured
```

The app never commits database credentials. `.env.local` is ignored by Git.

## AI Reliability

The rules engine always produces an immediate candidate label. The provider is used only for unclear, low-confidence, conflicting, or multi-question messages. Provider output must be valid JSON with one allowed intent, a 0-1 confidence score, concise rationale, message signals, and an ambiguity flag. Invalid or unavailable provider output falls back to deterministic classification.

Only high-confidence, non-ambiguous replies receive a simulated CRM action. All other replies enter the review queue. Generated answer evidence is saved, but hidden model reasoning and secrets are never stored.

To enable NVIDIA Nemotron, add `NVIDIA_API_KEY` to `.env.local`. Without it, the grounded local engine remains available.

## Deploying to Render

The repository includes [`render.yaml`](render.yaml) for a Render web service. In Render, choose **New +** > **Blueprint**, select this GitHub repository, and create the `aura-crm-reply-intent` service.

Before the first deploy, add these service environment variables in Render:

- `DATABASE_URL`: private PostgreSQL connection string.
- `PGSSL=true`: enables TLS for managed PostgreSQL providers.
- `NVIDIA_API_KEY`: optional. The application remains functional with its deterministic grounded fallback when this is not configured.

Render runs `npm install`, starts the service with `npm start`, then checks `/api/v1/health`. The server runs migrations and idempotent seed data on startup.

## Deploying to Vercel

The repository includes [`vercel.json`](vercel.json) and exports a compatible request handler from [`server.js`](server.js). Import `ianuj-yadav/Crm-Project` in Vercel, select the default branch, and keep the framework preset set to **Other**. No custom build command is needed.

Add these Vercel environment variables before deploying to production:

- `DATABASE_URL`: private PostgreSQL connection string.
- `PGSSL=true`: enables TLS for the managed database.
- `NVIDIA_API_KEY`: optional. Without it, the deterministic grounded classifier and draft flow remain available.

The deployed health endpoint is `/api/v1/health`. Vercel routes requests through [`server.js`](server.js), which automatically applies migrations and idempotent seed data on startup.

## API Highlights

- `POST /api/v1/classify` - persist, classify, ground, draft, and audit one reply.
- `POST /api/v1/webhook/reply` - simulated inbound provider webhook with the same persistence path.
- `GET /api/v1/replies?review=true` - persisted reply history and queue filters.
- `GET /api/v1/review-queue` - manager review worklist.
- `PATCH /api/v1/replies/:id/override` - records a human correction for active learning.
- `GET /api/v1/replies/:id/timeline` - classifications, generations, actions, reviews, and audits.
- `GET /api/v1/analytics` - intent distribution, confidence bands, review count, and overrides.
- `GET|POST /api/v1/campaigns/:id/knowledge` - campaign facts used to ground answers.

## Evaluation

```powershell
npm test
```

This regenerates the committed held-out predictions, metrics, and error analysis in `eval_results/`

## Data Retention

The demo stores operational messages and decisions in PostgreSQL. Before production use, add retention rules, user authentication, role-based access, encryption-at-rest review, and integrations with agency-approved email and social platforms.
