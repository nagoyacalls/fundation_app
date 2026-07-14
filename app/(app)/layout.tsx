import Link from "next/link";
import type { ReactNode } from "react";

import { ReauthBanner } from "./reauth-banner";
import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";

// Shell das telas autenticadas. A proteção de acesso é do middleware.ts —
// aqui só o cromo (nav + banner). Ver CLAUDE.md: segurança é opt-out.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

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
          <Link
            href="/demandas"
            className="text-muted-foreground hover:text-foreground"
          >
            Demandas
          </Link>
          <Link
            href="/analitica"
            className="text-muted-foreground hover:text-foreground"
          >
            Analítica
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {session?.user?.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
