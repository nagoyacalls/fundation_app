import type { ReactNode } from "react";

import { NavLinks } from "./nav-links";
import { ReauthBanner } from "./reauth-banner";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Shell das telas autenticadas. A proteção de acesso é do middleware.ts —
// aqui só o cromo (banner + nav navy da marca). Ver CLAUDE.md.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [session, reviewCount] = await Promise.all([
    auth(),
    prisma.demand.count({ where: { classificationConfirmed: false } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <ReauthBanner />
      <header className="flex h-[72px] shrink-0 items-center justify-between gap-10 bg-primary px-8">
        <div className="flex min-w-0 items-center gap-9">
          <div className="flex items-baseline gap-2.5">
            <span className="text-lg font-extrabold tracking-wide text-white">
              NUMERALLE
            </span>
            <span className="text-[11px] font-bold tracking-[0.18em] text-brand-muted">
              ASSESSORIA CONTÁBIL
            </span>
          </div>
          <NavLinks reviewCount={reviewCount} />
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <span className="hidden text-[13px] text-white/65 sm:inline">
            {session?.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="cursor-pointer text-sm text-white/65 transition-colors hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
