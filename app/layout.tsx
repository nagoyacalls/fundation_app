import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Departamento Pessoal",
  description: "Organização e indicadores sobre os e-mails do DP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
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
      </body>
    </html>
  );
}
