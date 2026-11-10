import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-3xl bg-white shadow-card ring-1 ring-line/70", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[17px] font-bold text-navy-900">{children}</h2>
      {action}
    </div>
  );
}

type Tone = "blue" | "navy" | "lav" | "ok" | "warn" | "bad" | "gray";
const tones: Record<Tone, string> = {
  blue: "bg-brand-100 text-brand-700",
  navy: "bg-navy-900 text-white",
  lav: "bg-lav-100 text-lav-600",
  ok: "bg-ok-100 text-ok-700",
  warn: "bg-warn-100 text-warn-700",
  bad: "bg-bad-100 text-bad-700",
  gray: "bg-slate-100 text-slate-600",
};

export function Badge({ tone = "blue", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Chip({
  active,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors",
        active ? "bg-brand-600 text-white shadow-[0_4px_12px_-4px_rgb(38_112_230/0.6)]" : "bg-white text-navy-700 ring-1 ring-inset ring-line hover:bg-brand-100",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0", className)}>{children}</div>;
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl border-2 border-dashed border-brand-200 bg-white/70 px-6 py-10 text-center", className)}>
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-600 [&>svg]:size-7">{icon}</div>
      <h3 className="mt-4 text-lg font-bold text-navy-900">{title}</h3>
      {children ? <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{children}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-brand-600", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} aria-hidden />;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight text-navy-900 sm:text-[30px]">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted sm:text-[15px]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-brand-100", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 104 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${pct}% complete`}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-brand-100)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="font-display absolute inset-0 grid place-items-center text-2xl font-extrabold text-navy-900">{pct}%</span>
    </div>
  );
}

export function Notice({
  tone = "blue",
  icon,
  title,
  children,
  action,
  className,
}: {
  tone?: "blue" | "warn" | "lav";
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const style = { blue: "bg-brand-100 text-navy-800", warn: "bg-warn-100 text-warn-700", lav: "bg-lav-100 text-navy-800" }[tone];
  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-2xl px-4 py-3.5", style, className)}>
      {icon ? <div className="mt-0.5 shrink-0 [&>svg]:size-5">{icon}</div> : null}
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm font-bold">{title}</p>
        {children ? <div className="mt-0.5 text-[13px] leading-relaxed opacity-90">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
