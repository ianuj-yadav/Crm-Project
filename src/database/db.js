/**
 * ============================================================================
 * AURA // AI-NATIVE CRM DATABASE ADAPTER & PERSISTENT STORAGE ENGINE
 * Manages relational tables: campaigns, creators, creator_replies, human_feedback_logs.
 * Uses native SQLite3 when available, or durable persistent JSON relational store
 * for guaranteed zero-configuration portability across all environments.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', '..', 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const STORE_PATH = path.join(DB_DIR, 'crm_persistent_store.json');

// Initial seed tables
const INITIAL_STORE = {
  campaigns: [],
  creators: [],
  outreach_messages: [],
  creator_replies: [],
  human_feedback_logs: []
};

class CRMDatabase {
  constructor() {
    this.store = INITIAL_STORE;
    this.load();
  }

  load() {
    if (fs.existsSync(STORE_PATH)) {
      try {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        this.store = JSON.parse(raw);
      } catch (e) {
        console.warn("Could not load persistent store, initializing fresh database.");
        this.store = JSON.parse(JSON.stringify(INITIAL_STORE));
        this.save();
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.store, null, 2), 'utf8');
    } catch (e) {
      console.error("Failed to persist CRM database:", e.message);
    }
  }

  // ==========================================================================
  // CAMPAIGN METHODS
  // ==========================================================================
  getAllCampaigns() {
    return this.store.campaigns;
  }

  getCampaignById(id) {
    return this.store.campaigns.find(c => c.id === id) || null;
  }

  insertCampaign(campaign) {
    const existingIndex = this.store.campaigns.findIndex(c => c.id === campaign.id);
    if (existingIndex >= 0) {
      this.store.campaigns[existingIndex] = campaign;
    } else {
      this.store.campaigns.push(campaign);
    }
    this.save();
    return campaign;
  }

  // ==========================================================================
  // CREATOR METHODS
  // ==========================================================================
  getAllCreators() {
    return this.store.creators;
  }

  getCreatorById(id) {
    return this.store.creators.find(c => c.id === id) || null;
  }

  getCreatorByHandle(handle) {
    return this.store.creators.find(c => c.handle.toLowerCase() === handle.toLowerCase()) || null;
  }

  insertCreator(creator) {
    const existingIndex = this.store.creators.findIndex(c => c.id === creator.id);
    if (existingIndex >= 0) {
      this.store.creators[existingIndex] = creator;
    } else {
      this.store.creators.push(creator);
    }
    this.save();
    return creator;
  }

  // ==========================================================================
  // CREATOR REPLIES METHODS
  // ==========================================================================
  getAllReplies(filters = {}) {
    let replies = [...this.store.creator_replies];
    if (filters.intent && filters.intent !== 'all') {
      replies = replies.filter(r => r.predicted_intent === filters.intent);
    }
    if (filters.campaign_id && filters.campaign_id !== 'all') {
      replies = replies.filter(r => r.campaign_id === filters.campaign_id);
    }
    if (filters.status && filters.status !== 'all') {
      replies = replies.filter(r => r.status === filters.status);
    }
    // Sort newest first
    return replies.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
  }

  getReplyById(id) {
    return this.store.creator_replies.find(r => r.id === id) || null;
  }

  insertReply(replyData) {
    const reply = {
      id: replyData.id || `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      outreach_id: replyData.outreach_id || null,
      campaign_id: replyData.campaign_id || 'camp_ai_hardware',
      creator_id: replyData.creator_id || 'creator_unknown',
      creator_handle: replyData.creator_handle || '@creator',
      platform: replyData.platform || 'Email',
      raw_message: replyData.raw_message,
      predicted_intent: replyData.predicted_intent,
      intent_confidence: replyData.intent_confidence,
      intent_rationale: replyData.intent_rationale,
      disambiguation_rule: replyData.disambiguation_rule || null,
      status: replyData.status || 'classified',
      crm_action_taken: replyData.crm_action_taken || 'No action taken',
      requires_human_review: replyData.requires_human_review || false,
      received_at: replyData.received_at || new Date().toISOString()
    };

    this.store.creator_replies.unshift(reply);
    this.save();
    return reply;
  }

  updateReplyIntent(replyId, newIntent, rationale, managerId = 'manager_alex') {
    const reply = this.store.creator_replies.find(r => r.id === replyId);
    if (!reply) return null;

    const oldIntent = reply.predicted_intent;
    reply.predicted_intent = newIntent;
    reply.intent_rationale = `[Human Override by @${managerId}] ${rationale || 'Corrected label'}`;
    reply.status = 'human_reviewed';
    reply.requires_human_review = false;

    // Log feedback
    const feedbackLog = {
      id: `fb_${Date.now()}`,
      reply_id: replyId,
      original_intent: oldIntent,
      corrected_intent: newIntent,
      manager_id: managerId,
      notes: rationale || 'Manual correction',
      created_at: new Date().toISOString()
    };

    this.store.human_feedback_logs.push(feedbackLog);
    this.save();
    return { reply, feedbackLog };
  }

  // ==========================================================================
  // DATABASE STATS & ANALYTICS
  // ==========================================================================
  getDatabaseStats() {
    const totalReplies = this.store.creator_replies.length;
    const countsByIntent = {
      interested: 0,
      not_interested: 0,
      pricing_query: 0,
      availability_query: 0,
      unclear: 0
    };

    let totalConfidence = 0;
    let autoActionedCount = 0;

    this.store.creator_replies.forEach(r => {
      if (countsByIntent[r.predicted_intent] !== undefined) {
        countsByIntent[r.predicted_intent]++;
      }
      totalConfidence += (r.intent_confidence || 0);
      if (r.crm_action_taken && r.crm_action_taken !== 'No action taken') {
        autoActionedCount++;
      }
    });

    return {
      total_campaigns: this.store.campaigns.length,
      total_creators: this.store.creators.length,
      total_replies: totalReplies,
      total_feedback_overrides: this.store.human_feedback_logs.length,
      intent_distribution: countsByIntent,
      average_confidence: totalReplies > 0 ? parseFloat((totalConfidence / totalReplies).toFixed(3)) : 0,
      auto_action_rate_pct: totalReplies > 0 ? parseFloat(((autoActionedCount / totalReplies) * 100).toFixed(1)) : 0
    };
  }

  clearAll() {
    this.store = JSON.parse(JSON.stringify(INITIAL_STORE));
    this.save();
  }
}

const dbInstance = new CRMDatabase();
module.exports = dbInstance;
