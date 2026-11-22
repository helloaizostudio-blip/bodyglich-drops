import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-zinc-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, actions, className }: { title?: ReactNode; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cx("card", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "warn" | "good" }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className={cx("mt-1 text-2xl font-bold tabular-nums", tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-zinc-900")}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

const TONES = {
  gray: "bg-zinc-100 text-zinc-700",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "gray", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  candidate: "gray",
  shortlisted: "green",
  rejected: "red",
  archived: "gray",
  draft: "amber",
  approved: "blue",
  scheduled: "violet",
  sending: "blue",
  sent: "blue",
  published: "green",
  failed: "red",
  ok: "green",
  error: "red",
  running: "blue",
  skipped: "gray",
  info: "gray",
  warn: "amber",
  valid: "green",
  invalid: "red",
  unchecked: "gray",
  in_stock: "green",
  out_of_stock: "red",
  unknown: "gray",
};

const STATUS_LABEL: Record<string, string> = {
  sent: "sent to Zapier",
  in_stock: "in stock",
  out_of_stock: "out of stock",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "gray"}>{STATUS_LABEL[status] ?? status.replace(/_/g, " ")}</Badge>;
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge>—</Badge>;
  const tone: Tone = score >= 70 ? "green" : score >= 55 ? "amber" : "red";
  return <Badge tone={tone}>{score.toFixed(0)}/100</Badge>;
}

export function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-600">{label}</span>
        <span className="font-semibold tabular-nums text-zinc-800">
          {value} / {max}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
        <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
      <div className="text-sm font-semibold text-zinc-800">{title}</div>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "amber", title, children }: { tone?: "amber" | "red" | "blue" | "green"; title?: ReactNode; children: ReactNode }) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-sky-200 bg-sky-50 text-sky-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];
  return (
    <div className={cx("rounded-lg border px-4 py-3 text-sm", styles)}>
      {title && <div className="font-semibold">{title}</div>}
      <div className={title ? "mt-0.5" : ""}>{children}</div>
    </div>
  );
}

export function fmtNum(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : new Intl.NumberFormat("en-IN").format(n);
}

export function fmtInr(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
