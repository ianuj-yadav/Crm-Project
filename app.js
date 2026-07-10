
const CAMPAIGN_CATALOG = {
  hardware: {
    id: "hardware",
    title: "AI Hardware Launch - Q3 Creator Blitz",
    subtitle: "Target Deliverables: 1x Dedicated YouTube Review (10m+) + 2x IG Reels | Budget Pool: $25,000",
    budgetPool: "$25,000",
    deliverables: "1x Dedicated YouTube Review (10m+) + 2x IG Reels",
    launchDate: "August 15, 2026",
    productName: "AURA Accelerator Dock Pro"
  },
  fintech: {
    id: "fintech",
    title: "FinTech Smart Wallet - Creator Ambassadorship",
    subtitle: "Target Deliverables: 3x Integrated TikTok Spots + 1x Newsletter Mention | Budget Pool: $40,000",
    budgetPool: "$40,000",
    deliverables: "3x Integrated TikTok Spots + 1x Newsletter Mention",
    launchDate: "September 1, 2026",
    productName: "VaultPay One Card"
  },
  gaming: {
    id: "gaming",
    title: "Indie Gaming Studio - RPG Early Access Sprint",
    subtitle: "Target Deliverables: 2x Dedicated Twitch Streams (2h each) + YouTube Shorts | Budget Pool: $15,000",
    budgetPool: "$15,000",
    deliverables: "2x Dedicated Twitch Streams (2h each) + YouTube Shorts",
    launchDate: "July 28, 2026",
    productName: "Chronicles of Aether RPG"
  }
};

let activeCampaignId = "hardware";
let activeFilter = "all";
let searchTerm = "";
let selectedMessageId = "rep_101";
let toastTimer;

