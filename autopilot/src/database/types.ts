import type { CategoryKey } from "@/services/product-research/categories";

export type ProductStatus = "candidate" | "shortlisted" | "rejected" | "archived";
export type Availability = "in_stock" | "out_of_stock" | "unknown";
export type LinkStatus = "valid" | "invalid" | "unchecked";

export interface ScoreBreakdown {
  demand: number;
  intent: number;
  quality: number;
  commission: number;
  seasonal: number;
  competition: number;
  total: number;
  notes: string[];
}

export interface Product {
  id: string;
  asin: string;
  marketplace: string;
  source: "creators_api" | "manual";
  title: string;
  brand: string | null;
  category: CategoryKey;
  search_index: string | null;
  features: string[];
  price_amount: number | null;
  price_currency: string | null;
  rating: number | null;
  review_count: number | null;
  sales_rank: number | null;
  availability: Availability;
  availability_message: string | null;
  detail_page_url: string | null;
  affiliate_url: string | null;
  link_status: LinkStatus;
  image_url: string | null;
  campaign: string | null;
  source_keyword: string | null;
  status: ProductStatus;
  score: number | null;
  score_breakdown: ScoreBreakdown | null;
  flags: string[];
  rejection_reasons: string[];
  notes: string | null;
  data_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PinStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "sending"
  | "sent"
  | "published"
  | "rejected"
  | "failed";

export interface Pin {
  id: string;
  product_id: string;
  concept_index: number;
  style: string;
  headline: string;
  subheadline: string | null;
  title: string;
  description: string;
  keywords: string[];
  board: string;
  link: string;
  alt_text: string;
  disclosure: string;
  campaign: string | null;
  image_file: string | null;
  image_source: "template" | "higgsfield" | null;
  image_prompt: string | null;
  copy_source: "claude" | "template";
  status: PinStatus;
  scheduled_for: string | null;
  approved_at: string | null;
  sent_at: string | null;
  published_at: string | null;
  pinterest_pin_id: string | null;
  pinterest_url: string | null;
  attempts: number;
  last_error: string | null;
  compliance_flags: string[];
  created_at: string;
  updated_at: string;
}

export interface BoardConfig {
  name: string;
  pinterestBoardId: string | null;
  categories: CategoryKey[];
  campaigns: string[];
}

export interface AppSettings {
  requireApproval: boolean;
  schedule: {
    paused: boolean;
    pinsPerDay: number;
    postingTimes: string[]; // "HH:MM" in app timezone
    minGapMinutes: number;
    productCooldownDays: number;
  };
  discovery: {
    enabled: boolean;
    categories: CategoryKey[];
    customKeywords: string[];
    maxSearchesPerRun: number;
    minScoreToShortlist: number;
    autoGenerateTopN: number;
    lookaheadDays: number;
  };
  boards: BoardConfig[];
  /** Commission % per category, entered by the user from the Associates fee schedule. Never defaulted. */
  commissionRates: Partial<Record<CategoryKey, number>>;
  imageProvider: "template" | "higgsfield";
}

export interface AuditEntry {
  id: string;
  ts: string;
  level: "info" | "warn" | "error";
  actor: "user" | "worker" | "system" | "zapier";
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  details: string | null;
}

export interface JobRun {
  id: string;
  job: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "error" | "skipped";
  summary: string | null;
  error: string | null;
}
