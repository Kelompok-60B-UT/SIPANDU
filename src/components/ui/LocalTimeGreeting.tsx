"use client";

import { useSyncExternalStore } from "react";
import { siteConfig } from "@/config/site";

const DAYS_ID = [
  "MINGGU",
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
];

const MONTHS_ID = [
  "JANUARI",
  "FEBRUARI",
  "MARET",
  "APRIL",
  "MEI",
  "JUNI",
  "JULI",
  "AGUSTUS",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DESEMBER",
];

const HONORIFICS = new Set([
  "pak",
  "bu",
  "bapak",
  "ibu",
  "kang",
  "teh",
  "mas",
  "mbak",
]);

function subscribeClock(onStoreChange: () => void): () => void {
  const interval = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(interval);
}

function getClientClockKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
}

function getServerClockKey(): null {
  return null;
}

export function getGreetingByHour(hour: number): string {
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function formatFriendlyUserName(
  fullName: string,
  fallback = "Warga",
): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length >= 2 && HONORIFICS.has(parts[0].toLowerCase())) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

export function useLocalTimeGreeting() {
  const clockKey = useSyncExternalStore(
    subscribeClock,
    getClientClockKey,
    getServerClockKey,
  );

  if (!clockKey) {
    return {
      isHydrated: false,
      greeting: "Selamat pagi",
      bannerDateUpper: null as string | null,
      monthYearUpper: null as string | null,
    };
  }

  const [y, m, d, h] = clockKey.split("-").map(Number);
  const localDate = new Date(y, m, d);
  const dayName = DAYS_ID[localDate.getDay()] ?? "HARI INI";
  const monthName = MONTHS_ID[m] ?? "";

  return {
    isHydrated: true,
    greeting: getGreetingByHour(h),
    bannerDateUpper: `${dayName}, ${d} ${monthName} ${y}`,
    monthYearUpper: `${monthName} ${y}`,
  };
}

export function WargaGreetingHeader({
  fullName,
  isPreview,
}: {
  fullName: string;
  isPreview: boolean;
}) {
  const { greeting, bannerDateUpper } = useLocalTimeGreeting();

  const displayName = isPreview
    ? "Bu Dewi"
    : formatFriendlyUserName(fullName, "Warga");

  const dateText =
    bannerDateUpper ?? (isPreview ? "SABTU, 31 OKTOBER 2026" : siteConfig.subHeaderLabel.toUpperCase());

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        {dateText}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
        {greeting}, {displayName} 👋
      </h1>
      <p className="mt-1 text-sm text-muted">
        Terima kasih sudah ikut menjaga lingkungan kita.
      </p>
    </div>
  );
}
