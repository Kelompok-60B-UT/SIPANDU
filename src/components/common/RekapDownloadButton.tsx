"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";

type ExportFormat = "xlsx" | "csv" | "json";

interface RekapDownloadButtonProps {
  className?: string;
}

export default function RekapDownloadButton({
  className = "",
}: RekapDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadingFormat, setDownloadingFormat] =
    useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDownload = async (format: ExportFormat) => {
    setDownloadingFormat(format);
    try {
      const res = await fetch(`/api/rekap?format=${format}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "Gagal mengunduh berkas rekap pengaduan.",
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const todayIso = new Date().toISOString().slice(0, 10);
      a.download = `rekap-sipandu-rw06-${todayIso}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh.",
      );
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={Boolean(downloadingFormat)}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-surface disabled:opacity-50 sm:text-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {downloadingFormat ? (
          <Loader2 size={15} className="animate-spin text-primary" />
        ) : (
          <Download size={15} />
        )}
        <span>
          {downloadingFormat
            ? `Mengunduh ${downloadingFormat.toUpperCase()}...`
            : "Unduh rekap"}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-72 origin-top-right rounded-2xl border border-border bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95">
          <div className="border-b border-border/70 px-3 py-2">
            <p className="text-xs font-bold text-ink">Format Unduh Rekap</p>
            <p className="mt-0.5 text-[11px] text-muted">
              Pilih format ekspor berkas laporan
            </p>
          </div>

          <div className="mt-1 space-y-1">
            {/* Format XLSX */}
            <button
              type="button"
              disabled={Boolean(downloadingFormat)}
              onClick={() => handleDownload("xlsx")}
              className="flex w-full cursor-pointer items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface disabled:opacity-50"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                {downloadingFormat === "xlsx" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-ink">
                    Excel (.xlsx)
                  </span>
                  <span className="rounded bg-emerald-100/70 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                    Lengkap
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">
                  Multi-sheet: Daftar Pengaduan, Ringkasan Status, RT & Kategori.
                </p>
              </div>
            </button>

            {/* Format CSV */}
            <button
              type="button"
              disabled={Boolean(downloadingFormat)}
              onClick={() => handleDownload("csv")}
              className="flex w-full cursor-pointer items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface disabled:opacity-50"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                {downloadingFormat === "csv" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-ink">
                  Tabel CSV (.csv)
                </span>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">
                  Tabel data mentah pengaduan (kompatibel Excel & spreadsheet).
                </p>
              </div>
            </button>

            {/* Format JSON */}
            <button
              type="button"
              disabled={Boolean(downloadingFormat)}
              onClick={() => handleDownload("json")}
              className="flex w-full cursor-pointer items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface disabled:opacity-50"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                {downloadingFormat === "json" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileJson size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-ink">
                  Format JSON (.json)
                </span>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">
                  Data terstruktur lengkap beserta ringkasan statistik.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
