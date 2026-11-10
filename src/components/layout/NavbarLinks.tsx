"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
}

interface NavbarLinksProps {
  items: NavItem[];
}

export default function NavbarLinks({ items }: NavbarLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-8 text-sm text-muted lg:flex">
      {items.map((item) => {
        const isBantuan = item.href === "/bantuan";
        const isBeranda = item.label === "Beranda";

        let isActive = false;
        if (isBantuan) {
          isActive = pathname === "/bantuan" || pathname?.startsWith("/bantuan/");
        } else if (isBeranda) {
          isActive = pathname === "/";
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={
              isActive
                ? "font-medium text-primary"
                : "transition-colors hover:text-ink"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
