const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let pool;

function loadLocalEnv() {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(__dirname, '..', '..', fileName);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

loadLocalEnv();

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Add a PostgreSQL connection string to .env.local.');
  }
  return process.env.DATABASE_URL;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: Number(process.env.PGPOOL_MAX || 10),
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

async function transaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function id() {
  return crypto.randomUUID();
}

async function logAudit({ entityType, entityId = null, eventType, actorId = 'system', metadata = {} }, client = null) {
  const runner = client || { query };
  await runner.query(
    'INSERT INTO audit_events(id, entity_type, entity_id, event_type, actor_id, metadata) VALUES($1, $2, $3, $4, $5, $6)',
    [id(), entityType, entityId, eventType, actorId, JSON.stringify(metadata)]
  );
}

async function getAllCampaigns() {
  const result = await query('SELECT * FROM campaigns ORDER BY launch_date NULLS LAST, title');
  return result.rows;
}

async function getCampaignById(campaignId) {
  const result = await query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
  return result.rows[0] || null;
}

async function upsertCampaign(campaign) {
  const result = await query(
    `INSERT INTO campaigns(id, title, brand, budget_pool, deliverables, launch_date, status)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(id) DO UPDATE SET title = EXCLUDED.title, brand = EXCLUDED.brand, budget_pool = EXCLUDED.budget_pool,
       deliverables = EXCLUDED.deliverables, launch_date = EXCLUDED.launch_date, status = EXCLUDED.status, updated_at = NOW()
     RETURNING *`,
    [campaign.id, campaign.title, campaign.brand, campaign.budget_pool, campaign.deliverables, campaign.launch_date, campaign.status || 'active']
  );
  return result.rows[0];
}

async function getCampaignKnowledge(campaignId) {
  const result = await query(
    'SELECT * FROM campaign_knowledge WHERE campaign_id = $1 AND is_active = TRUE ORDER BY knowledge_type, label',
    [campaignId]
  );
  return result.rows;
}

async function addCampaignKnowledge({ campaignId, knowledgeType, label, content, source = 'campaign_manager' }) {
  const knowledge = await query(
    `INSERT INTO campaign_knowledge(id, campaign_id, knowledge_type, label, content, source)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id(), campaignId, knowledgeType, label, content, source]
  );
  await logAudit({ entityType: 'campaign_knowledge', entityId: knowledge.rows[0].id, eventType: 'knowledge_created', metadata: { campaignId, knowledgeType } });
  return knowledge.rows[0];
}

async function getAllCreators() {
  const result = await query('SELECT * FROM creators ORDER BY display_name');
  return result.rows;
}

async function upsertCreator(creator) {
  const result = await query(
    `INSERT INTO creators(id, handle, display_name, platform, followers, engagement_rate, category_exclusivity, opt_out_until)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT(handle) DO UPDATE SET display_name = EXCLUDED.display_name, platform = EXCLUDED.platform,
       followers = EXCLUDED.followers, engagement_rate = EXCLUDED.engagement_rate,
       category_exclusivity = EXCLUDED.category_exclusivity, opt_out_until = EXCLUDED.opt_out_until, updated_at = NOW()
     RETURNING *`,
    [creator.id || `creator_${creator.handle.replace(/[^a-z0-9]/gi, '').toLowerCase()}`, creator.handle, creator.display_name,
      creator.platform, creator.followers || 0, creator.engagement_rate || 0, creator.category_exclusivity || null, creator.opt_out_until || null]
  );
  return result.rows[0];
}

async function getReplyById(replyId) {
  const result = await query('SELECT * FROM creator_replies WHERE id = $1', [replyId]);
  return result.rows[0] || null;
}

async function getReplies(filters = {}) {
  const clauses = [];
  const values = [];
  const add = value => { values.push(value); return `$${values.length}`; };
  if (filters.intent && filters.intent !== 'all') clauses.push(`r.predicted_intent = ${add(filters.intent)}`);
  if (filters.campaignId && filters.campaignId !== 'all') clauses.push(`r.campaign_id = ${add(filters.campaignId)}`);
  if (filters.status && filters.status !== 'all') clauses.push(`r.status = ${add(filters.status)}`);
  if (filters.reviewOnly) clauses.push('r.requires_human_review = TRUE');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(
    `SELECT r.*, c.title AS campaign_title, cr.display_name, cr.followers, cr.engagement_rate
     FROM creator_replies r
     LEFT JOIN campaigns c ON c.id = r.campaign_id
     LEFT JOIN creators cr ON cr.id = r.creator_id
     ${where}
     ORDER BY r.received_at DESC`,
    values
  );
  return result.rows;
}

async function createReply(input, client = null) {
  const runner = client || { query };
  const replyId = input.id || id();
  const creator = input.creator_id ? { id: input.creator_id } : await upsertCreator({
    id: input.creator_id,
    handle: input.creator_handle || '@creator',
    display_name: input.creator_name || (input.creator_handle || '@creator').replace('@', ''),
    platform: input.platform || 'Email'
  });
  const result = await runner.query(
    `INSERT INTO creator_replies(id, campaign_id, creator_id, creator_handle, platform, raw_message, status,
      predicted_intent, intent_confidence, intent_rationale, decision_source, requires_human_review, received_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,NOW())) RETURNING *`,
    [replyId, input.campaign_id || null, creator.id, input.creator_handle || creator.handle, input.platform || 'Email', input.raw_message,
      input.status || 'classified', input.predicted_intent || null, input.intent_confidence || null, input.intent_rationale || null,
      input.decision_source || null, Boolean(input.requires_human_review), input.received_at || null]
  );
  return result.rows[0];
}

async function createClassificationRun(input, client = null) {
  const runner = client || { query };
  const result = await runner.query(
    `INSERT INTO classification_runs(id, reply_id, intent, confidence, rationale, signals, decision_source, is_ambiguous, latency_ms)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id(), input.replyId, input.intent, input.confidence, input.rationale, JSON.stringify(input.signals || []), input.decisionSource,
      Boolean(input.isAmbiguous), input.latencyMs || null]
  );
  return result.rows[0];
}

