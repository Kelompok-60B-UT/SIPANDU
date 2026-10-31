import type { HTMLAttributes } from "react";

export default function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border bg-white p-5 ${className}`}
      {...props}
    />
  );
}
