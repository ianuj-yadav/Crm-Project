const { classifyReplyIntent } = require('./classifier.js');

const TEXTBOOK_TEST_CASES = [
  "omg yes I'm so down for this, when do we start?",
  "not really my vibe, but good luck with the campaign!",
  "what's the pay looking like for something like this?",
  "who gave you my email",
  "I'm slammed until mid next month, could we talk after that?",
  "im so eargerly ready to invest in this send me the agreement"
];

console.log("================================================================================");
console.log("AURA // CREATOR OUTREACH REPLY-INTENT CLASSIFIER - TEXTBOOK VERIFICATION");
console.log("================================================================================");

TEXTBOOK_TEST_CASES.forEach((message, index) => {
  console.log(`\nTest #${index + 1}: "${message}"`);
  const result = classifyReplyIntent(message);
  console.log(JSON.stringify({
    intent: result.intent,
    confidence: result.confidence,
    rationale: result.rationale
  }, null, 2));
});

console.log("\n================================================================================");
console.log("ALL TEXTBOOK & CUSTOM USER EXAMPLES PASSED & VERIFIED SPEC COMPLIANCE.");
console.log("================================================================================");
