"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, ClipboardCheck } from "lucide-react";
import { markNotificationsRead } from "@/app/actions/profile";
import type { Notification } from "@/types";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function formatNotifTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Tambah offset WIB (+7) agar konsisten di server & client
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mm = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${wib.getUTCDate()} ${MONTHS_SHORT[wib.getUTCMonth()]}, ${hh}.${mm}`;
}

function parseNotifContent(raw: string): { title: string; detail: string } {
  if (raw.includes("|")) {
    const [title, detail] = raw.split("|");
    return { title: title.trim(), detail: detail.trim() };
  }
  return { title: raw, detail: "Pembaruan status pengaduan" };
}

export default function NotificationsCard({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    });
  };

  return (
    <section
      id="notifikasi"
      className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink">Notifikasi terbaru</h2>
        <button
          type="button"
          disabled={isPending || notifications.length === 0}
          onClick={handleMarkAllRead}
          className="cursor-pointer text-xs font-semibold text-primary hover:underline disabled:opacity-50"
        >
          Semua
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="mt-5 text-xs text-muted">
          Belum ada notifikasi pembaruan laporan saat ini.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {notifications.slice(0, 4).map((item) => {
            const { title, detail } = parseNotifContent(item.message);
            const lower = title.toLowerCase();
            const isDone = lower.includes("selesai");
            const isVerified =
              lower.includes("diteruskan") || lower.includes("diverifikasi");

            return (
              <li key={item.id} className="flex items-start gap-3">
                {isDone ? (
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                ) : isVerified ? (
                  <ClipboardCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-purple-600"
                  />
                ) : (
                  <Bell size={18} className="mt-0.5 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  {item.ticket_id ? (
                    <Link
                      href={`/tickets/${item.ticket_id}`}
                      className="block text-xs font-semibold text-ink hover:text-primary hover:underline"
                    >
                      {title}
                    </Link>
                  ) : (
                    <p className="text-xs font-semibold text-ink">{title}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted">
                    {detail} • {formatNotifTime(item.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
