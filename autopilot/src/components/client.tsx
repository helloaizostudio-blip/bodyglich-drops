"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { cx } from "./ui";

/** Submit button with a pending state. */
export function SubmitButton({
  children,
  variant = "primary",
  size,
  pendingText,
  confirm,
  className,
  name,
  value,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm";
  pendingText?: string;
  confirm?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cx("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}
