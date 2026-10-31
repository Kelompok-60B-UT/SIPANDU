import type { ComplaintStatus } from "@/types";

// Teks dan warna untuk setiap status laporan
const labels: Record<ComplaintStatus, string> = {
  diajukan: "Diajukan",
  diteruskan: "Diteruskan RT",
  ditolak: "Ditolak",
  diproses: "Diproses RW",
  selesai: "Selesai",
};

const colors: Record<ComplaintStatus, string> = {
  diajukan: "bg-slate-100 text-slate-700",
  diteruskan: "bg-blue-50 text-blue-700",
  ditolak: "bg-red-50 text-red-700",
  diproses: "bg-amber-50 text-amber-700",
  selesai: "bg-green-50 text-green-700",
};

export default function Badge({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}