function campaignApiId() {
  return {
    hardware: "camp_ai_hardware",
    fintech: "camp_fintech_wallet",
    gaming: "camp_indie_gaming"
  }[activeCampaignId] || "camp_ai_hardware";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMessagePrediction(message) {
  if (message.serverPrediction) return message.serverPrediction;
  const prediction = classifyReplyIntent(message.text);
  if (!message.categoryOverride) return prediction;

  return {
    ...prediction,
    intent: message.categoryOverride,
    confidence: 0.99,
    rationale: "Human audit override applied to this creator reply.",
    signals: ["human_audit_override", ...(prediction.signals || [])]
  };
}

// ============================================================================
// 2. AGENCY CREATOR REPLY INBOX QUEUE
// ============================================================================
const CREATOR_INBOX_QUEUE = [
  {
    id: "rep_101",
    handle: "@alex.vlogs",
    name: "Alex Rivera",
    avatar: "AL",
    platform: "Instagram DM - Received 2m ago",
    text: "Omg so down for this!! But what is the budget pool for a dedicated 10m YouTube video?",
    categoryOverride: null
  },
  {
    id: "rep_102",
    handle: "@tech.with.sam",
    name: "Sam Chen",
    avatar: "SC",
    platform: "Email Reply - Received 14m ago",
    text: "Not taking on new brand partnerships this quarter, thank you.",
    categoryOverride: null
  },
  {
    id: "rep_103",
    handle: "@gaming.marcus",
    name: "Marcus Vance",
    avatar: "MV",
    platform: "Twitter/X DM - Received 28m ago",
    text: "Sounds amazing! Let's do it, send over the agreement!",
    categoryOverride: null
  },
  {
    id: "rep_104",
    handle: "@chloe.lifestyle",
    name: "Chloe Bennett",
    avatar: "CB",
    platform: "Instagram DM - Received 41m ago",
    text: "When is the launch target date? I am traveling until August 10th.",
    categoryOverride: null
  },
  {
    id: "rep_105",
    handle: "@dev.sara",
    name: "Sara Jenkins",
    avatar: "SJ",
    platform: "Email Reply - Received 1h ago",
    text: "Let me check with my management team and get back to you next week.",
    categoryOverride: null
  },
  {
    id: "rep_106",
    handle: "@hardware.hank",
    name: "Hank Miller",
    avatar: "HM",
    platform: "YouTube Business Email - Received 1h ago",
    text: "What are your CPM rates and compensation tiers for a 60-second integration?",
    categoryOverride: null
  },
  {
    id: "rep_107",
    handle: "@pixel.pat",
    name: "Patrice Gomez",
    avatar: "PG",
    platform: "Instagram DM - Received 2h ago",
    text: "Please remove me from your creator PR distribution list.",
    categoryOverride: null
  },
  {
    id: "rep_108",
    handle: "@maya.creates",
    name: "Maya Lin",
    avatar: "ML",
    platform: "Email Reply - Received 2h ago",
    text: "Count me in! Can you ship the review unit to my studio in Austin by Friday?",
    categoryOverride: null
  },
  {
    id: "rep_109",
    handle: "@streamer.jay",
    name: "Jayden Brooks",
    avatar: "JB",
    platform: "Twitch Business Inquiry - Received 3h ago",
    text: "Are there any exclusivity clauses during the launch week window?",
    categoryOverride: null
  },
  {
    id: "rep_110",
    handle: "@nina.studio",
    name: "Nina Patel",
    avatar: "NP",
    platform: "Instagram DM - Received 3h ago",
    text: "Can we schedule a quick 15-minute call to align on the creative brief?",
    categoryOverride: null
  },
  {
    id: "rep_111",
    handle: "@gadget.guru",
    name: "Leo Thorne",
    avatar: "LT",
    platform: "Email Reply - Received 4h ago",
    text: "I love the product specs! Do you offer usage rights for paid ads booster?",
    categoryOverride: null
  },
  {
    id: "rep_112",
    handle: "@clara.codes",
    name: "Clara Oswald",
    avatar: "CO",
    platform: "Twitter/X DM - Received 5h ago",
    text: "My calendar is completely booked through October unfortunately.",
    categoryOverride: null
  },
  {
    id: "rep_113",
    handle: "@daily.tech",
    name: "Derek Hall",
    avatar: "DH",
    platform: "Email Reply - Received 5h ago",
    text: "What is the exact deliverable breakdown between Shorts and long-form?",
    categoryOverride: null
  },
  {
    id: "rep_114",
    handle: "@zoe.vlogs",
    name: "Zoe Kravitz",
    avatar: "ZV",
    platform: "Instagram DM - Received 6h ago",
    text: "Yes absolutely! Who should I send my media kit and W-9 to?",
    categoryOverride: null
  },
  {
    id: "rep_115",
    handle: "@future.builds",
    name: "Liam Neeson",
    avatar: "FB",
    platform: "Email Reply - Received 6h ago",
    text: "Is this campaign open to creators based in the UK and EU?",
    categoryOverride: null
  },
  {
    id: "rep_116",
    handle: "@audio.phile",
    name: "Evan Wright",
    avatar: "EW",
    platform: "YouTube Inquiry - Received 7h ago",
    text: "Passing for now, but keep me in mind for Q4 hardware launches!",
    categoryOverride: null
  },
  {
    id: "rep_117",
    handle: "@mobile.max",
    name: "Max Sterling",
    avatar: "MS",
    platform: "Email Reply - Received 8h ago",
    text: "Do you have budget for a dedicated TikTok series (3 videos)?",
    categoryOverride: null
  },
  {
    id: "rep_118",
    handle: "@eva.reviews",
    name: "Eva Rostova",
    avatar: "ER",
    platform: "Instagram DM - Received 8h ago",
    text: "Looks dope! Let's sign the paperwork.",
    categoryOverride: null
  }
];

// ============================================================================
// 3. AUTOMATED CRM METADATA GENERATOR BASED ON INTENT
// ============================================================================
function getAutomatedCrmMetadata(intent, confidence) {
  switch (intent) {
    case "interested":
      return {
        pillHtml: `<span>Auto-send campaign onboarding packet and creator agreement.</span>`,
        badgeClass: "intent-interested",
        label: "INTERESTED"
      };
    case "pricing_query":
      return {
        pillHtml: `<span>Auto-send rate card PDF and campaign budget tiers ($15k-$35k).</span>`,
        badgeClass: "intent-pricing",
        label: "PRICING QUERY"
      };
    case "availability_query":
      return {
        pillHtml: `<span>Auto-send campaign launch timeline and deliverable deadlines.</span>`,
        badgeClass: "intent-availability",
        label: "AVAILABILITY QUERY"
      };
    case "not_interested":
      return {
        pillHtml: `<span>Log polite pass and set Q4 follow-up reminder.</span>`,
        badgeClass: "intent-pass",
        label: "NOT INTERESTED"
      };
    default:
      return {
        pillHtml: `<span>Flag for human account manager review and manual follow-up.</span>`,
        badgeClass: "intent-unclear",
        label: "UNCLEAR / FOLLOW-UP"
      };
  }
}

function getLocalAiAnswer(messageText, intent, camp) {
  const lower = (messageText || "").toLowerCase();
  const hasSignal = (phrases) => phrases.some(phrase => {
    if (phrase === "$") return lower.includes("$");
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWord = /^[a-z0-9]/.test(phrase);
    const endsWord = /[a-z0-9]$/.test(phrase);
    const pattern = `${startsWord ? "\\b" : ""}${escaped}${endsWord ? "\\b" : ""}`;
    return new RegExp(pattern, "i").test(lower);
  });
  const answer = {
    answer: "This reply needs human follow-up because it does not contain a concrete campaign question.",
    confidence: 0.72,
    question_type: "Needs Clarification",
    evidence: ["No direct campaign fact was requested."],
    suggested_next_step: "Ask one clarifying question and keep the thread assigned to a talent manager."
  };

  if (intent === "pricing_query" || hasSignal(["budget", "rate", "rates", "cpm", "pay", "cost", "fee", "pricing", "$"])) {
    return {
      answer: `The answer is ${camp.budgetPool}. That budget is tied to ${camp.deliverables}.`,
      confidence: 0.94,
      question_type: "Pricing Answer",
      evidence: [`Budget pool: ${camp.budgetPool}`, `Deliverables: ${camp.deliverables}`],
      suggested_next_step: "Send rate-card tiers and ask for the creator's package rate."
    };
  }

  if (intent === "availability_query" || hasSignal(["when", "date", "deadline", "launch", "schedule", "calendar", "timeline", "available", "travel"])) {
    return {
      answer: `The target launch date is ${camp.launchDate}. Offer flexible production and publishing slots around that window.`,
      confidence: 0.91,
      question_type: "Availability Answer",
      evidence: [`Launch date: ${camp.launchDate}`, `Deliverables: ${camp.deliverables}`],
      suggested_next_step: "Send the scheduling link and ask for blackout dates."
    };
  }

  if (intent === "interested") {
    return {
      answer: `The creator is ready to move forward on ${camp.title}. Send the agreement, onboarding brief, and shipping form.`,
      confidence: 0.93,
      question_type: "Commitment Answer",
      evidence: ["Message contains commitment language.", `Product: ${camp.productName}`],
      suggested_next_step: "Move to ready-to-contract and send onboarding assets."
    };
  }

  if (intent === "not_interested") {
    return {
      answer: "The creator is declining this campaign. Respect the pass and suppress further follow-ups for this opportunity.",
      confidence: 0.95,
      question_type: "Decline Answer",
      evidence: ["Message contains a refusal or opt-out signal."],
      suggested_next_step: "Log a polite pass and stop campaign follow-up."
    };
  }

  return answer;
}

function renderAiAnswer(answer) {
  if (!answer) return;
  const typeEl = document.getElementById("readerAnswerType");
  const confidenceEl = document.getElementById("readerAnswerConfidence");
  const barEl = document.getElementById("readerAnswerConfidenceBar");
  const answerEl = document.getElementById("readerAiAnswer");
  const evidenceEl = document.getElementById("readerAnswerEvidence");
  const confidence = Math.round((answer.confidence || 0.72) * 100);

  if (typeEl) typeEl.textContent = answer.question_type || "Campaign answer";
  if (confidenceEl) confidenceEl.textContent = `${confidence}% Confidence`;
  animateMeter(barEl, confidence);
  if (answerEl) answerEl.textContent = answer.answer || "No answer generated.";
  if (evidenceEl) {
    const evidence = Array.isArray(answer.evidence) ? answer.evidence.join(" | ") : "Campaign facts and message wording.";
    evidenceEl.textContent = `Evidence: ${evidence} Next step: ${answer.suggested_next_step || "Review and reply."}`;
  }
}

function animateMeter(element, value) {
  if (!element) return;
  element.style.width = "0%";
  element.setAttribute("aria-valuenow", String(value));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.style.width = `${value}%`;
    });
  });
}

