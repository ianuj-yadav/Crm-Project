/**
 * AURA CRM AI service
 * Optional provider-backed drafting plus a grounded local answer engine.
 *
 * Set NVIDIA_API_KEY to use NVIDIA Nemotron through the Integrate API.
 * AI_API_KEY, AI_API_URL, and AI_MODEL are also supported for another
 * OpenAI-compatible /chat/completions provider. Without those values the app
 * remains fully functional through the local grounded responder below.
 */

const fs = require("fs");
const path = require("path");

const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const DEFAULT_CHAT_URL = "https://api.openai.com/v1/chat/completions";

function loadLocalEnv() {
  const candidates = [
    path.join(__dirname, "..", "..", ".env.local"),
    path.join(__dirname, "..", "..", ".env")
  ];

  candidates.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  });
}

loadLocalEnv();

function normalizeCurrency(value) {
  if (!value) return "$25,000";
  const stringValue = String(value).trim();
  return stringValue.startsWith("$") ? stringValue : `$${stringValue}`;
}

function normalizeCampaignContext(input = {}) {
  return {
    title: input.campaignTitle || input.campaign_title || "AI Hardware Launch - Q3 Creator Blitz",
    budget: normalizeCurrency(input.campaignBudget || input.campaign_budget || "25,000"),
    deliverables: input.deliverables || "1x YouTube Review + 2x IG Reels",
    launchDate: input.launchDate || input.launch_date || "August 15, 2026",
    productName: input.productName || input.product_name || "AURA Accelerator Dock Pro"
  };
}

function hasAny(text, phrases) {
  return phrases.some(phrase => {
    if (phrase === "$") return text.includes("$");
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWord = /^[a-z0-9]/.test(phrase);
    const endsWord = /[a-z0-9]$/.test(phrase);
    const pattern = `${startsWord ? "\\b" : ""}${escaped}${endsWord ? "\\b" : ""}`;
    return new RegExp(pattern, "i").test(text);
  });
}

function buildGroundedAnswer({ intent, message, campaignTitle, campaignBudget, deliverables, launchDate, productName }) {
  const campaign = normalizeCampaignContext({ campaignTitle, campaignBudget, deliverables, launchDate, productName });
  const text = (message || "").trim();
  const lower = text.toLowerCase();

  const answer = {
    answer: "This reply needs human follow-up because the creator did not ask a concrete campaign question.",
    confidence: 0.72,
    question_type: "needs_clarification",
    evidence: ["No direct budget, schedule, deliverable, or contract question was detected."],
    suggested_next_step: "Ask a concise clarifying question and keep the thread assigned to a talent manager."
  };

  if (intent === "pricing_query" || hasAny(lower, ["budget", "rate", "rates", "cpm", "pay", "paid", "cost", "fee", "pricing", "$"])) {
    answer.answer = `The campaign budget pool is ${campaign.budget}. Position it around ${campaign.deliverables}, then ask the creator to share their standard rate card so the agency can confirm fit.`;
    answer.confidence = 0.94;
    answer.question_type = "pricing";
    answer.evidence = [`Campaign budget: ${campaign.budget}`, `Deliverables: ${campaign.deliverables}`];
    answer.suggested_next_step = "Send rate-card tiers and request the creator's package rate.";
    return answer;
  }

  if (intent === "availability_query" || hasAny(lower, ["when", "date", "deadline", "launch", "schedule", "calendar", "timeline", "available", "travel", "slammed"])) {
    answer.answer = `The target launch date is ${campaign.launchDate}. Offer flexible publishing slots around that window and ask for their available production dates.`;
    answer.confidence = 0.91;
    answer.question_type = "availability";
    answer.evidence = [`Launch date: ${campaign.launchDate}`, `Deliverables: ${campaign.deliverables}`];
    answer.suggested_next_step = "Send the scheduling link and request the creator's blackout dates.";
    return answer;
  }

  if (hasAny(lower, ["deliverable", "breakdown", "scope", "video", "reel", "short", "stream", "post"])) {
    answer.answer = `The expected scope is ${campaign.deliverables}. Confirm whether they can produce that exact mix or want a revised package.`;
    answer.confidence = 0.89;
    answer.question_type = "deliverables";
    answer.evidence = [`Deliverables: ${campaign.deliverables}`];
    answer.suggested_next_step = "Send the creative brief and ask for any scope changes.";
    return answer;
  }

  if (intent === "interested" || hasAny(lower, ["agreement", "contract", "sign", "paperwork", "ready", "count me in", "let's do it", "ship"])) {
    answer.answer = `The creator is ready to move forward on ${campaign.title}. Send the creator agreement, collect shipping and tax details, and move them to the ready-to-contract stage.`;
    answer.confidence = 0.93;
    answer.question_type = "commitment";
    answer.evidence = ["Message contains commitment or agreement language.", `Campaign: ${campaign.title}`];
    answer.suggested_next_step = "Send agreement, onboarding packet, and shipping form.";
    return answer;
  }

  if (intent === "not_interested" || hasAny(lower, ["pass", "not interested", "no thanks", "can't collaborate", "cant collaborate", "cannot collaborate", "remove me", "unsubscribe"])) {
    answer.answer = "The creator is declining this opportunity. Respect the pass, suppress further follow-up for this campaign, and optionally keep them warm for a future campaign if their wording allows it.";
    answer.confidence = 0.95;
    answer.question_type = "decline";
    answer.evidence = ["Message contains a clear opt-out or collaboration refusal."];
    answer.suggested_next_step = "Log a polite pass and stop campaign follow-ups.";
    return answer;
  }

  return answer;
}

