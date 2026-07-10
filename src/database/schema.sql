-- ============================================================================
-- AURA // AI-NATIVE CRM DATABASE SCHEMA
-- Relational Schema for Creator Outreach, Reply-Intent Classification & Routing
-- Supported Dialects: SQLite / PostgreSQL
-- ============================================================================

-- 1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(128) NOT NULL,
  brand VARCHAR(128) NOT NULL,
  budget_pool NUMERIC(12, 2) DEFAULT 0.0,
  deliverables TEXT NOT NULL,
  launch_date DATE NOT NULL,
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CREATORS TABLE
CREATE TABLE IF NOT EXISTS creators (
  id VARCHAR(64) PRIMARY KEY,
  handle VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  platform VARCHAR(32) NOT NULL,
  followers INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5, 2) DEFAULT 0.0,
  category_exclusivity VARCHAR(64) DEFAULT NULL,
  opt_out_until TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. OUTREACH MESSAGES TABLE (Outgoing agency DMs/Emails)
CREATE TABLE IF NOT EXISTS outreach_messages (
  id VARCHAR(64) PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL,
  creator_id VARCHAR(64) NOT NULL,
  subject VARCHAR(256),
  body TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (creator_id) REFERENCES creators(id)
);

-- 4. CREATOR REPLIES TABLE (Incoming messages + AI classification enrichment)
CREATE TABLE IF NOT EXISTS creator_replies (
  id VARCHAR(64) PRIMARY KEY,
  outreach_id VARCHAR(64),
  campaign_id VARCHAR(64) NOT NULL,
  creator_id VARCHAR(64) NOT NULL,
  platform VARCHAR(32) NOT NULL,
  raw_message TEXT NOT NULL,
  
  -- AI Classification Enrichment Fields
  predicted_intent VARCHAR(32) NOT NULL,
  intent_confidence NUMERIC(4, 3) NOT NULL,
  intent_rationale TEXT NOT NULL,
  disambiguation_rule VARCHAR(64),
  
  -- CRM Workflow Execution State
  status VARCHAR(32) DEFAULT 'classified',
  crm_action_taken TEXT NOT NULL,
  requires_human_review BOOLEAN DEFAULT 0,
  
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (creator_id) REFERENCES creators(id)
);

-- 5. HUMAN FEEDBACK / ACTIVE LEARNING AUDIT LOGS
CREATE TABLE IF NOT EXISTS human_feedback_logs (
  id VARCHAR(64) PRIMARY KEY,
  reply_id VARCHAR(64) NOT NULL,
  original_intent VARCHAR(32) NOT NULL,
  corrected_intent VARCHAR(32) NOT NULL,
  manager_id VARCHAR(64) DEFAULT 'manager_alex',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reply_id) REFERENCES creator_replies(id)
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_replies_intent ON creator_replies(predicted_intent);
CREATE INDEX IF NOT EXISTS idx_replies_campaign ON creator_replies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_replies_creator ON creator_replies(creator_id);
CREATE INDEX IF NOT EXISTS idx_replies_received ON creator_replies(received_at);
