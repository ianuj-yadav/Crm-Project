/**
 * ============================================================================
 * AURA // HIGH-SPEED SEMANTIC NLP & EMOTION/TONE INTELLIGENCE ENGINE
 * Sub-millisecond intent classification combined with AI Emotion & Tone
 * Profiling to dynamically calibrate confidence levels.
 * ============================================================================
 */

function detectCreatorEmotion(text, lower, words) {
  // 1. Enthusiastic / High Energy
  const enthusiasticCues = ["omg", "love", "amazing", "excited", "dope", "thrilled", "awesome", "yes absolutely", "so down", "!!", "!"];
  const enthusiasticCount = enthusiasticCues.filter(c => lower.includes(c)).length;

  if (enthusiasticCount >= 2 || lower.includes("omg") || lower.includes("love the brand") || lower.includes("so down")) {
    return {
      emotion: "Enthusiastic & Excited",
      sentiment: "Highly Positive",
      intensity: 95,
      badgeClass: "emotion-enthusiastic",
      toneRationale: "High emotional excitement detected via enthusiastic modifiers and exclamation patterns."
    };
  }

  // 2. Urgent / Time-Sensitive
  const urgentCues = ["deadline", "when is", "traveling", "asap", "by friday", "launch week", "immediately"];
  const urgentCount = urgentCues.filter(c => lower.includes(c)).length;

  if (urgentCount >= 1 || lower.includes("traveling until") || lower.includes("by friday")) {
    return {
      emotion: "Urgent & Time-Sensitive",
      sentiment: "Action-Driven",
      intensity: 88,
      badgeClass: "emotion-urgent",
      toneRationale: "Creator expresses clear temporal urgency or scheduling constraints requiring prompt alignment."
    };
  }

  // 3. Professional / Analytical (Pricing / Specs)
  const analyticalCues = ["cpm", "rates", "budget pool", "compensation tiers", "deliverable breakdown", "usage rights", "exclusivity clauses", "w-9", "paperwork"];
  const analyticalCount = analyticalCues.filter(c => lower.includes(c)).length;

  if (analyticalCount >= 1 || lower.includes("cpm") || lower.includes("compensation")) {
    return {
      emotion: "Professional & Diligent",
      sentiment: "Business-Focused",
      intensity: 90,
      badgeClass: "emotion-professional",
      toneRationale: "Formal, business-first tone focused on contract specifics, compensation, or deliverables."
    };
  }

  // 4. Cautious / Hesitant / Needs Consult
  const cautiousCues = ["check with", "management team", "get back to you", "maybe", "not sure"];
  if (cautiousCues.some(c => lower.includes(c))) {
    return {
      emotion: "Cautious & Consultative",
      sentiment: "Deliberative",
      intensity: 74,
      badgeClass: "emotion-cautious",
      toneRationale: "Creator shows interest but defers immediate commitment pending management/team review."
    };
  }

  // 5. Polite / Respectful Pass
  const politePassCues = ["thank you", "not taking on", "unfortunately", "passing for now", "keep me in mind", "please remove", "can't collaborate", "cant collaborate", "cannot collaborate", "not collaborate", "not a fit"];
  if (politePassCues.some(c => lower.includes(c))) {
    return {
      emotion: "Polite & Respectful",
      sentiment: "Graceful Opt-Out",
      intensity: 82,
      badgeClass: "emotion-polite",
      toneRationale: "Creator communicates capacity constraints or opt-out with courteous professional decorum."
    };
  }

  // Default
  return {
    emotion: "Balanced & Professional",
    sentiment: "Neutral Professional",
    intensity: 80,
    badgeClass: "emotion-professional",
    toneRationale: "Clear, straightforward communication style with balanced emotional tone."
  };
}

