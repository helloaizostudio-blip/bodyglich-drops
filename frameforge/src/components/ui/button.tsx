import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "navy";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none transition-[background-color,box-shadow,transform,color] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgb(38_112_230/0.7)] hover:bg-brand-700",
  secondary: "bg-white text-navy-900 ring-1 ring-inset ring-line hover:bg-brand-100",
  ghost: "text-navy-700 hover:bg-brand-100",
  danger: "bg-bad-600 text-white hover:bg-bad-700",
  navy: "bg-navy-900 text-white hover:bg-navy-800",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(base, variants[variant], sizes[size], className);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
};

export function Button({ variant, size, loading, icon, className, children, disabled, type, ...rest }: ButtonProps) {
  return (
    <button type={type ?? "button"} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant,
  size,
  icon,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  type,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type ?? "button"}
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid size-10 shrink-0 place-items-center rounded-xl text-navy-700 transition-colors hover:bg-brand-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
