import Link from "next/link";
import type { ReactNode } from "react";

import { ReauthBanner } from "./reauth-banner";

// Shell das telas autenticadas. A proteção de acesso é do middleware.ts —
// aqui só o cromo (nav + banner). Ver CLAUDE.md: segurança é opt-out.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ReauthBanner />
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 p-4 text-sm">
          <span className="font-semibold">Departamento Pessoal</span>
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <Link
            href="/revisao"
            className="text-muted-foreground hover:text-foreground"
          >
            Revisão
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
