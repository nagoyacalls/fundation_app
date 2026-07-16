"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Folha interativa mínima: só o estado ativo dos links exige o pathname.
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/revisao", label: "Revisão" },
  { href: "/demandas", label: "Demandas" },
  { href: "/analitica", label: "Analítica" },
] as const;

export function NavLinks({ reviewCount }: { reviewCount: number }) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <nav className="flex items-center gap-6">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isActive(link.href)
              ? "font-semibold text-white"
              : "text-white/65 hover:text-white"
          }`}
        >
          {link.label}
          {link.href === "/revisao" && reviewCount > 0 ? (
            <span className="rounded-full bg-brand-muted px-2 py-0.5 text-xs font-bold leading-none text-primary">
              {reviewCount}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
