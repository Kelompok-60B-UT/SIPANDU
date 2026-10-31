import type { TicketStatus } from "@/types";
import { statusColorClass, statusLabelId } from "@/utils/transition";

export default function Badge({
  status,
  className = "",
}: {
  status: TicketStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColorClass(status)} ${className}`}
    >
      {statusLabelId(status)}
    </span>
  );
}