function getFallbackDraftReply(intent, creatorName, campaignTitle, messageText, campaignContext = {}) {
  const name = creatorName || "Creator";
  const campaign = normalizeCampaignContext({ ...campaignContext, campaignTitle });
  const text = (messageText || "").trim();
  const grounded = buildGroundedAnswer({
    intent,
    message: text,
    campaignTitle: campaign.title,
    campaignBudget: campaign.budget,
    deliverables: campaign.deliverables,
    launchDate: campaign.launchDate,
    productName: campaign.productName
  });

  if (intent === "pricing_query") {
    return `Hi ${name},

Thanks for asking. For ${campaign.title}, the current budget pool is ${campaign.budget} for ${campaign.deliverables}.

I can send over our rate-card tiers, and it would be helpful to see your standard package rate for this scope so we can confirm fit quickly.

Best,
AURA Talent Partnerships`;
  }

  if (intent === "availability_query") {
    return `Hi ${name},

Thanks for checking timing. The target launch date is ${campaign.launchDate}, with some flexibility around publishing slots if your calendar is tight.

Could you send over your available production windows? I can also share our scheduling link for a quick alignment call.

Best,
AURA Talent Partnerships`;
  }

  if (intent === "interested") {
    return `Hi ${name},

Great to hear. We would be excited to move forward with you on ${campaign.title}.

I will send the creator agreement, onboarding brief, and shipping details for the ${campaign.productName} review kit so we can get everything moving.

Best,
AURA Talent Partnerships`;
  }

  if (intent === "not_interested") {
    return `Hi ${name},

Thanks for letting us know. We completely understand and will mark this as a pass so you do not receive additional follow-ups for this campaign.

We appreciate the quick reply and hope to reconnect when a future opportunity is a better fit.

Best,
AURA Talent Partnerships`;
  }

  return `Hi ${name},

Thanks for getting back to us. ${grounded.answer}

Would you be open to a quick reply with the main detail you need from us so we can route this correctly?

Best,
AURA Talent Partnerships`;
}

async function callConfiguredChatProvider({ systemPrompt, userPrompt }) {
  const useNvidia = Boolean(process.env.NVIDIA_API_KEY);
  const apiKey = process.env.NVIDIA_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;

  const apiUrl = useNvidia ? NVIDIA_CHAT_URL : (process.env.AI_API_URL || DEFAULT_CHAT_URL);
  const model = useNvidia ? NVIDIA_MODEL : (process.env.AI_MODEL || "gpt-4o-mini");
  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: useNvidia ? 1 : 0.25,
    top_p: useNvidia ? 0.95 : undefined,
    max_tokens: useNvidia ? 16384 : 320,
    stream: false
  };

  if (useNvidia) {
    body.chat_template_kwargs = { enable_thinking: true };
    body.reasoning_budget = 16384;
  }

  Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) return null;
  const data = await response.json();
  const message = data?.choices?.[0]?.message;
  const content = message?.content;
  if (typeof content !== "string" || content.trim().length <= 10) return null;

  return {
    content: content.trim(),
    source: useNvidia ? "nvidia_nemotron" : "configured_ai_provider",
    model
  };
}

