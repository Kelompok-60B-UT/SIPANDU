import type { TicketStatus } from "@/types";
import { statusColorClass, statusLabelId } from "@/utils/transition";

export default function Badge({
  status,
  dot = false,
  className = "",
}: {
  status: TicketStatus;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusColorClass(status)} ${className}`}
    >
      {dot && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      {statusLabelId(status)}
    </span>
  );
}
