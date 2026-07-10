const db = require('./db.js');
const { classifyReplyIntent } = require('../../classifier.js');

const campaigns = [
  { id: 'camp_ai_hardware', title: 'AI Hardware Launch - Q3 Creator Blitz', brand: 'AURA Robotics', budget_pool: 25000, deliverables: '1x Dedicated YouTube Review (10m+) + 2x IG Reels', launch_date: '2026-08-15', status: 'active' },
  { id: 'camp_fintech_wallet', title: 'FinTech Smart Wallet - Creator Ambassadorship', brand: 'VaultPay', budget_pool: 40000, deliverables: '3x Integrated TikTok Spots + 1x Newsletter Mention', launch_date: '2026-09-01', status: 'active' },
  { id: 'camp_indie_gaming', title: 'Indie Gaming Studio - RPG Early Access Sprint', brand: 'Aether Studio', budget_pool: 15000, deliverables: '2x Dedicated Twitch Streams + 2x YouTube Shorts', launch_date: '2026-07-28', status: 'active' }
];

const knowledge = [
  ['camp_ai_hardware', 'budget', 'Budget guidance', 'The total campaign budget pool is $25,000. Ask for the creator package rate before confirming a final amount.'],
  ['camp_ai_hardware', 'usage_rights', 'Usage rights', 'Paid usage rights require human account-manager approval before any commitment.'],
  ['camp_ai_hardware', 'timeline', 'Launch timing', 'Target launch is August 15, 2026. Publishing has a two-week flexibility window.'],
  ['camp_fintech_wallet', 'eligibility', 'Regional eligibility', 'This campaign accepts US and UK creators. Financial product claims require a compliance review.'],
  ['camp_indie_gaming', 'assets', 'Review unit', 'Early-access keys are sent after the agreement and content schedule are approved.']
];

const replies = [
  ['@alex.vlogs', 'Alex Rivera', 'Instagram DM', 'Omg so down for this!! But what is the budget pool for a dedicated 10m YouTube video?'],
  ['@tech.with.sam', 'Sam Chen', 'Email', 'Not taking on new brand partnerships this quarter, thank you.'],
  ['@gaming.marcus', 'Marcus Vance', 'Twitter/X DM', "Sounds amazing! Let's do it, send over the agreement!"],
  ['@chloe.lifestyle', 'Chloe Bennett', 'Instagram DM', 'When is the launch target date? I am traveling until August 10th.'],
  ['@dev.sara', 'Sara Jenkins', 'Email', 'Let me check with my management team and get back to you next week.'],
  ['@gadget.guru', 'Leo Thorne', 'Email', 'I love the product specs! Do you offer usage rights for paid ads booster?']
];

async function seedDatabase() {
  const existing = await db.getAllCampaigns();
  if (existing.length) return { seeded: false, campaigns: existing.length };
  for (const campaign of campaigns) await db.upsertCampaign(campaign);
  for (const [campaignId, knowledgeType, label, content] of knowledge) {
    await db.addCampaignKnowledge({ campaignId, knowledgeType, label, content, source: 'seed' });
  }
  for (const [index, [handle, displayName, platform, rawMessage]] of replies.entries()) {
    const creator = await db.upsertCreator({ id: `creator_seed_${index + 1}`, handle, display_name: displayName, platform, followers: 100000 + index * 50000, engagement_rate: 4 + index / 10 });
    const prediction = classifyReplyIntent(rawMessage);
    const reply = await db.createReply({ campaign_id: 'camp_ai_hardware', creator_id: creator.id, creator_handle: handle, platform, raw_message: rawMessage, status: prediction.intent === 'unclear' ? 'needs_review' : 'auto_actioned', predicted_intent: prediction.intent, intent_confidence: prediction.confidence, intent_rationale: prediction.rationale, decision_source: 'deterministic_rules', requires_human_review: prediction.intent === 'unclear' });
    await db.createClassificationRun({ replyId: reply.id, intent: prediction.intent, confidence: prediction.confidence, rationale: prediction.rationale, signals: prediction.signals, decisionSource: 'deterministic_rules', isAmbiguous: prediction.intent === 'unclear', latencyMs: 0.1 });
  }
  return { seeded: true, campaigns: campaigns.length };
}

if (require.main === module) {
  seedDatabase().then(result => {
    console.log(JSON.stringify(result));
    return db.close();
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { seedDatabase };