// ============================================================================
// 4. DEEPLY CONTEXTUAL RESPONSE GENERATOR (RESPONDS TO CREATOR EXACT WORDING)
// ============================================================================
function generateDynamicResponse(messageText, intent, creatorHandle, camp) {
  const handle = creatorHandle || "@creator";
  const text = (messageText || "").trim();
  const lower = text.toLowerCase();

  // 1. Custom phrasing: agreement / invest / ready / sign / paperwork
  if (lower.includes("agreement") || lower.includes("invest") || lower.includes("paperwork") || lower.includes("sign") || lower.includes("ready")) {
    return `Hi ${handle},\n\nWe love your enthusiasm regarding "${text}" and are thrilled that you're ready to partner on the ${camp.title}!\n\nI have attached our official Creator Agreement and campaign onboarding deck covering the full scope (${camp.deliverables}). Please review and sign at your earliest convenience so our logistics team can dispatch your ${camp.productName} review kit.\n\nLooking forward to a stellar launch!\n\nBest regards,\nAURA Talent Partnerships`;
  }

  // 2. Pricing / rates / budget specific wording
  if (intent === "pricing_query" || lower.includes("rate") || lower.includes("budget") || lower.includes("cpm") || lower.includes("pay") || lower.includes("cost")) {
    return `Hi ${handle},\n\nThanks for reaching out regarding "${text}"!\n\nFor the ${camp.title}, our dedicated sponsorship budget pool is ${camp.budgetPool}, structured around our target deliverables (${camp.deliverables}). I have attached our formal Rate Card PDF and Tier Schedule.\n\nPlease let us know which package matches your standard creator rates so we can reserve your spot in the campaign queue.\n\nBest regards,\nAURA Talent Partnerships`;
  }

  // 3. Availability / launch date / scheduling specific wording
  if (intent === "availability_query" || lower.includes("when") || lower.includes("date") || lower.includes("travel") || lower.includes("schedule") || lower.includes("timeline")) {
    return `Hi ${handle},\n\nThank you for asking about timing in response to "${text}"!\n\nOur primary target launch date for the ${camp.productName} is scheduled for ${camp.launchDate}. If you have travel or calendar conflicts around that window, we have built in flexible publishing slots extending 2 weeks after launch.\n\nHere is our scheduling link to pick a 10-minute onboarding window that works best for your calendar.\n\nBest regards,\nAURA Talent Partnerships`;
  }

  // 4. Interested / enthusiastic confirmation
  if (intent === "interested") {
    return `Hi ${handle},\n\nThank you for confirming! We're excited by your message ("${text}") and would love to have you represent ${camp.title}.\n\nI have moved your profile into our Active Talent Pipeline. Please reply with your shipping address and preferred media kit link so we can send out your ${camp.productName} unit and onboarding brief today.\n\nBest regards,\nAURA Talent Partnerships`;
  }

  // 5. Pass / decline / not interested
  if (intent === "not_interested") {
    return `Hi ${handle},\n\nThank you so much for your prompt heads up ("${text}"). We completely respect your schedule and exclusivity priorities.\n\nWe have logged a polite pass for this quarter so you won't receive any further follow-ups. We would love to reconnect for our upcoming Q4 product launches when your calendar opens up.\n\nBest regards,\nAURA Talent Partnerships`;
  }

  // 6. Unclear / management check / multi-question
  return `Hi ${handle},\n\nThank you for following up on the ${camp.title} with "${text}".\n\nWe want to ensure we align smoothly on both deliverables (${camp.deliverables}) and launch timing (${camp.launchDate}). Would you or your management team be open to a quick 10-minute sync this week to review the creative brief?\n\nBest regards,\nAURA Talent Partnerships`;
}

// ============================================================================
// 5. CLIENT-SIDE CONTROLLER & TAB SWITCHING
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  refreshEngineStatus();
  initTabSwitching();
  await hydrateInboxFromApi();
  renderInboxQueue();
  selectCreatorMessage(CREATOR_INBOX_QUEUE[0]?.id);
  runBatchClassification();
  initEventListeners();
  initIntelligenceEvents();
  initWorkspaceMotion();
  initTactileAnimations();
  playViewEntrance(document.getElementById("view-inbox"));
});

function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  const storedTheme = localStorage.getItem("aura-theme");
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  applyTheme(storedTheme || preferredTheme);
  toggle?.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  const toggle = document.getElementById("themeToggle");
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  localStorage.setItem("aura-theme", isDark ? "dark" : "light");

  if (toggle) {
    toggle.textContent = isDark ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-pressed", String(isDark));
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The CRM request failed.");
  return data;
}

function storedReplyToInbox(reply) {
  const handle = reply.creator_handle || "@creator";
  return {
    id: reply.id,
    handle,
    name: reply.display_name || handle.replace("@", ""),
    avatar: handle.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase() || "CR",
    platform: `${reply.platform} - ${new Date(reply.received_at).toLocaleString()}`,
    text: reply.raw_message,
    persisted: true,
    categoryOverride: null,
    serverPrediction: {
      intent: reply.predicted_intent || "unclear",
      confidence: Number(reply.intent_confidence || 0.72),
      rationale: reply.intent_rationale || "Stored CRM classification.",
      signals: [],
      emotionData: classifyReplyIntent(reply.raw_message).emotionData
    }
  };
}

