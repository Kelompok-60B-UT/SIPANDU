import { Suspense } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import AuthButtons from "@/components/layout/AuthButtons";

// Menu navigasi: href "#..." artinya lompat ke bagian di halaman yang sama
const menu = [
  { label: "Beranda", href: "#beranda" },
  { label: "Cara mengadu", href: "#cara-mengadu" },
  { label: "Layanan", href: "#layanan" },
  { label: "Tentang RW", href: "#tentang" },
  { label: "Bantuan", href: "#bantuan" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <MessageSquareText size={18} />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-ink">SIPANDU</span>
            <span className="block text-[10px] text-muted">
              RW 06 Parakansaat, Bandung
            </span>
          </span>
        </Link>

        {/* Menu tengah: disembunyikan di layar kecil */}
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          {menu.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              className={i === 0 ? "font-medium text-primary" : "hover:text-ink"}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Tombol kanan: dimuat terpisah (Suspense) karena cek login */}
        <div className="flex items-center gap-2">
          <Suspense fallback={<div className="h-9 w-44" />}>
            <AuthButtons />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
