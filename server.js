const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./src/database/db.js');
const { runMigrations } = require('./src/database/migrate.js');
const { seedDatabase } = require('./src/database/seed.js');
const { evaluateReply } = require('./src/services/reliabilityService.js');
const { buildGroundedAnswer, generateAgencyReply } = require('./src/services/llmService.js');

const PORT = Number(process.env.PORT || 3000);
const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 250000) reject(new Error('Request body is too large.'));
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON request body.')); }
    });
    req.on('error', reject);
  });
}

function actionText(action) {
  return action?.detail || 'Queued for human account-manager review.';
}

async function resolveCampaign(campaignId) {
  const selected = campaignId ? await db.getCampaignById(campaignId) : null;
  if (selected) return selected;
  const campaigns = await db.getAllCampaigns();
  return campaigns[0] || null;
}

async function processReply(body, source = 'api') {
  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) throw new Error('Missing required string field: message');
  const campaign = await resolveCampaign(body.campaign_id);
  if (!campaign) throw new Error('No campaign exists. Run migrations and seed data first.');
  const creator = await db.upsertCreator({
    id: body.creator_id,
    handle: body.creator_handle || '@creator.partner',
    display_name: body.creator_name || (body.creator_handle || 'Creator Partner').replace('@', ''),
    platform: body.platform || 'Webhook API'
  });
  const decision = await evaluateReply({ message: body.message.trim(), campaign });
  const reply = await db.createReply({
    campaign_id: campaign.id,
    creator_id: creator.id,
    creator_handle: creator.handle,
    platform: body.platform || creator.platform,
    raw_message: body.message.trim(),
    status: decision.needs_human_review ? 'needs_review' : 'auto_actioned',
    predicted_intent: decision.intent,
    intent_confidence: decision.confidence,
    intent_rationale: decision.rationale,
    decision_source: decision.decision_source,
    requires_human_review: decision.needs_human_review
  });
  const classification = await db.createClassificationRun({
    replyId: reply.id,
    intent: decision.intent,
    confidence: decision.confidence,
    rationale: decision.rationale,
    signals: decision.signals,
    decisionSource: decision.decision_source,
    isAmbiguous: decision.is_ambiguous,
    latencyMs: decision.latency_ms
  });
  const draft = await generateAgencyReply({
    intent: decision.intent,
    message: body.message,
    creatorName: creator.display_name,
    campaignTitle: campaign.title,
    campaignBudget: campaign.budget_pool,
    deliverables: campaign.deliverables,
    launchDate: campaign.launch_date,
    productName: campaign.brand
  });
  const answer = draft.ai_answer || buildGroundedAnswer({ intent: decision.intent, message: body.message, campaignTitle: campaign.title, campaignBudget: campaign.budget_pool, deliverables: campaign.deliverables, launchDate: campaign.launch_date, productName: campaign.brand });
  const generation = await db.createGeneration({
    replyId: reply.id,
    classificationRunId: classification.id,
    purpose: 'reply_draft',
    provider: draft.source,
    model: draft.model,
    promptSummary: `Campaign-grounded ${decision.intent} reply draft for ${campaign.id}.`,
    output: { answer, draft_reply: draft.draft_reply },
    evidence: answer.evidence || []
  });
  let action = null;
  if (!decision.needs_human_review) {
    action = await db.createAction({ replyId: reply.id, actionType: decision.action.action_type, detail: actionText(decision.action), status: 'completed', simulated: true });
  }
  await db.logAudit({ entityType: 'reply', entityId: reply.id, eventType: `${source}_classified`, metadata: { decisionSource: decision.decision_source, needsHumanReview: decision.needs_human_review } });
  return { reply, campaign, decision, classification, generation, action, answer, llm_draft: draft };
}
let initPromise = null;
async function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await runMigrations();
        await seedDatabase();
      } catch (error) {
        console.error('Database initialization warning:', error.message);
      }
    })();
  }
  await initPromise;
}

