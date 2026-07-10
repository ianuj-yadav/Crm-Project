const fs = require('fs');
const path = require('path');
const db = require('./db.js');

async function importLegacyStore() {
  const filePath = path.join(__dirname, '..', '..', 'database', 'crm_persistent_store.json');
  if (!fs.existsSync(filePath)) return { imported: 0, reason: 'No legacy JSON store found.' };
  const store = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const campaign of store.campaigns || []) await db.upsertCampaign(campaign);
  for (const creator of store.creators || []) await db.upsertCreator(creator);
  let imported = 0;
  for (const reply of store.creator_replies || []) {
    const existing = await db.getReplyById(reply.id).catch(() => null);
    if (existing || !reply.raw_message) continue;
    await db.createReply({
      id: cryptoSafeId(reply.id), campaign_id: reply.campaign_id, creator_id: reply.creator_id,
      creator_handle: reply.creator_handle, platform: reply.platform, raw_message: reply.raw_message,
      status: reply.status, predicted_intent: reply.predicted_intent, intent_confidence: reply.intent_confidence,
      intent_rationale: reply.intent_rationale, decision_source: 'legacy_import', requires_human_review: reply.requires_human_review,
      received_at: reply.received_at
    });
    imported++;
  }
  return { imported };
}

function cryptoSafeId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '') ? value : undefined;
}

if (require.main === module) {
  importLegacyStore().then(result => {
    console.log(JSON.stringify(result));
    return db.close();
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { importLegacyStore };
