import { Button } from "@/components/ui/button";
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
      className="border-b border-destructive/30 bg-destructive/10 px-4 py-2"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 text-sm">
        <span className="text-destructive">
          Sua conta parou de sincronizar. Reconecte para voltar a receber
          demandas do Outlook.
        </span>
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
          <Button type="submit" size="sm" variant="outline">
            Reconectar
          </Button>
        </form>
      </div>
    </div>
  );
}
