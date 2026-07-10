#!/usr/bin/env node

/**
 * ============================================================================
 * AURA // CREATOR REPLY-INTENT CLASSIFIER - COMMAND LINE INTERFACE (CLI)
 * Minimal script that takes a message as input and prints predicted intent & confidence.
 * ============================================================================
 */

const { classifyReplyIntent } = require('./classifier.js');

const inputMessage = process.argv.slice(2).join(" ");

if (!inputMessage) {
  console.log("Usage: node cli.js \"<creator reply message>\"");
  console.log("Example: node cli.js \"omg yes I'm so down for this, when do we start?\"");
  process.exit(0);
}

const result = classifyReplyIntent(inputMessage);

// Output strictly formatted JSON response
console.log(JSON.stringify({
  intent: result.intent,
  confidence: result.confidence,
  rationale: result.rationale
}, null, 2));
