# AURA // Option B: Systems Integration Architecture

> **AI/ML Challenge Half-Page Production Integration Blueprint**  
> *How the AURA Reply-Intent Classifier plugs into a real production agency CRM system.*

---

## 1. End-to-End Production Architecture & Event Flow

In a real-world agency CRM platform managing hundreds of active influencer campaigns, reply intent classification runs as an **asynchronous, event-driven pipeline** decoupled from user-facing dashboard requests.

```
+------------------------------------+
| Incoming Creator Reply Event       |
| (Instagram Graph / TikTok / Email) |
+------------------------------------+
                  |
                  v
+------------------------------------+
| CRM Ingestion Webhook              |
| POST /api/v1/webhook/reply         |
+------------------------------------+
                  |
                  v
+------------------------------------+
| Message Buffer Queue               |
| (AWS SQS / Kafka / BullMQ)         |
+------------------------------------+
                  |
                  v
+------------------------------------+
| AURA Hybrid Intent Worker          |
| 1. High-Speed Rule Engine (<1ms)   |
| 2. NVIDIA Nemotron LLM Reasoning   |
+------------------------------------+
                  |
                  +----------------------------------+
                  |                                  |
                  v                                  v
+------------------------------------+    +------------------------------------+
| Enriched CRM Database Row          |    | Automated CRM Workflow Routing     |
| (creator_replies SQL Table)        |    | - Auto-send Rate Card (pricing)    |
| status: 'auto_actioned'            |    | - Auto-attach Calendar (avail)     |
+------------------------------------+    +------------------------------------+
```

---

## 2. What Must Exist First in Agency Infrastructure

Before deploying this classifier into production, three core infrastructure components must be established:

1. **Relational Message-History Table (`creator_replies`)**:
   A transactional table that records every incoming reply with foreign keys linking to `campaign_id` and `creator_id`. It must support storing structured AI predictions (`predicted_intent`, `intent_confidence`, `intent_rationale`) and human override audit trails (`human_feedback_logs`).
2. **Campaign Master Database (`campaigns`)**:
   Stores campaign deliverables, target launch dates, and budget pools ($15k–$35k tiers) so that the NVIDIA Nemotron LLM Assistant can draft accurate, context-aware email responses.
3. **Idempotent Ingestion Queue**:
   To prevent webhook drops during high-volume campaign launch blitzes, an idempotent queue (e.g., AWS SQS FIFO or Redis BullMQ) buffers incoming webhooks before passing them to the classification workers.

---

## 3. Minimum Viable Integration (MVI) vs. Ambitious Scale

| Dimension | Minimum Viable Integration (MVI) | Ambitious Enterprise Scale |
| :--- | :--- | :--- |
| **Inference Engine** | Deterministic Regex & NLP Rule Engine (`classifier.js`) running inside existing Node.js API container. | Hybrid Router: Rule engine handles 90% unambiguous replies in `<1ms`; edge cases route to fine-tuned **NVIDIA Nemotron 550B LLM**. |
| **Webhook Ingestion** | Synchronous Node HTTP endpoint (`POST /api/v1/webhook/reply`) inserting replies, classifications, generations, and audit events directly into PostgreSQL. | Asynchronous Kafka/SQS worker pipeline with dead-letter queues and retry backoff. |
| **Human-in-the-Loop** | Account managers manually review items flagged as `unclear` in the CRM queue. | Active Learning Loop (`PATCH /api/v1/replies/:id/override`) automatically logs manager corrections to fine-tune future LLM prompts. |
| **Automated Actions** | Updates CRM database stage (`Ready to Contract`, `Opted Out`). | Automatically sends personalized rate card PDFs, Cal.com invites, and contract Docusign links via agency email APIs. |
