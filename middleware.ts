import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// Segurança é opt-out (CLAUDE.md): o middleware protege por padrão, em vez de
// cada página repetir a verificação. Sem sessão, o authorized callback
// redireciona para /login.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protege tudo, menos assets e rotas públicas. /api fica de fora: cada rota
  // cuida da própria auth — /api/sync pelo CRON_SECRET, /api/auth pelo Auth.js.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
