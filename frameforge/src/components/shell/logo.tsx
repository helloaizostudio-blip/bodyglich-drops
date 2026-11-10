import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="currentColor" className="text-white/10" />
      <g transform="rotate(-12 32 20)">
        <rect x="12" y="13" width="40" height="9" rx="2.5" fill="#fff" />
        <path d="M19 13l5 9M29 13l5 9M39 13l5 9" stroke="#10264A" strokeWidth="3.2" />
      </g>
      <rect x="12" y="25" width="40" height="27" rx="5" fill="#63A9FF" />
      <path d="M28 32.5v12l10.5-6z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={cn("font-display text-[19px] font-extrabold tracking-tight", className)}>
      <span className={tone === "dark" ? "text-white" : "text-navy-900"}>FRAME</span>
      <span className="text-brand-400">FORGE</span>
    </span>
  );
}

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("grid size-9 place-items-center rounded-xl", tone === "light" && "bg-navy-900")}>
        <LogoMark />
      </span>
      <Wordmark tone={tone} />
    </span>
  );
}