function parseStructuredDecision(content) {
  const normalized = String(content || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(normalized);
    const allowed = new Set(['interested', 'not_interested', 'pricing_query', 'availability_query', 'unclear']);
    if (!allowed.has(parsed.intent) || !Number.isFinite(Number(parsed.confidence)) || typeof parsed.rationale !== 'string') return null;
    return {
      intent: parsed.intent,
      confidence: Number(parsed.confidence),
      rationale: parsed.rationale.slice(0, 500),
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 8).map(String) : [],
      is_ambiguous: Boolean(parsed.is_ambiguous)
    };
  } catch (error) {
    return null;
  }
}

async function adjudicateIntent({ message, campaign, deterministic }) {
  const facts = normalizeCampaignContext({
    campaignTitle: campaign?.title,
    campaignBudget: campaign?.budget_pool,
    deliverables: campaign?.deliverables,
    launchDate: campaign?.launch_date,
    productName: campaign?.product_name
  });
  const systemPrompt = [
    'You classify creator outreach replies for an agency CRM.',
    'Return JSON only. Never include chain-of-thought, hidden reasoning, markdown, or extra keys.',
    'Allowed intents: interested, not_interested, pricing_query, availability_query, unclear.',
    'Use unclear for genuinely ambiguous or conflicting messages. Pricing overrides generic enthusiasm when a rate is requested.',
    'Ground any interpretation in the message and campaign facts.'
  ].join(' ');
  const userPrompt = JSON.stringify({
    message,
    campaign: facts,
    deterministic_candidate: {
      intent: deterministic.intent,
      confidence: deterministic.confidence,
      signals: deterministic.signals
    },
    response_schema: {
      intent: 'one allowed intent',
      confidence: 'number 0 to 1',
      rationale: 'one concise sentence',
      signals: ['message signal'],
      is_ambiguous: false
    }
  });
  try {
    const providerResult = await callConfiguredChatProvider({ systemPrompt, userPrompt });
    const decision = parseStructuredDecision(providerResult?.content);
    if (!decision) return null;
    return { ...decision, source: providerResult.source, model: providerResult.model };
  } catch (error) {
    return null;
  }
}

async function generateAgencyReply(input) {
  const campaign = normalizeCampaignContext(input);
  const intent = input.intent || "unclear";
  const message = input.message || "";
  const creatorName = input.creatorName || input.creator_name || "Creator";
  const aiAnswer = buildGroundedAnswer({
    intent,
    message,
    campaignTitle: campaign.title,
    campaignBudget: campaign.budget,
    deliverables: campaign.deliverables,
    launchDate: campaign.launchDate,
    productName: campaign.productName
  });

  const systemPrompt = `You are a senior influencer-marketing account manager. Write concise, warm CRM replies grounded only in the campaign facts provided. Never invent budgets, dates, or deliverables.`;
  const userPrompt = [
    `Creator: ${creatorName}`,
    `Creator message: ${message}`,
    `Detected intent: ${intent}`,
    `Campaign: ${campaign.title}`,
    `Budget: ${campaign.budget}`,
    `Deliverables: ${campaign.deliverables}`,
    `Launch date: ${campaign.launchDate}`,
    `Grounded answer: ${aiAnswer.answer}`,
    "Draft a polished reply under 130 words."
  ].join("\n");

  try {
    const providerDraft = await callConfiguredChatProvider({ systemPrompt, userPrompt });
    if (providerDraft?.content) {
      return {
        draft_reply: providerDraft.content,
        reasoning: `Grounded on ${aiAnswer.question_type} with ${(aiAnswer.confidence * 100).toFixed(0)}% answer confidence.`,
        source: providerDraft.source,
        model: providerDraft.model,
        ai_answer: aiAnswer
      };
    }
  } catch (err) {
    // Fall through to local responder.
  }

  return {
    draft_reply: getFallbackDraftReply(intent, creatorName, campaign.title, message, campaign),
    reasoning: `Local grounded AI responder matched the message to ${aiAnswer.question_type} with ${(aiAnswer.confidence * 100).toFixed(0)}% answer confidence.`,
    source: "local_grounded_ai",
    model: "aura-grounded-responder-v1",
    ai_answer: aiAnswer
  };
}

module.exports = {
  adjudicateIntent,
  generateAgencyReply,
  buildGroundedAnswer
};
