"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };
type Api = { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };

const ToastContext = createContext<Api | null>(null);

export function useToast(): Api {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside ToastProvider");
  return api;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);

  // The container is a manual popover so toasts sit in the top layer, above open modals.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      if (toasts.length) el.showPopover();
    } catch {
      /* popover unsupported: toasts still render in normal flow */
    }
  }, [toasts]);

  const api = useRef<Api>({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div ref={ref} popover="manual" className="ff-toasts" aria-live="polite">
        <div className="flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-pop animate-rise",
                t.kind === "error" ? "bg-bad-700 text-white" : "bg-navy-900 text-white",
              )}
            >
              {t.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-300" />
              ) : t.kind === "error" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0 text-brand-300" />
              )}
              <span className="flex-1 break-words">{t.message}</span>
              <button
                type="button"
                aria-label="Dismiss"
                className="-mr-1 rounded-md p-0.5 opacity-70 hover:opacity-100"
                onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