async function hydrateInboxFromApi() {
  try {
    const data = await apiRequest("/api/v1/replies");
    if (!data.replies?.length) return;
    CREATOR_INBOX_QUEUE.splice(0, CREATOR_INBOX_QUEUE.length, ...data.replies.map(storedReplyToInbox));
  } catch (error) {
    // Keep the embedded demo queue available until PostgreSQL is configured.
  }
}

async function refreshEngineStatus() {
  const statusText = document.getElementById("backendStatusText");
  if (!statusText) return;
  try {
    const res = await fetch("/api/v1/health");
    if (!res.ok) throw new Error("health check failed");
    const data = await res.json();
    statusText.textContent = data.ai_provider === "nvidia_nemotron"
      ? "Drafting service ready"
      : "Grounded replies ready";
  } catch (err) {
    statusText.textContent = "Local preview mode";
  }
}

function initTabSwitching() {
  const tabButtons = document.querySelectorAll(".nav-tab");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      activateView(btn.getAttribute("data-view"));
    });

    btn.addEventListener("keydown", (event) => {
      const tabs = Array.from(document.querySelectorAll(".nav-tab"));
      const currentIndex = tabs.indexOf(btn);
      let nextIndex = null;

      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      const nextTab = tabs[nextIndex];
      nextTab.focus();
      activateView(nextTab.getAttribute("data-view"), { shouldScroll: false });
    });
  });
}

