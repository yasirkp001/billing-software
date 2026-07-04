import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  // Red — primary brand action
  primary: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  // Neutral — secondary / cancel / edit (kept distinct from red & green)
  secondary:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50",
  // Green — positive / confirm accent
  success: "bg-success-600 text-white hover:bg-success-700 disabled:bg-success-300",
  // Red (solid) — destructive action
  danger: "bg-danger-600 text-white hover:bg-danger-700 disabled:bg-danger-300",
  ghost: "text-wood-700 hover:bg-wood-50",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-wood-400 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
