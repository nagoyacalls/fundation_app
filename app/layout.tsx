import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Departamento Pessoal",
  description: "Organização e indicadores sobre os e-mails do DP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen text-sm antialiased`}>
        {children}
      </body>
    </html>
  );
}