function activateView(viewId, { shouldScroll = true } = {}) {
  if (!viewId) return;
  const targetView = document.getElementById(viewId);
  if (!targetView) return;

  document.querySelectorAll(".nav-tab").forEach(tab => {
    const isActive = tab.getAttribute("data-view") === viewId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  document.querySelectorAll(".view-container").forEach(view => {
    const isActive = view.id === viewId;
    view.classList.toggle("active", isActive);
    view.hidden = !isActive;
  });

  playViewEntrance(targetView);
  if (viewId === "view-review") loadReviewQueue();
  if (viewId === "view-intelligence") loadIntelligence();
  if (shouldScroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function initWorkspaceMotion() {
  document.querySelectorAll(
    ".campaign-header-card, .challenge-status-grid, .reader-box, .analysis-cards-row, .crm-action-strip, .llm-card, .content-wrapper"
  ).forEach(element => element.classList.add("motion-item"));
}

function initTactileAnimations() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    button.classList.remove("press-flash");
    requestAnimationFrame(() => button.classList.add("press-flash"));
    window.setTimeout(() => button.classList.remove("press-flash"), 360);
  });
}

function playViewEntrance(view) {
  if (!view || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const items = view.querySelectorAll(".motion-item");
  items.forEach((item, index) => {
    item.classList.remove("motion-visible");
    item.style.setProperty("--motion-delay", `${Math.min(index * 55, 260)}ms`);
  });
  requestAnimationFrame(() => {
    items.forEach(item => item.classList.add("motion-visible"));
  });
}

// ============================================================================
// 6. INBOX RENDERING & SEARCH/FILTERING
// ============================================================================
function renderInboxQueue() {
  const scrollArea = document.getElementById("inboxScrollArea");
  if (!scrollArea) return;

  const countHeader = document.getElementById("inboxCountHeader");

  const filtered = CREATOR_INBOX_QUEUE.filter(item => {
    const prediction = getMessagePrediction(item);
    const intentMatch = activeFilter === "all" || prediction.intent === activeFilter;
    const searchMatch = !searchTerm ||
      item.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.text.toLowerCase().includes(searchTerm.toLowerCase());
    return intentMatch && searchMatch;
  });

  if (countHeader) {
    countHeader.textContent = `Agency Inbox Queue (${filtered.length})`;
  }

  scrollArea.innerHTML = "";

  filtered.forEach(item => {
    const prediction = getMessagePrediction(item);
    const meta = getAutomatedCrmMetadata(prediction.intent, prediction.confidence);
    const confPercent = Math.round(prediction.confidence * 100);

    const cardEl = document.createElement("button");
    cardEl.type = "button";
    cardEl.className = `inbox-card${item.id === selectedMessageId ? " selected" : ""}`;
    cardEl.setAttribute("data-id", item.id);
    cardEl.setAttribute("aria-pressed", String(item.id === selectedMessageId));
    cardEl.setAttribute("aria-label", `${item.handle}, ${meta.label}, ${confPercent}% confidence`);

    cardEl.innerHTML = `
      <div class="card-header-line">
        <span class="handle-name">${escapeHtml(item.handle)}</span>
        <span class="time-label">${escapeHtml(item.avatar)}</span>
      </div>
      <div class="platform-sub">${escapeHtml(item.platform)}</div>
      <div class="message-snippet">${escapeHtml(item.text)}</div>
      <span class="intent-pill ${meta.badgeClass}">${meta.label} (${confPercent}%)</span>
    `;

    cardEl.addEventListener("click", () => {
      document.querySelectorAll(".inbox-card").forEach(c => {
        c.classList.remove("selected");
        c.setAttribute("aria-pressed", "false");
      });
      cardEl.classList.add("selected");
      cardEl.setAttribute("aria-pressed", "true");
      selectCreatorMessage(item.id);
    });

    scrollArea.appendChild(cardEl);
  });
}

// ============================================================================
// 7. MESSAGE SELECTION & ANIMATION HOOKS (BUG-FREE SIGNALS JOIN)
// ============================================================================
async function selectCreatorMessage(msgId) {
  const msg = CREATOR_INBOX_QUEUE.find(m => m.id === msgId);
  if (!msg) return;
  selectedMessageId = msgId;

  const camp = CAMPAIGN_CATALOG[activeCampaignId] || CAMPAIGN_CATALOG.hardware;
  const prediction = getMessagePrediction(msg);
  const meta = getAutomatedCrmMetadata(prediction.intent, prediction.confidence);
  const localAnswer = getLocalAiAnswer(msg.text, prediction.intent, camp);

  // Trigger tactile card pop animation
  const readerBox = document.getElementById("readerBoxContainer");
  const predictionCard = document.getElementById("predictionCardContainer");
  const emotionCard = document.getElementById("emotionCardContainer");
  if (readerBox) {
    readerBox.classList.remove("animate-pop");
    void readerBox.offsetWidth;
    readerBox.classList.add("animate-pop");
  }
  if (predictionCard) {
    predictionCard.classList.remove("animate-pop");
    void predictionCard.offsetWidth;
    predictionCard.classList.add("animate-pop");
  }
  if (emotionCard) {
    emotionCard.classList.remove("animate-pop");
    void emotionCard.offsetWidth;
    emotionCard.classList.add("animate-pop");
  }

  const avatarEl = document.getElementById("readerAvatar");
  const handleEl = document.getElementById("readerHandle");
  const platformEl = document.getElementById("readerPlatform");
  const idEl = document.getElementById("readerId");
  const textEl = document.getElementById("readerMessageText");
  const badgeEl = document.getElementById("readerIntentBadge");
  const confEl = document.getElementById("readerConfidence");
  const confBarEl = document.getElementById("readerConfidenceBar");
  const rationaleEl = document.getElementById("readerRationale");
  const crmPillEl = document.getElementById("readerCrmPill");
  const overrideSelect = document.getElementById("overrideIntentSelect");
  const draftEl = document.getElementById("readerLlmDraft");
  const reasoningEl = document.getElementById("readerLlmReasoning");

  // Emotion UI hooks
  const emotionBadgeEl = document.getElementById("readerEmotionBadge");
  const emotionScoreEl = document.getElementById("readerSentimentScore");
  const emotionBarEl = document.getElementById("readerEmotionBar");
  const emotionRationaleEl = document.getElementById("readerEmotionRationale");
  const sentimentLabelEl = document.getElementById("readerSentimentLabel");

  if (avatarEl) avatarEl.textContent = msg.avatar;
  if (handleEl) handleEl.textContent = msg.handle;
  if (platformEl) platformEl.textContent = msg.platform;
  if (idEl) idEl.textContent = `Record: #${msg.id}`;
  if (textEl) textEl.textContent = msg.text;

  if (badgeEl) {
    badgeEl.className = `intent-tag-hero ${meta.badgeClass}`;
    badgeEl.textContent = meta.label;
  }

  const confPercent = Math.round((prediction.confidence || 0.90) * 100);
  if (confEl) {
    confEl.textContent = `${confPercent}% Confidence`;
  }
  animateMeter(confBarEl, confPercent);

  const signalsList = Array.isArray(prediction.signals) && prediction.signals.length > 0
    ? prediction.signals.join(", ")
    : "semantic_nlp";

  if (rationaleEl) {
    rationaleEl.textContent = `${prediction.rationale} Signals detected: [${signalsList}].`;
  }

  // Populate Emotion & Tone UI Card
  const em = prediction.emotionData || {
    emotion: "Balanced & Professional",
    sentiment: "Neutral Professional",
    intensity: 80,
    badgeClass: "emotion-professional",
    toneRationale: "Clear, straightforward communication style with balanced emotional tone."
  };

  if (emotionBadgeEl) {
    emotionBadgeEl.className = `emotion-badge ${em.badgeClass}`;
    emotionBadgeEl.textContent = em.emotion;
  }
  if (emotionScoreEl) {
    emotionScoreEl.textContent = `${em.intensity}% Intensity`;
  }
  animateMeter(emotionBarEl, em.intensity);
  if (emotionRationaleEl) {
    emotionRationaleEl.textContent = em.toneRationale;
  }
  if (sentimentLabelEl) {
    sentimentLabelEl.textContent = em.sentiment;
  }

  if (crmPillEl) {
    crmPillEl.innerHTML = meta.pillHtml;
  }

  renderAiAnswer(localAnswer);

  if (overrideSelect) {
    overrideSelect.value = prediction.intent;
  }

  // Set initial deeply contextualized draft
  const contextualDraft = generateDynamicResponse(msg.text, prediction.intent, msg.handle, camp);
  if (draftEl) draftEl.value = contextualDraft;
  if (reasoningEl) {
    reasoningEl.textContent = `Decision context: answering the creator's ${localAnswer.question_type.toLowerCase()} with approved campaign facts.`;
  }

  // Persisted replies have already been classified and audited by the server.
  if (!msg.persisted) {
    fetchBackgroundAIAnalysis(msg.text, prediction.intent, msg.handle, camp);
  }
}

// ============================================================================
// 8. BACKGROUND API ENRICHMENT WITH ROBUST FALLBACK & LIVE FEEDBACK
// ============================================================================
async function fetchBackgroundAIAnalysis(messageText, intent, creatorHandle, camp) {
  const draftEl = document.getElementById("readerLlmDraft");
  const reasoningEl = document.getElementById("readerLlmReasoning");

  try {
    const res = await fetch("/api/v1/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageText,
        campaign_title: camp.title,
        campaign_budget: camp.budgetPool,
        deliverables: camp.deliverables,
        launch_date: camp.launchDate,
        product_name: camp.productName,
        creator_name: creatorHandle || "@creator"
      })
    });

    if (res.ok) {
      const data = await res.json();

      // Extract from backend API response object
      const draftReply = data?.llm_draft?.draft_reply || data?.llm_draft;
      const reasoningText = data?.llm_draft?.reasoning || data?.rationale;
      const sourceEngine = data?.llm_draft?.source || "Grounded AI Engine";
      const aiAnswer = data?.ai_answer || data?.llm_draft?.ai_answer;

      if (typeof draftReply === "string" && draftReply.trim().length > 10 && draftEl) {
        draftEl.value = draftReply;
      }
      if (typeof reasoningText === "string" && reasoningText.trim().length > 0 && reasoningEl) {
        reasoningEl.textContent = `Draft ready (${sourceEngine}): ${reasoningText}`;
      }
      if (aiAnswer) {
        renderAiAnswer(aiAnswer);
      }
      return;
    }
  } catch (err) {
    // API server not reachable or static environment - fallback seamlessly.
  }

  // Ensure high-quality AI rationale is displayed even in local file/offline mode
  if (reasoningEl) {
    reasoningEl.textContent = `Draft prepared from campaign terms and creator phrasing (${camp.deliverables}).`;
  }
}

