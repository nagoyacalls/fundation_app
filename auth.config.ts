import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { GRAPH_SCOPES } from "@/lib/graph";

/**
 * Config edge-safe, compartilhada pelo middleware e pelo auth completo.
 * NÃO importa Prisma nem node:crypto: o middleware roda no edge runtime,
 * onde esses módulos não existem. As partes que dependem de banco
 * (signIn, jwt, session) ficam só em lib/auth.ts.
 */
export const authConfig = {
  providers: [
    MicrosoftEntraID({
      authorization: { params: { scope: GRAPH_SCOPES } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    // Chamado pelo middleware: exige sessão para tudo que ele cobre.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
