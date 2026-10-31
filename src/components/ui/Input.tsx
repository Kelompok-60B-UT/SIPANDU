import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  suffix?: ReactNode;
};

export default function Input({
  label,
  hint,
  suffix,
  id,
  name,
  required,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-ink">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          name={name}
          required={required}
          className={`w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/75 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 read-only:bg-surface/60 ${
            suffix ? "pr-10" : ""
          } ${className}`}
          {...props}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-3 flex items-center text-muted">
            {suffix}
          </div>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