// ============================================================================
// 9. EVENT LISTENERS & ACCORDION SLIDE DRAWER
// ============================================================================
function initEventListeners() {
  const campaignSelector = document.getElementById("campaignSelector");
  if (campaignSelector) {
    campaignSelector.addEventListener("change", (e) => {
      activeCampaignId = e.target.value;
      const camp = CAMPAIGN_CATALOG[activeCampaignId] || CAMPAIGN_CATALOG.hardware;
      const titleEl = document.getElementById("activeCampaignTitle");
      const subEl = document.getElementById("activeCampaignSub");
      if (titleEl) titleEl.textContent = `Active Campaign: ${camp.title}`;
      if (subEl) subEl.textContent = `${camp.subtitle}`;
      selectCreatorMessage(CREATOR_INBOX_QUEUE[0]?.id);
    });
  }

  const searchInput = document.getElementById("inboxSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.trim();
      renderInboxQueue();
    });
  }

  const filterContainer = document.getElementById("filterChipContainer");
  if (filterContainer) {
    filterContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-chip");
      if (!btn) return;
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.getAttribute("data-filter") || "all";
      renderInboxQueue();
    });
  }

  // Accessible sandbox disclosure with a natural page-level slide.
  const btnToggleCustomBox = document.getElementById("btnToggleCustomBox");
  const btnCloseSlideDrawer = document.getElementById("btnCloseSlideDrawer");
  const slideDrawer = document.getElementById("customSlideDrawer");

  if (btnToggleCustomBox && slideDrawer) {
    btnToggleCustomBox.addEventListener("click", () => {
      setDrawerOpen(!slideDrawer.classList.contains("open"));
    });
  }

  if (btnCloseSlideDrawer && slideDrawer) {
    btnCloseSlideDrawer.addEventListener("click", () => {
      setDrawerOpen(false);
      btnToggleCustomBox?.focus();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && slideDrawer?.classList.contains("open")) {
      setDrawerOpen(false);
      btnToggleCustomBox?.focus();
    }
  });

  // ANALYZE CUSTOM CREATOR MESSAGE
  const btnAnalyzeCustom = document.getElementById("btnAnalyzeCustom");
  if (btnAnalyzeCustom) {
    btnAnalyzeCustom.addEventListener("click", async () => {
      const textarea = document.getElementById("customMessageText");
      if (!textarea) return;
      const customText = textarea.value.trim();
      if (!customText) return;

      let message;
      try {
        btnAnalyzeCustom.disabled = true;
        btnAnalyzeCustom.textContent = "Classifying...";
        const result = await apiRequest("/api/v1/classify", { method: "POST", body: JSON.stringify({ message: customText, creator_handle: "@custom.partner", campaign_id: campaignApiId(), platform: "Custom Message Sandbox" }) });
        message = {
          id: result.reply_id, handle: "@custom.partner", name: "Custom Partner Creator", avatar: "CP", platform: "Custom Message Sandbox - Just now", text: customText, persisted: true, categoryOverride: null,
          serverPrediction: { intent: result.intent, confidence: result.confidence, rationale: result.rationale, signals: result.signals || [], emotionData: classifyReplyIntent(customText).emotionData }
        };
      } catch (error) {
        message = { id: `custom_${Date.now()}`, handle: "@custom.partner", name: "Custom Partner Creator", avatar: "CP", platform: "Offline Sandbox - Just now", text: customText, categoryOverride: null };
        showToast(error.message);
      } finally {
        btnAnalyzeCustom.disabled = false;
        btnAnalyzeCustom.textContent = "Classify & Draft Tailored Response";
      }
      CREATOR_INBOX_QUEUE.unshift(message);

      searchTerm = "";
      activeFilter = "all";
      if (document.getElementById("inboxSearchInput")) document.getElementById("inboxSearchInput").value = "";
      document.querySelectorAll(".filter-chip").forEach(c => {
        c.classList.toggle("active", c.getAttribute("data-filter") === "all");
      });

      renderInboxQueue();
      selectCreatorMessage(message.id);

      setDrawerOpen(false);

      showToast("Custom creator reply classified and draft generated.");
    });
  }

  const btnSaveOverride = document.getElementById("btnSaveOverride");
  if (btnSaveOverride) {
    btnSaveOverride.addEventListener("click", async () => {
      const message = CREATOR_INBOX_QUEUE.find(item => item.id === selectedMessageId);
      const override = document.getElementById("overrideIntentSelect")?.value;
      if (!message || !override) return;
      message.categoryOverride = override;
      if (message.persisted) {
        try {
          const result = await apiRequest(`/api/v1/replies/${message.id}/override`, { method: "PATCH", body: JSON.stringify({ corrected_intent: override, rationale: "Inbox manager correction" }) });
          message.serverPrediction = { ...message.serverPrediction, intent: result.reply.predicted_intent, confidence: 0.99, rationale: result.reply.intent_rationale };
        } catch (error) {
          showToast(error.message);
        }
      }
      renderInboxQueue();
      selectCreatorMessage(message.id);
      showToast("Human audit override saved and reflected in the inbox.");
    });
  }

  const btnCopyReply = document.getElementById("btnCopyReply");
  if (btnCopyReply) {
    btnCopyReply.addEventListener("click", async () => {
      const draftEl = document.getElementById("readerLlmDraft");
      if (!draftEl?.value) return;
      try {
        await navigator.clipboard.writeText(draftEl.value);
      } catch (error) {
        draftEl.select();
        document.execCommand("copy");
      }
      btnCopyReply.textContent = "Copied";
      setTimeout(() => {
        btnCopyReply.textContent = "Copy Response";
      }, 1800);
    });
  }

  const btnSendReply = document.getElementById("btnSendReply");
  if (btnSendReply) {
    btnSendReply.addEventListener("click", () => {
      executeCrmAction(btnSendReply);
    });
  }

  const btnRunBatchText = document.getElementById("btnRunBatchText");
  if (btnRunBatchText) {
    btnRunBatchText.addEventListener("click", async () => {
      runBatchClassification();
      try {
        const messages = document.getElementById("batchTextarea").value.split("\n").map(line => line.trim()).filter(Boolean);
        const batch = await apiRequest("/api/v1/batches", { method: "POST", body: JSON.stringify({ messages, campaign_id: campaignApiId(), platform: "Batch workspace" }) });
        showToast(`Batch persisted: ${batch.results.length} replies processed.`);
      } catch (error) {
        showToast(`Batch preview completed. ${error.message}`);
      }
    });
  }

  const btnSimulateWebhook = document.getElementById("btnSimulateWebhook");
  if (btnSimulateWebhook) {
    btnSimulateWebhook.addEventListener("click", simulateIncomingReply);
  }

  const btnClassifyAll18 = document.getElementById("btnClassifyAll18");
  if (btnClassifyAll18) {
    btnClassifyAll18.addEventListener("click", classifyFullInboxIntoBatch);
  }

  const btnExportJson = document.getElementById("btnExportJson");
  if (btnExportJson) {
    btnExportJson.addEventListener("click", () => {
      exportBatchAsJson();
    });
  }

  const btnExportCsv = document.getElementById("btnExportCsv");
  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", () => {
      exportBatchAsCsv();
    });
  }
}

