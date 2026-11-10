"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl bg-white px-3.5 text-ink ring-1 ring-inset ring-line placeholder:text-faint transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-brand-50 disabled:text-muted";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-navy-800">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-xs font-medium text-bad-700">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-11", className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(control, "py-2.5 leading-relaxed resize-y min-h-[4.5rem]", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(control, "h-11 appearance-none pr-9")} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}

/** Convenience wrappers: label + control in one. */
export function TextField({
  label,
  hint,
  error,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => <Input id={id} {...rest} />}
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => <Textarea id={id} {...rest} />}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <Select id={id} {...rest}>
          {children}
        </Select>
      )}
    </Field>
  );
}