async function createGeneration(input, client = null) {
  const runner = client || { query };
  const result = await runner.query(
    `INSERT INTO ai_generations(id, reply_id, classification_run_id, purpose, provider, model, prompt_summary, output, evidence, latency_ms)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [id(), input.replyId || null, input.classificationRunId || null, input.purpose, input.provider, input.model,
      input.promptSummary, JSON.stringify(input.output), JSON.stringify(input.evidence || []), input.latencyMs || null]
  );
  return result.rows[0];
}

async function createAction(input, client = null) {
  const runner = client || { query };
  const result = await runner.query(
    `INSERT INTO crm_actions(id, reply_id, action_type, status, detail, simulated, completed_at)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id(), input.replyId, input.actionType, input.status || 'completed', input.detail, input.simulated !== false,
      input.status === 'queued' ? null : new Date()]
  );
  return result.rows[0];
}

async function overrideReply(replyId, correctedIntent, notes, managerId = 'demo_manager') {
  return transaction(async client => {
    const current = await client.query('SELECT * FROM creator_replies WHERE id = $1 FOR UPDATE', [replyId]);
    const reply = current.rows[0];
    if (!reply) return null;
    await client.query(
      `UPDATE creator_replies SET predicted_intent = $2, intent_rationale = $3, status = 'human_reviewed',
       requires_human_review = FALSE, updated_at = NOW() WHERE id = $1`,
      [replyId, correctedIntent, notes || 'Human review correction']
    );
    const feedback = await client.query(
      `INSERT INTO human_feedback_logs(id, reply_id, original_intent, corrected_intent, manager_id, notes)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id(), replyId, reply.predicted_intent, correctedIntent, managerId, notes || null]
    );
    await logAudit({ entityType: 'reply', entityId: replyId, eventType: 'intent_overridden', actorId: managerId, metadata: { correctedIntent } }, client);
    const updated = await client.query('SELECT * FROM creator_replies WHERE id = $1', [replyId]);
    return { reply: updated.rows[0], feedback: feedback.rows[0] };
  });
}

async function getTimeline(replyId) {
  const [classifications, generations, actions, feedback, audit] = await Promise.all([
    query('SELECT created_at, intent AS title, confidence, decision_source AS detail, \'classification\' AS type FROM classification_runs WHERE reply_id = $1', [replyId]),
    query('SELECT created_at, purpose AS title, provider || \' / \' || model AS detail, \'generation\' AS type FROM ai_generations WHERE reply_id = $1', [replyId]),
    query('SELECT created_at, action_type AS title, detail, \'action\' AS type FROM crm_actions WHERE reply_id = $1', [replyId]),
    query('SELECT created_at, corrected_intent AS title, notes AS detail, \'review\' AS type FROM human_feedback_logs WHERE reply_id = $1', [replyId]),
    query('SELECT created_at, event_type AS title, metadata::text AS detail, \'audit\' AS type FROM audit_events WHERE entity_id = $1', [replyId])
  ]);
  return [...classifications.rows, ...generations.rows, ...actions.rows, ...feedback.rows, ...audit.rows]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

async function getAnalytics() {
  const [summary, intent, confidence, review] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total_replies,
      COALESCE(AVG(intent_confidence), 0)::numeric(4,3) AS average_confidence,
      COUNT(*) FILTER (WHERE requires_human_review)::int AS review_queue_count,
      COUNT(*) FILTER (WHERE status = 'auto_actioned')::int AS auto_actioned_count
      FROM creator_replies`),
    query('SELECT COALESCE(predicted_intent, \'unclassified\') AS intent, COUNT(*)::int AS count FROM creator_replies GROUP BY 1 ORDER BY 2 DESC'),
    query(`SELECT CASE WHEN intent_confidence >= .95 THEN '95-100' WHEN intent_confidence >= .85 THEN '85-94' ELSE 'below-85' END AS band,
      COUNT(*)::int AS count FROM creator_replies GROUP BY 1 ORDER BY 1`),
    query('SELECT COUNT(*)::int AS override_count FROM human_feedback_logs')
  ]);
  return { summary: summary.rows[0], intent_distribution: intent.rows, confidence_bands: confidence.rows, override_count: review.rows[0].override_count };
}

async function health() {
  const result = await query('SELECT NOW() AS now');
  return result.rows[0];
}

async function close() {
  if (pool) await pool.end();
  pool = undefined;
}

module.exports = {
  addCampaignKnowledge,
  close,
  createAction,
  createClassificationRun,
  createGeneration,
  createReply,
  getAllCampaigns,
  getAllCreators,
  getAnalytics,
  getCampaignById,
  getCampaignKnowledge,
  getReplies,
  getReplyById,
  getTimeline,
  health,
  id,
  logAudit,
  overrideReply,
  query,
  transaction,
  upsertCampaign,
  upsertCreator
};
