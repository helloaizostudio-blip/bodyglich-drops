import { Logo } from "@/components/shell/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-navy-900 px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-brand-500/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 size-[28rem] rounded-full bg-lav-600/20 blur-3xl" />
      <div className="relative w-full max-w-md animate-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300/80">AI Animation Production Studio</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-pop sm:p-8">{children}</div>
        <p className="font-display mt-6 text-center text-sm font-semibold text-brand-200/70">Plan. Create. Animate.</p>
      </div>
    </div>
  );
}
