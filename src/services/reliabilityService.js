const { classifyReplyIntent } = require('../../classifier.js');
const { adjudicateIntent } = require('./llmService.js');

const VALID_INTENTS = new Set(['interested', 'not_interested', 'pricing_query', 'availability_query', 'unclear']);
const AUTO_ACTION_THRESHOLD = 0.9;

function detectAmbiguity(message, deterministic) {
  const text = String(message || '').toLowerCase();
  const asksPricing = /\b(budget|rate|rates|cpm|pay|pricing|cost|fee)\b|\$/.test(text);
  const asksTiming = /\b(when|deadline|date|launch|schedule|calendar|available|travel)\b/.test(text);
  const hasQuestion = text.includes('?');
  const hasPass = /\b(pass|not interested|no thanks|can't collaborate|cant collaborate|remove me)\b/.test(text);
  const compound = asksPricing && asksTiming;
  const conflicting = hasPass && (asksPricing || asksTiming);
  return deterministic.intent === 'unclear' || deterministic.confidence < AUTO_ACTION_THRESHOLD || compound || conflicting || (hasQuestion && deterministic.signals.length === 0);
}

function actionForIntent(intent) {
  const map = {
    interested: { action_type: 'move_to_contract', detail: 'Moved to ready-to-contract and prepared agreement packet.' },
    pricing_query: { action_type: 'send_rate_card', detail: 'Prepared rate-card and budget-tier response.' },
    availability_query: { action_type: 'send_timeline', detail: 'Prepared launch timeline and scheduling response.' },
    not_interested: { action_type: 'suppress_follow_up', detail: 'Recorded polite pass and suppressed campaign follow-up.' },
    unclear: { action_type: 'request_human_review', detail: 'Routed to human review for clarification.' }
  };
  return map[intent] || map.unclear;
}

async function evaluateReply({ message, campaign }) {
  const start = process.hrtime.bigint();
  const deterministic = classifyReplyIntent(message);
  const isAmbiguous = detectAmbiguity(message, deterministic);
  let decision = {
    intent: deterministic.intent,
    confidence: deterministic.confidence,
    rationale: deterministic.rationale,
    signals: deterministic.signals || [],
    emotionData: deterministic.emotionData,
    decision_source: 'deterministic_rules',
    is_ambiguous: isAmbiguous
  };

  if (isAmbiguous) {
    const adjudicated = await adjudicateIntent({ message, campaign, deterministic });
    if (adjudicated && VALID_INTENTS.has(adjudicated.intent)) {
      decision = {
        ...decision,
        intent: adjudicated.intent,
        confidence: Math.max(0, Math.min(1, Number(adjudicated.confidence))),
        rationale: adjudicated.rationale,
        signals: adjudicated.signals,
        decision_source: adjudicated.source,
        is_ambiguous: Boolean(adjudicated.is_ambiguous)
      };
    }
  }

  const latencyMs = Number(process.hrtime.bigint() - start) / 1000000;
  const needsHumanReview = decision.is_ambiguous || decision.intent === 'unclear' || decision.confidence < AUTO_ACTION_THRESHOLD;
  return {
    ...decision,
    action: actionForIntent(needsHumanReview ? 'unclear' : decision.intent),
    needs_human_review: needsHumanReview,
    latency_ms: Number(latencyMs.toFixed(3))
  };
}

module.exports = { AUTO_ACTION_THRESHOLD, VALID_INTENTS, evaluateReply };
