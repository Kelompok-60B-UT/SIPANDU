import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";

  const styles = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    outline: "border border-border bg-white text-ink hover:bg-surface",
  };

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props} />
  );
}
