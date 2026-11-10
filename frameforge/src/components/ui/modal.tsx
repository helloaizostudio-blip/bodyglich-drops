"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "./button";
import { Input } from "./field";

/**
 * Accessible modal built on the native <dialog>: focus trapping, Escape to close and the
 * top layer come from the browser. Renders as a bottom sheet on phones.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  const widths = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" };

  return (
    <dialog
      ref={ref}
      className={cn("ff-modal", widths[size])}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-3xl">
        <header className="flex items-start gap-3 border-b border-line px-5 pb-3.5 pt-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-navy-900">{title}</h2>
            {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X className="size-5" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-brand-50/60 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  typeToConfirm,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  /** When set, the user must type this text before the action is enabled. */
  typeToConfirm?: string;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const blocked = typeToConfirm ? typed.trim().toLowerCase() !== typeToConfirm.trim().toLowerCase() : false;

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={busy}
            disabled={blocked}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-navy-800">{message}</div>
      {typeToConfirm ? (
        <div className="mt-4">
          <label className="text-[13px] font-semibold text-navy-800">
            Type <span className="rounded bg-brand-100 px-1.5 py-0.5 font-mono">{typeToConfirm}</span> to confirm
            <Input className="mt-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        </div>
      ) : null}
    </Modal>
  );
}
