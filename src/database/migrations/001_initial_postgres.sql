CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  budget_pool NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deliverables TEXT NOT NULL,
  launch_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_knowledge (
  id UUID PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  knowledge_type TEXT NOT NULL,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'campaign_manager',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  followers INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  category_exclusivity TEXT,
  opt_out_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creator_replies (
  id UUID PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  creator_id TEXT REFERENCES creators(id) ON DELETE SET NULL,
  creator_handle TEXT NOT NULL,
  platform TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  predicted_intent TEXT,
  intent_confidence NUMERIC(4, 3),
  intent_rationale TEXT,
  decision_source TEXT,
  requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classification_runs (
  id UUID PRIMARY KEY,
  reply_id UUID NOT NULL REFERENCES creator_replies(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL,
  rationale TEXT NOT NULL,
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_source TEXT NOT NULL,
  is_ambiguous BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms NUMERIC(10, 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY,
  reply_id UUID REFERENCES creator_replies(id) ON DELETE CASCADE,
  classification_run_id UUID REFERENCES classification_runs(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_summary TEXT NOT NULL,
  output JSONB NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  latency_ms NUMERIC(10, 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_actions (
  id UUID PRIMARY KEY,
  reply_id UUID NOT NULL REFERENCES creator_replies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  detail TEXT NOT NULL,
  simulated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS human_feedback_logs (
  id UUID PRIMARY KEY,
  reply_id UUID NOT NULL REFERENCES creator_replies(id) ON DELETE CASCADE,
  original_intent TEXT NOT NULL,
  corrected_intent TEXT NOT NULL,
  manager_id TEXT NOT NULL DEFAULT 'demo_manager',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_runs (
  id UUID PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  input_count INTEGER NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL DEFAULT 'system',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_campaign ON creator_replies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_replies_review ON creator_replies(requires_human_review, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_received ON creator_replies(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_classification_reply ON classification_runs(reply_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_reply ON crm_actions(reply_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id, created_at DESC);
