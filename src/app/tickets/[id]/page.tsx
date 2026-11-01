import { Suspense } from "react";
import type { Metadata } from "next";
import TicketDetailClient from "@/components/tickets/TicketDetailClient";
import { getTicketDetailPageData } from "@/data/ticket-detail-preview";

export const metadata: Metadata = {
  title: "Pelacakan & Detail Tiket — SIPANDU RW 06",
  description:
    "Pantau status penanganan, foto laporan & bukti penyelesaian, serta kronologi pengaduan warga RW 06 Parakansaat.",
};

async function TicketDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTicketDetailPageData(id);
  const clientKey = data.ticket
    ? `${data.ticket.id}-${data.ticket.updatedAt}`
    : id;
  return <TicketDetailClient key={clientKey} data={data} />;
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface text-xs text-muted">
          Memuat pelacakan tiket...
        </div>
      }
    >
      <TicketDetailContent params={params} />
    </Suspense>
  );
}
