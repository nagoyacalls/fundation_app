import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Faixa persistente quando a conta do usuário logado está em reauth_required.
 * Exigida por docs/sync.md: sem ela a conta para de sincronizar em silêncio.
 * Lê o syncStatus fresco do banco — não do JWT, que ficaria defasado após o
 * sync marcar a conta.
 */
export async function ReauthBanner() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { syncStatus: true },
  });
  if (user?.syncStatus !== "reauth_required") {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 border-b border-destructive-border bg-destructive-muted px-8 py-4"
    >
      <p className="text-base text-destructive">
        Sua conta parou de sincronizar. Reconecte para voltar a receber
        demandas do Outlook.
      </p>
      <form
        action={async () => {
          "use server";
          // prompt: consent força o Entra a devolver um refresh token novo,
          // que o login silencioso costuma omitir (docs/sync.md).
          await signIn(
            "microsoft-entra-id",
            { redirectTo: "/" },
            { prompt: "consent" },
          );
        }}
      >
        <button
          type="submit"
          className="h-10 cursor-pointer rounded-full border border-destructive bg-white px-5 text-[15px] font-semibold text-destructive transition-colors hover:bg-destructive-muted"
        >
          Reconectar
        </button>
      </form>
    </div>
  );
}