function setDrawerOpen(isOpen) {
  const drawer = document.getElementById("customSlideDrawer");
  const toggle = document.getElementById("btnToggleCustomBox");
  if (!drawer || !toggle) return;

  toggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    drawer.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add("open");
      drawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
      document.getElementById("customMessageText")?.focus();
    });
    return;
  }

  drawer.classList.remove("open");
  window.setTimeout(() => {
    if (!drawer.classList.contains("open")) drawer.hidden = true;
  }, 360);
}

async function executeCrmAction(button) {
  const message = CREATOR_INBOX_QUEUE.find(item => item.id === selectedMessageId);
  if (!message) return;

  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  const originalText = button.textContent;
  button.textContent = "Executing...";

  try {
    if (!message.persisted) {
      const result = await apiRequest("/api/v1/classify", { method: "POST", body: JSON.stringify({ message: message.text, creator_handle: message.handle, campaign_id: campaignApiId(), platform: message.platform }) });
      message.id = result.reply_id;
      message.persisted = true;
    }
    await apiRequest(`/api/v1/replies/${message.id}/actions`, { method: "POST", body: JSON.stringify({ action_type: "manager_approved", detail: "Manager approved the proposed reply and simulated CRM action." }) });
    showToast("CRM approval recorded in the persistent action timeline.");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = originalText;
  }
}

