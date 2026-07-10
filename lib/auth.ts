import NextAuth, { type DefaultSession } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { encryptSecret, encryptionKeyFromEnv } from "./crypto";
import { prisma } from "./db";
import { GRAPH_SCOPES } from "./graph";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

/**
 * No Entra o e-mail pode não vir em `email`; `preferred_username` costuma
 * carregar o UPN. Sem e-mail não há como ancorar o User, então o login falha.
 */
function resolveLoginEmail(
  email: string | null | undefined,
  preferredUsername: unknown,
): string | null {
  const candidate =
    email ??
    (typeof preferredUsername === "string" ? preferredUsername : null);
  return candidate ? candidate.trim().toLowerCase() : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      authorization: { params: { scope: GRAPH_SCOPES } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = resolveLoginEmail(user.email, profile?.preferred_username);
      if (!email) {
        return false;
      }

      // Refresh token cifrado; só atualiza quando o Entra manda um novo,
      // para não apagar um token válido num re-login silencioso.
      const encryptedRefreshToken = account?.refresh_token
        ? encryptSecret(account.refresh_token, encryptionKeyFromEnv())
        : undefined;

      await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: user.name ?? email,
          refreshToken: encryptedRefreshToken,
        },
        update: {
          name: user.name ?? email,
          ...(encryptedRefreshToken
            ? { refreshToken: encryptedRefreshToken }
            : {}),
        },
      });
      return true;
    },
    async jwt({ token, account, user, profile }) {
      // Só no login inicial; nas demais requisições o id já está no token.
      if (account) {
        const email = resolveLoginEmail(
          user?.email,
          profile?.preferred_username,
        );
        if (email) {
          const dbUser = await prisma.user.findUnique({ where: { email } });
          if (dbUser) {
            token.userId = dbUser.id;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
