# AURA CRM - Reply-Intent Classifier

Standalone prototype for the **AI/ML Challenge, Option B: Reply-Intent Classifier**.

The app classifies creator replies into exactly one of:

- `interested`
- `not_interested`
- `pricing_query`
- `availability_query`
- `unclear`

It includes a polished demo UI, a CLI-style evaluation harness, persisted evaluation artifacts, a local grounded response engine, and optional NVIDIA Nemotron drafting.

## What Is Included

- `dataset/creator_replies_dataset.json`: 60 realistic labeled creator replies.
- `classifier.js`: deterministic intent classifier with confidence, rationale, signal extraction, and tone profiling.
- `eval_results/test_set_predictions.json`: held-out predictions vs. labels.
- `eval_results/evaluation_metrics.json`: accuracy, per-category metrics, and confusion matrices.
- `server.js`: local HTTP API and static UI server.
- `index.html`, `style.css`, `app.js`: executive CRM demo interface.
- `INTEGRATION_ARCHITECTURE.md`: half-page production integration write-up.

## Why This Approach

For this prototype I chose a hybrid approach:

1. A deterministic classifier handles the five required labels quickly and reproducibly.
2. A grounded answer engine turns the classification into an operational CRM answer with confidence and evidence.
3. NVIDIA Nemotron can optionally draft the final agency response when `NVIDIA_API_KEY` is configured.

This keeps evaluation stable while still demonstrating how hosted AI would improve response quality in a real CRM.

## Setup

Requires Node.js 18+.

```bash
npm install
node server.js
```

Open:

```text
http://localhost:3000
```

The app also works without `npm install` because the server uses Node's built-in `http` module for the main prototype path.

## Optional NVIDIA Nemotron AI

The backend supports the NVIDIA Integrate endpoint and model:

```text
https://integrate.api.nvidia.com/v1/chat/completions
nvidia/nemotron-3-ultra-550b-a55b
```

When enabled, the request uses thinking mode with `chat_template_kwargs.enable_thinking=true`, `temperature=1`, `top_p=0.95`, `max_tokens=16384`, and `reasoning_budget=16384`.

Create `.env.local` in the project root:

```bash
NVIDIA_API_KEY=your_key_here
```

Then restart:

```bash
node server.js
```

Do not commit `.env.local`; it is ignored by `.gitignore`.

## Reproduce Results

Run:

```bash
npm test
```

Current result:

```text
Held-Out Test Set Accuracy: 100% (12/12)
Full Dataset Accuracy:      100% (60/60)
```

The test script regenerates:

- `eval_results/test_set_predictions.json`
- `eval_results/evaluation_metrics.json`
- `eval_results/error_analysis.md`

## Demo API

Classify and draft:

```bash
curl -X POST http://localhost:3000/api/v1/classify ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"What is the budget for a dedicated YouTube video?\"}"
```

Dedicated answer endpoint:

```bash
curl -X POST http://localhost:3000/api/v1/assistant/answer ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"sorry, we cant collaborate right now\"}"
```

## Integration Summary

Minimum viable production wiring:

- Trigger classification from an inbound message webhook after an Instagram, TikTok, Gmail, or CRM reply event.
- Store raw message, creator ID, campaign ID, predicted intent, confidence, rationale, and action status in a `creator_replies` table.
- Auto-action high-confidence replies and route low-confidence or `unclear` cases to a human review queue.

Ambitious production version:

- Put replies onto SQS/Kafka/BullMQ for async processing.
- Use deterministic classification for obvious replies and hosted LLM reasoning for ambiguous multi-question messages.
- Feed human overrides back into a review dataset and periodically evaluate prompt/model drift.

See `INTEGRATION_ARCHITECTURE.md` for the fuller half-page write-up.

## With More Time

- Add a small human-review labeling screen and export corrected labels back into the dataset.
- Compare the deterministic classifier against a few-shot Nemotron-only classifier on the same held-out test set.
- Add per-campaign policy rules, such as usage-rights escalation or regional eligibility checks.
- Add Playwright visual regression tests for the CRM UI.
