import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import TicketDetailClient from "@/components/tickets/TicketDetailClient";
import { TicketDetailSkeleton } from "@/components/ui/Skeleton";
import { getTicketDetailPageData } from "@/data/ticket-detail-preview";
import { isSupabaseConfigured } from "@/utils/supabase/server";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Pelacakan & Detail Tiket — ${siteConfig.appName} ${siteConfig.rwShortLabel}`,
  description: `Pantau status penanganan, foto laporan & bukti penyelesaian, serta kronologi pengaduan warga ${siteConfig.rwLabel}.`,
};

async function TicketDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (isSupabaseConfigured()) {
    await connection();
  }
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
    <Suspense fallback={<TicketDetailSkeleton />}>
      <TicketDetailContent params={params} />
    </Suspense>
  );
}
