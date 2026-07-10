/**
 * ============================================================================
 * AURA // AI-NATIVE CRM REPLY-INTENT BACKEND SERVICE & REST API
 * Zero-dependency Node.js HTTP Server serving full-stack REST API,
 * configurable AI assistant drafting, database persistence, and UI.
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./src/database/db.js');
const { classifyReplyIntent } = require('./classifier.js');
const { generateAgencyReply, buildGroundedAnswer } = require('./src/services/llmService.js');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on('error', reject);
  });
}

// Ensure database is seeded on startup
if (db.getAllCampaigns().length === 0) {
  const { seedDatabase } = require('./src/database/seed.js');
  seedDatabase();
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // ============================================================================
  // REST API ROUTING (/api/v1/...)
  // ============================================================================
  if (pathname.startsWith('/api/')) {
    try {
      // 1. SYSTEM HEALTH
      if (req.method === 'GET' && pathname === '/api/v1/health') {
        return sendJson(res, 200, {
          status: "ok",
          service: "AURA CRM Reply-Intent & Grounded AI Assistant Service",
          version: "3.0.0",
          uptime_seconds: Math.floor(process.uptime()),
          ai_provider: process.env.NVIDIA_API_KEY ? "nvidia_nemotron" : "local_grounded_ai",
          database_stats: db.getDatabaseStats()
        });
      }

      // 2. INSTANT CLASSIFICATION + OPTIONAL LLM DRAFT REPLY
      if (req.method === 'POST' && pathname === '/api/v1/classify') {
        const body = await parseJsonBody(req);
        if (!body.message || typeof body.message !== 'string') {
          return sendJson(res, 400, { error: "Missing required string field: message" });
        }

        const startTime = process.hrtime.bigint();
        const result = classifyReplyIntent(body.message);
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;

        // Generate tailored AI reply based on classified intent and campaign facts.
        const llmDraft = await generateAgencyReply({
          intent: result.intent,
          message: body.message,
          creatorName: body.creator_name || "@creator",
          campaignTitle: body.campaign_title || "AI Hardware Launch — Q3 Creator Blitz",
          campaignBudget: body.campaign_budget || "25,000",
          deliverables: body.deliverables || "1x YouTube Review + 2x IG Reels",
          launchDate: body.launch_date || "August 15, 2026",
          productName: body.product_name || "AURA Accelerator Dock Pro"
        });

        return sendJson(res, 200, {
          intent: result.intent,
          confidence: result.confidence,
          rationale: result.rationale,
          signals: result.signals || [],
          emotionData: result.emotionData,
          inference_latency_ms: parseFloat(durationMs.toFixed(3)),
          ai_answer: llmDraft.ai_answer,
          llm_draft: llmDraft
        });
      }

      // 3. DEDICATED LLM DRAFT ASSISTANT ENDPOINT
      if (req.method === 'POST' && pathname === '/api/v1/assistant/draft') {
        const body = await parseJsonBody(req);
        const llmDraft = await generateAgencyReply({
          intent: body.intent || "interested",
          message: body.message || "",
          creatorName: body.creator_name || "Creator",
          campaignTitle: body.campaign_title || "AI Hardware Launch",
          campaignBudget: body.campaign_budget || "25,000",
          deliverables: body.deliverables || "1x YouTube Review + 2x IG Reels",
          launchDate: body.launch_date || "August 15, 2026",
          productName: body.product_name || "AURA Accelerator Dock Pro"
        });
        return sendJson(res, 200, llmDraft);
      }

      // 4. GROUNDED QUESTION ANSWERING ENDPOINT
      if (req.method === 'POST' && pathname === '/api/v1/assistant/answer') {
        const body = await parseJsonBody(req);
        if (!body.message || typeof body.message !== 'string') {
          return sendJson(res, 400, { error: "Missing required string field: message" });
        }

        const prediction = classifyReplyIntent(body.message);
        const answer = buildGroundedAnswer({
          intent: body.intent || prediction.intent,
          message: body.message,
          campaignTitle: body.campaign_title,
          campaignBudget: body.campaign_budget,
          deliverables: body.deliverables,
          launchDate: body.launch_date,
          productName: body.product_name
        });

        return sendJson(res, 200, {
          intent: body.intent || prediction.intent,
          intent_confidence: prediction.confidence,
          answer
        });
      }

      // 5. WEBHOOK INGESTION & AUTOMATED WORKFLOW ROUTING
      if (req.method === 'POST' && pathname === '/api/v1/webhook/reply') {
        const body = await parseJsonBody(req);
        if (!body.message) {
          return sendJson(res, 400, { error: "Missing required message field" });
        }

        const prediction = classifyReplyIntent(body.message);

        let actionTaken = "Logged into CRM Queue";
        if (prediction.intent === "pricing_query") {
          actionTaken = "Auto-sent Rate Card PDF & Campaign Budget Tiers ($15k-$35k)";
        } else if (prediction.intent === "availability_query") {
          actionTaken = "Auto-attached Scheduling Calendar & Production Timeline";
        } else if (prediction.intent === "interested") {
          actionTaken = "Moved to 'Ready to Contract' Stage & Assigned Talent Manager";
        } else if (prediction.intent === "not_interested") {
          actionTaken = "Tagged 'Opted Out' & Suppressed Outreach for 90 Days";
        } else if (prediction.intent === "unclear") {
          actionTaken = "Flagged for Human Manager Review + Scheduled 5-Day Check-in";
        }

        const createdReply = db.insertReply({
          campaign_id: body.campaign_id || "camp_ai_hardware",
          creator_handle: body.creator_handle || "@creator.partner",
          platform: body.platform || "Webhook API",
          raw_message: body.message,
          predicted_intent: prediction.intent,
          intent_confidence: prediction.confidence,
          intent_rationale: prediction.rationale,
          status: "auto_actioned",
          crm_action_taken: actionTaken,
          requires_human_review: prediction.intent === "unclear"
        });

        return sendJson(res, 201, {
          success: true,
          message: "Creator reply ingested, classified, and routed successfully.",
          reply_record: createdReply
        });
      }

      // 6. GET REPLIES WITH FILTERS
      if (req.method === 'GET' && pathname === '/api/v1/replies') {
        const intent = urlObj.searchParams.get('intent');
        const campaign_id = urlObj.searchParams.get('campaign_id');
        const status = urlObj.searchParams.get('status');
        const replies = db.getAllReplies({ intent, campaign_id, status });
        return sendJson(res, 200, { count: replies.length, replies });
      }

      // 7. HUMAN OVERRIDE
      if (req.method === 'PATCH' && pathname.match(/^\/api\/v1\/replies\/[^/]+\/override$/)) {
        const id = pathname.split('/')[4];
        const body = await parseJsonBody(req);

        const validCategories = ["interested", "not_interested", "pricing_query", "availability_query", "unclear"];
        if (!validCategories.includes(body.corrected_intent)) {
          return sendJson(res, 400, { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
        }

        const result = db.updateReplyIntent(id, body.corrected_intent, body.rationale, body.manager_id || "manager_alex");
        if (!result) {
          return sendJson(res, 404, { error: `Reply with ID ${id} not found.` });
        }

        return sendJson(res, 200, {
          success: true,
          message: `Intent overridden to ${body.corrected_intent}`,
          updated_reply: result.reply,
          audit_log: result.feedbackLog
        });
      }

      // 8. MASTER DATA & STATS
      if (req.method === 'GET' && pathname === '/api/v1/campaigns') {
        return sendJson(res, 200, db.getAllCampaigns());
      }
      if (req.method === 'GET' && pathname === '/api/v1/creators') {
        return sendJson(res, 200, db.getAllCreators());
      }
      if (req.method === 'GET' && pathname === '/api/v1/stats') {
        return sendJson(res, 200, db.getDatabaseStats());
      }

      return sendJson(res, 404, { error: `API endpoint not found: ${req.method} ${pathname}` });
    } catch (err) {
      return sendJson(res, 500, { error: "Internal Server Error", details: err.message });
    }
  }

  // ============================================================================
  // STATIC FILE SERVING FOR WEB STUDIO UI
  // ============================================================================
  let filePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const absPath = path.join(__dirname, filePath);

  if (!absPath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Access denied');
  }

  fs.stat(absPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(absPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(absPath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log("================================================================================");
  console.log(`AURA // AI-NATIVE CRM SERVER & GROUNDED AI ASSISTANT ONLINE AT: http://localhost:${PORT}`);
  console.log(`Web Studio UI:    http://localhost:${PORT}`);
  console.log(`API Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log("================================================================================");
});

module.exports = server;
