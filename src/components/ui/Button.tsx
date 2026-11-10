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
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  const styles = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    outline: "border border-border bg-white text-primary hover:bg-surface",
  };

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props} />
  );
}
