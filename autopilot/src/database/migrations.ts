/**
 * Portable schema: only TEXT / INTEGER / DOUBLE PRECISION columns, ISO-8601 timestamps as TEXT,
 * JSON stored as TEXT. Runs unchanged on SQLite and PostgreSQL.
 * Add new migrations to the end of the list; never edit an applied one.
 */
export const migrations: { id: string; sql: string }[] = [
  {
    id: "001_init",
    sql: `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  asin TEXT NOT NULL UNIQUE,
  marketplace TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL,
  search_index TEXT,
  features TEXT,
  price_amount DOUBLE PRECISION,
  price_currency TEXT,
  rating DOUBLE PRECISION,
  review_count INTEGER,
  sales_rank INTEGER,
  availability TEXT NOT NULL DEFAULT 'unknown',
  availability_message TEXT,
  detail_page_url TEXT,
  affiliate_url TEXT,
  link_status TEXT NOT NULL DEFAULT 'unchecked',
  image_url TEXT,
  campaign TEXT,
  source_keyword TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  score DOUBLE PRECISION,
  score_breakdown TEXT,
  flags TEXT,
  rejection_reasons TEXT,
  notes TEXT,
  data_fetched_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS pins (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  concept_index INTEGER NOT NULL,
  style TEXT NOT NULL,
  headline TEXT NOT NULL,
  subheadline TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords TEXT NOT NULL,
  board TEXT NOT NULL,
  link TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  disclosure TEXT NOT NULL,
  campaign TEXT,
  image_file TEXT,
  image_source TEXT,
  image_prompt TEXT,
  copy_source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TEXT,
  approved_at TEXT,
  sent_at TEXT,
  published_at TEXT,
  pinterest_pin_id TEXT,
  pinterest_url TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  compliance_flags TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pins_status ON pins(status);
CREATE INDEX IF NOT EXISTS idx_pins_product ON pins(product_id);
CREATE INDEX IF NOT EXISTS idx_pins_scheduled ON pins(scheduled_for);

CREATE TABLE IF NOT EXISTS pin_metrics (
  pin_id TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  impressions INTEGER,
  outbound_clicks INTEGER,
  pin_clicks INTEGER,
  saves INTEGER,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (pin_id, metric_date)
);

CREATE TABLE IF NOT EXISTS affiliate_reports (
  id TEXT PRIMARY KEY,
  report_date TEXT NOT NULL,
  tracking_id TEXT,
  asin TEXT,
  product_title TEXT,
  category TEXT,
  clicks INTEGER,
  ordered_items INTEGER,
  shipped_items INTEGER,
  revenue DOUBLE PRECISION,
  earnings DOUBLE PRECISION,
  source_file TEXT NOT NULL,
  imported_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_affiliate_reports_date ON affiliate_reports(report_date);

CREATE TABLE IF NOT EXISTS trend_keywords (
  keyword TEXT NOT NULL,
  source TEXT NOT NULL,
  region TEXT,
  trend_type TEXT,
  growth_wow DOUBLE PRECISION,
  growth_mom DOUBLE PRECISION,
  growth_yoy DOUBLE PRECISION,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (keyword, source)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  provider TEXT PRIMARY KEY,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  expires_at TEXT,
  scope TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  level TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  message TEXT NOT NULL,
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  summary TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_runs_started ON job_runs(started_at);
`,
  },
];