// ============================================================================
// 10. BATCH CLASSIFICATION & EXPORT HELPERS
// ============================================================================
function runBatchClassification() {
  const batchTextarea = document.getElementById("batchTextarea");
  const tableBody = document.getElementById("batchResultsTableBody");
  if (!batchTextarea || !tableBody) return;

  const lines = batchTextarea.value
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  tableBody.innerHTML = "";

  lines.forEach((line, idx) => {
    const pred = classifyReplyIntent(line);
    const meta = getAutomatedCrmMetadata(pred.intent, pred.confidence);
    const confPercent = Math.round((pred.confidence || 0.90) * 100);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="batch-reply-cell">${escapeHtml(line)}</td>
      <td><span class="intent-pill ${meta.badgeClass}">${meta.label}</span></td>
      <td>${confPercent}%</td>
      <td style="font-size: 12px;">${meta.pillHtml}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function exportBatchAsJson() {
  const batchTextarea = document.getElementById("batchTextarea");
  if (!batchTextarea) return;
  const lines = batchTextarea.value.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const exportData = lines.map((line, idx) => {
    const pred = classifyReplyIntent(line);
    return {
      id: idx + 1,
      replyText: line,
      predictedIntent: pred.intent,
      confidence: pred.confidence,
      signalsDetected: pred.signals || []
    };
  });

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "aura_batch_classification_results.json";
  a.click();
  URL.revokeObjectURL(url);
}

function exportBatchAsCsv() {
  const batchTextarea = document.getElementById("batchTextarea");
  if (!batchTextarea) return;
  const lines = batchTextarea.value.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  let csvContent = "ID,Reply Text,Predicted Intent,Confidence\n";
  lines.forEach((line, idx) => {
    const pred = classifyReplyIntent(line);
    const escapedText = `"${line.replace(/"/g, '""')}"`;
    csvContent += `${idx + 1},${escapedText},${pred.intent},${Math.round((pred.confidence || 0.90) * 100)}%\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "aura_batch_classification_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function simulateIncomingReply() {
  const samples = [
    "What is the budget if we add usage rights for paid ads?",
    "I am traveling until launch week. Can we publish the week after?",
    "Looks good, send the contract and shipping form.",
    "Sorry, we cant collaborate this quarter.",
    "Can you clarify the exact deliverables and exclusivity terms?"
  ];
  const text = samples[Math.floor(Math.random() * samples.length)];
  let message = { id: `sim_${Date.now()}`, handle: "@new.creator", name: "New Creator", avatar: "NC", platform: "Webhook Simulation - Just now", text, categoryOverride: null };
  try {
    const result = await apiRequest("/api/v1/webhook/reply", { method: "POST", body: JSON.stringify({ message: text, creator_handle: "@new.creator", campaign_id: campaignApiId(), platform: "Webhook Simulation" }) });
    message = { ...message, id: result.reply_id, persisted: true, serverPrediction: { intent: result.intent, confidence: result.confidence, rationale: result.rationale, signals: result.signals || [], emotionData: classifyReplyIntent(text).emotionData } };
  } catch (error) {
    showToast(error.message);
  }
  CREATOR_INBOX_QUEUE.unshift(message);
  activeFilter = "all";
  searchTerm = "";
  const searchInput = document.getElementById("inboxSearchInput");
  if (searchInput) searchInput.value = "";
  document.querySelectorAll(".filter-chip").forEach(c => {
    c.classList.toggle("active", c.getAttribute("data-filter") === "all");
  });
  renderInboxQueue();
  selectCreatorMessage(message.id);
  showToast("Simulated incoming reply classified and routed.");
}

function classifyFullInboxIntoBatch() {
  const batchTextarea = document.getElementById("batchTextarea");
  if (batchTextarea) {
    batchTextarea.value = CREATOR_INBOX_QUEUE.map(item => item.text).join("\n");
  }
  runBatchClassification();
  activateView("view-batch");
  showToast("Full inbox classified into the batch analysis table.");
}

function showToast(msg) {
  const toast = document.getElementById("toastNotification");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
}

function intentLabel(intent) {
  return String(intent || "unclear").replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

async function loadReviewQueue() {
  const body = document.getElementById("reviewQueueBody");
  const summary = document.getElementById("reviewSummary");
  if (!body || !summary) return;
  summary.innerHTML = '<div class="review-stat"><span>Loading</span><strong>Review queue</strong></div>';
  try {
    const data = await apiRequest("/api/v1/review-queue");
    summary.innerHTML = `<div class="review-stat"><span>Needs review</span><strong>${data.count}</strong></div><div class="review-stat"><span>Policy</span><strong>Human approval</strong></div>`;
    body.innerHTML = data.replies.map(reply => `
      <tr>
        <td><strong>${escapeHtml(reply.creator_handle)}</strong><br><span class="time-label">${escapeHtml(reply.platform)}</span></td>
        <td>${escapeHtml(reply.raw_message)}</td>
        <td>${escapeHtml(intentLabel(reply.predicted_intent))}</td>
        <td>${Math.round(Number(reply.intent_confidence || 0) * 100)}%</td>
        <td><div class="review-action"><select data-review-select="${reply.id}">${["interested", "pricing_query", "availability_query", "not_interested", "unclear"].map(intent => `<option value="${intent}"${intent === reply.predicted_intent ? " selected" : ""}>${escapeHtml(intentLabel(intent))}</option>`).join("")}</select><button type="button" class="btn-secondary" data-review-save="${reply.id}">Save</button><button type="button" class="btn-secondary" data-timeline="${reply.id}">Timeline</button></div></td>
      </tr>`).join("") || '<tr><td colspan="5">No replies need manager review.</td></tr>';
  } catch (error) {
    summary.textContent = error.message;
  }
}

async function loadTimeline(replyId) {
  const target = document.getElementById("replyTimeline");
  if (!target) return;
  target.textContent = "Loading reply history...";
  try {
    const data = await apiRequest(`/api/v1/replies/${replyId}/timeline`);
    target.innerHTML = data.timeline.map(event => `<div class="timeline-event"><strong>${escapeHtml(event.type)}: ${escapeHtml(event.title)}</strong><span>${escapeHtml(event.detail || "")} - ${new Date(event.created_at).toLocaleString()}</span></div>`).join("") || "No timeline events are available.";
  } catch (error) {
    target.textContent = error.message;
  }
}

async function loadIntelligence() {
  const analytics = document.getElementById("analyticsGrid");
  const knowledge = document.getElementById("knowledgeList");
  if (!analytics || !knowledge) return;
  analytics.innerHTML = '<div class="analytics-stat"><span>Loading</span><strong>CRM data</strong></div>';
  try {
    const [metrics, knowledgeData] = await Promise.all([
      apiRequest("/api/v1/analytics"),
      apiRequest(`/api/v1/campaigns/${campaignApiId()}/knowledge`)
    ]);
    const summary = metrics.summary || {};
    analytics.innerHTML = [["Replies stored", summary.total_replies || 0], ["Average confidence", `${Math.round(Number(summary.average_confidence || 0) * 100)}%`], ["Review queue", summary.review_queue_count || 0], ["Human overrides", metrics.override_count || 0]].map(([label, value]) => `<div class="analytics-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
    knowledge.innerHTML = knowledgeData.knowledge.map(item => `<article class="knowledge-item"><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.content)}</p></article>`).join("") || "<p>No campaign knowledge has been added.</p>";
  } catch (error) {
    analytics.textContent = error.message;
    knowledge.textContent = "Campaign intelligence is unavailable until PostgreSQL is reachable.";
  }
}

function initIntelligenceEvents() {
  document.getElementById("reviewQueueBody")?.addEventListener("click", async event => {
    const timelineButton = event.target.closest("[data-timeline]");
    const saveButton = event.target.closest("[data-review-save]");
    if (timelineButton) return loadTimeline(timelineButton.dataset.timeline);
    if (!saveButton) return;
    const replyId = saveButton.dataset.reviewSave;
    const select = document.querySelector(`[data-review-select="${replyId}"]`);
    try {
      saveButton.disabled = true;
      await apiRequest(`/api/v1/replies/${replyId}/override`, { method: "PATCH", body: JSON.stringify({ corrected_intent: select.value, rationale: "Reviewed in AURA CRM" }) });
      showToast("Human review saved and added to the learning audit.");
      loadReviewQueue();
      loadIntelligence();
    } catch (error) {
      showToast(error.message);
    } finally {
      saveButton.disabled = false;
    }
  });
  document.getElementById("knowledgeForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const label = document.getElementById("knowledgeLabel");
    const content = document.getElementById("knowledgeContent");
    const type = document.getElementById("knowledgeType");
    try {
      await apiRequest(`/api/v1/campaigns/${campaignApiId()}/knowledge`, { method: "POST", body: JSON.stringify({ knowledge_type: type.value, label: label.value.trim(), content: content.value.trim() }) });
      event.target.reset();
      showToast("Campaign fact added to the grounded answer engine.");
      loadIntelligence();
    } catch (error) {
      showToast(error.message);
    }
  });
}