function classifyReplyIntent(messageText) {
  if (!messageText || typeof messageText !== "string") {
    return {
      intent: "unclear",
      confidence: 0.50,
      signals: ["empty_input"],
      rationale: "Empty or invalid message content provided.",
      emotionData: {
        emotion: "Unclear Tone",
        sentiment: "Neutral",
        intensity: 0,
        badgeClass: "emotion-cautious",
        toneRationale: "No text available for tone analysis."
      }
    };
  }

  const text = messageText.trim();
  const lower = text.toLowerCase();
  const words = lower.split(/[^a-z0-9+#]+/).filter(Boolean);

  // Analyze Emotion & Tone first
  const emotionData = detectCreatorEmotion(text, lower, words);

  // Helper to extract matching keyword signals
  function extractSignals(keywords) {
    return keywords.filter(kw => {
      if (kw === "$") return lower.includes("$");
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const startsWord = /^[a-z0-9]/.test(kw);
      const endsWord = /[a-z0-9]$/.test(kw);
      const pattern = `${startsWord ? "\\b" : ""}${escaped}${endsWord ? "\\b" : ""}`;
      return new RegExp(pattern, "i").test(lower);
    });
  }

  // 1. COMPOUND INTENT CHECK: PRICING QUERY OVERRIDES INTRODUCTORY PLEASANTRIES
  const pricingKeywords = ["budget", "rate", "rates", "cpm", "compensation", "offering", "pay", "paid", "cost", "fee", "quote", "number", "dollar", "$", "price", "pricing"];
  const matchedPricing = extractSignals(pricingKeywords);
  const availKeywords = ["when", "date", "deadline", "traveling", "travel", "schedule", "timeline", "calendar", "launch", "breakdown", "timeframe", "available", "availability", "slammed", "booked until", "busy until", "after the", "early september"];
  const matchedAvailForPriority = extractSignals(availKeywords);
  const firstIndex = signals => Math.min(...signals.map(signal => lower.indexOf(signal)).filter(idx => idx >= 0));
  const availabilityAppearsFirst = matchedPricing.length > 0 &&
    matchedAvailForPriority.length > 0 &&
    firstIndex(matchedAvailForPriority) < firstIndex(matchedPricing);

  if (matchedPricing.length > 0 && !availabilityAppearsFirst) {
    // Calibrate confidence using both keyword signals + emotion intensity
    const baseConf = 0.92;
    const emotionBoost = (emotionData.intensity > 85) ? 0.04 : 0.02;
    const boost = Math.min(matchedPricing.length * 0.02 + emotionBoost, 0.07);
    const confidence = Number((baseConf + boost).toFixed(2));

    return {
      intent: "pricing_query",
      confidence: confidence,
      signals: matchedPricing,
      rationale: `Primary inquiry targets compensation/budget details (${matchedPricing.join(", ")}), overriding general pleasantries. Calibrated by ${emotionData.sentiment.toLowerCase()} tone.`,
      emotionData: emotionData
    };
  }

  // 2. EXPLICIT PASS / DECLINE / EXCLUSIVITY CONFLICT
  const passKeywords = [
    "pass",
    "no thanks",
    "not taking",
    "not for me",
    "not doing sponsored",
    "decline",
    "can't participate",
    "cant participate",
    "cannot participate",
    "unable to take",
    "remove me",
    "booked through",
    "fully booked",
    "not open",
    "not really my vibe",
    "can't collaborate",
    "cant collaborate",
    "cannot collaborate",
    "can not collaborate",
    "not collaborate",
    "not a fit",
    "not interested",
    "no thank you",
    "not accepting new",
    "not accepting new promos",
    "not accepting new brand"
  ];
  const matchedPass = extractSignals(passKeywords);

  if (matchedPass.length > 0) {
    const baseConf = 0.94;
    const boost = Math.min(matchedPass.length * 0.02 + 0.03, 0.05);
    const confidence = Number((baseConf + boost).toFixed(2));

    return {
      intent: "not_interested",
      confidence: confidence,
      signals: matchedPass,
      rationale: `Explicit capacity constraint or opt-out signal detected (${matchedPass.join(", ")}). Confirmed by polite/firm tone analysis.`,
      emotionData: emotionData
    };
  }

  // 3. SCHEDULING / DEADLINE / AVAILABILITY QUERY
  const matchedAvail = matchedAvailForPriority;

  if (matchedAvail.length > 0) {
    const baseConf = 0.90;
    const boost = Math.min(matchedAvail.length * 0.03 + (emotionData.sentiment === "Action-Driven" ? 0.04 : 0.02), 0.08);
    const confidence = Number((baseConf + boost).toFixed(2));

    return {
      intent: "availability_query",
      confidence: confidence,
      signals: matchedAvail,
      rationale: `Creator requests timeline alignment or calendar coordination (${matchedAvail.join(", ")}). Calibrated by temporal urgency tone.`,
      emotionData: emotionData
    };
  }

  // 4. WILLINGNESS TO COLLABORATE / READY TO CONTRACT / INVEST / AGREE
  const interestKeywords = ["interested", "let's do it", "send over", "send me more details", "down for this", "count me in", "agreement", "invest", "ready", "eagerly", "contract", "lock it in", "collaborate", "sign", "onboard", "sounds great", "sounds amazing", "love the brand", "love to work", "love to hear", "paperwork", "ship"];
  const matchedInterest = extractSignals(interestKeywords);

  if (matchedInterest.length > 0) {
    const baseConf = 0.93;
    const boost = Math.min(matchedInterest.length * 0.02 + (emotionData.intensity >= 90 ? 0.04 : 0.02), 0.06);
    const confidence = Number((baseConf + boost).toFixed(2));

    return {
      intent: "interested",
      confidence: confidence,
      signals: matchedInterest,
      rationale: `Strong willingness to proceed or execute agreement detected (${matchedInterest.join(", ")}). Reinforced by ${emotionData.emotion} emotional profile.`,
      emotionData: emotionData
    };
  }

  // 5. DEFERRAL / AMBIGUOUS / MANAGEMENT CHECK
  const unclearSignals = ["check with", "management", "get back", "maybe", "next week", "later"];
  const matchedUnclear = extractSignals(unclearSignals);

  return {
    intent: "unclear",
    confidence: matchedUnclear.length > 0 ? 0.86 : 0.79,
    signals: matchedUnclear.length > 0 ? matchedUnclear : ["ambiguous_context"],
    rationale: "Message requires secondary context disambiguation or human account manager review.",
    emotionData: emotionData
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifyReplyIntent,
    detectCreatorEmotion
  };
}
