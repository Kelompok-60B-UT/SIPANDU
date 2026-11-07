import { Suspense } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import AuthButtons from "@/components/layout/AuthButtons";
import { AuthButtonsSkeleton } from "@/components/ui/Skeleton";

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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <MessageSquareText size={18} />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-ink">SIPANDU</span>
            <span className="hidden text-[10px] text-muted xs:block sm:block">
              RW 06 Parakan Saat, Bandung
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted lg:flex">
          {menu.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              className={
                i === 0
                  ? "font-medium text-primary"
                  : "transition-colors hover:text-ink"
              }
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Suspense fallback={<AuthButtonsSkeleton />}>
          <AuthButtons />
        </Suspense>
      </div>
    </header>
  );
}