async function handleRequest(req, res) {
  await ensureInit();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  try {
    if (pathname.startsWith('/api/')) {
      if (req.method === 'GET' && pathname === '/api/v1/health') {
        const database = await db.health();
        return sendJson(res, 200, { status: 'ok', service: 'AURA CRM PostgreSQL + Hybrid AI', ai_provider: process.env.NVIDIA_API_KEY ? 'nvidia_nemotron_hybrid' : 'deterministic_grounded', database: 'postgresql', database_time: database.now });
      }
      if (req.method === 'GET' && pathname === '/api/v1/campaigns') return sendJson(res, 200, { campaigns: await db.getAllCampaigns() });
      if (req.method === 'GET' && pathname.match(/^\/api\/v1\/campaigns\/[^/]+\/knowledge$/)) {
        const campaignId = pathname.split('/')[4];
        return sendJson(res, 200, { knowledge: await db.getCampaignKnowledge(campaignId) });
      }
      if (req.method === 'POST' && pathname.match(/^\/api\/v1\/campaigns\/[^/]+\/knowledge$/)) {
        const body = await parseJsonBody(req);
        const campaignId = pathname.split('/')[4];
        if (!body.knowledge_type || !body.label || !body.content) return sendJson(res, 400, { error: 'knowledge_type, label, and content are required.' });
        const knowledge = await db.addCampaignKnowledge({ campaignId, knowledgeType: body.knowledge_type, label: body.label, content: body.content });
        return sendJson(res, 201, { knowledge });
      }
      if (req.method === 'GET' && pathname === '/api/v1/creators') return sendJson(res, 200, { creators: await db.getAllCreators() });
      if (req.method === 'GET' && pathname === '/api/v1/replies') {
        const replies = await db.getReplies({ intent: url.searchParams.get('intent'), campaignId: url.searchParams.get('campaign_id'), status: url.searchParams.get('status'), reviewOnly: url.searchParams.get('review') === 'true' });
        return sendJson(res, 200, { count: replies.length, replies });
      }
      if (req.method === 'GET' && pathname === '/api/v1/review-queue') {
        const replies = await db.getReplies({ reviewOnly: true });
        return sendJson(res, 200, { count: replies.length, replies });
      }
      if (req.method === 'GET' && pathname === '/api/v1/analytics') return sendJson(res, 200, await db.getAnalytics());
      if (req.method === 'GET' && pathname.match(/^\/api\/v1\/replies\/[^/]+\/timeline$/)) {
        return sendJson(res, 200, { timeline: await db.getTimeline(pathname.split('/')[4]) });
      }
      if (req.method === 'PATCH' && pathname.match(/^\/api\/v1\/replies\/[^/]+\/override$/)) {
        const body = await parseJsonBody(req);
        const valid = ['interested', 'not_interested', 'pricing_query', 'availability_query', 'unclear'];
        if (!valid.includes(body.corrected_intent)) return sendJson(res, 400, { error: 'Invalid corrected_intent.' });
        const result = await db.overrideReply(pathname.split('/')[4], body.corrected_intent, body.rationale, body.manager_id);
        return result ? sendJson(res, 200, result) : sendJson(res, 404, { error: 'Reply not found.' });
      }
      if (req.method === 'POST' && pathname.match(/^\/api\/v1\/replies\/[^/]+\/actions$/)) {
        const body = await parseJsonBody(req);
        const replyId = pathname.split('/')[4];
        const reply = await db.getReplyById(replyId);
        if (!reply) return sendJson(res, 404, { error: 'Reply not found.' });
        const action = await db.createAction({
          replyId,
          actionType: body.action_type || 'manager_approved',
          detail: body.detail || 'Manager approved the simulated CRM workflow.',
          status: 'completed',
          simulated: true
        });
        await db.logAudit({ entityType: 'reply', entityId: replyId, eventType: 'manager_action_approved', actorId: body.manager_id || 'demo_manager', metadata: { actionType: action.action_type } });
        return sendJson(res, 201, { action });
      }
      if (req.method === 'POST' && (pathname === '/api/v1/classify' || pathname === '/api/v1/webhook/reply' || pathname === '/api/v1/assistant/answer')) {
        const body = await parseJsonBody(req);
        const result = await processReply(body, pathname.includes('webhook') ? 'webhook' : 'manual_query');
        return sendJson(res, pathname.includes('webhook') ? 201 : 200, {
          reply_id: result.reply.id,
          intent: result.decision.intent,
          confidence: result.decision.confidence,
          rationale: result.decision.rationale,
          signals: result.decision.signals,
          decision_source: result.decision.decision_source,
          needs_human_review: result.decision.needs_human_review,
          action: result.action || result.decision.action,
          evidence: result.answer.evidence,
          ai_answer: result.answer,
          llm_draft: result.llm_draft
        });
      }
      if (req.method === 'POST' && pathname === '/api/v1/batches') {
        const body = await parseJsonBody(req);
        const messages = Array.isArray(body.messages) ? body.messages.filter(message => typeof message === 'string' && message.trim()) : [];
        if (!messages.length) return sendJson(res, 400, { error: 'messages must contain at least one reply.' });
        const run = await db.query('INSERT INTO batch_runs(id, campaign_id, input_count) VALUES($1,$2,$3) RETURNING *', [db.id(), body.campaign_id || null, messages.length]);
        const results = [];
        for (const message of messages) results.push(await processReply({ ...body, message }, 'batch'));
        await db.query('UPDATE batch_runs SET completed_count = $2 WHERE id = $1', [run.rows[0].id, results.length]);
        return sendJson(res, 201, { batch_id: run.rows[0].id, results: results.map(result => ({ reply_id: result.reply.id, intent: result.decision.intent, confidence: result.decision.confidence, needs_human_review: result.decision.needs_human_review })) });
      }
      return sendJson(res, 404, { error: `Route not found: ${req.method} ${pathname}` });
    }
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    const absolute = path.resolve(__dirname, requested);
    if (!absolute.startsWith(__dirname)) return sendJson(res, 403, { error: 'Access denied.' });
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return sendJson(res, 404, { error: 'Not found.' });
    res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(absolute)] || 'application/octet-stream' });
    fs.createReadStream(absolute).pipe(res);
  } catch (error) {
    const status = /required|Missing|Invalid|too large/.test(error.message) ? 400 : 500;
    sendJson(res, status, { error: error.message });
  }
}

const server = http.createServer(handleRequest);

async function start() {
  await ensureInit();
  server.listen(PORT, () => console.log(`AURA CRM is online at http://localhost:${PORT}`));
}

if (require.main === module) {
  start().catch(error => {
    console.error(`AURA CRM failed to start: ${error.message}`);
    process.exitCode = 1;
  });
}

handleRequest.processReply = processReply;
handleRequest.server = server;
handleRequest.start = start;
handleRequest.handleRequest = handleRequest;

module.exports = handleRequest;
