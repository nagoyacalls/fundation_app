import { redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(120deg,#0B2545_0%,#13315C_55%,#0D9488_130%)] p-4">
      <div className="flex w-[440px] max-w-full flex-col gap-7 rounded-3xl bg-white px-10 py-11 shadow-[0_24px_64px_rgba(11,37,69,0.32)]">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-[22px] font-extrabold tracking-wide text-primary">
            NUMERALLE
          </p>
          <p className="text-[10px] font-bold tracking-[0.28em] text-brand">
            ASSESSORIA CONTÁBIL
          </p>
          <h1 className="mt-4 mb-1 text-sm font-semibold text-ink-soft">
            Departamento Pessoal
          </h1>
          <p className="max-w-[280px] text-[12.5px] text-muted-foreground">
            Organização e indicadores sobre a caixa do Outlook
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border bg-white text-sm font-medium text-primary transition-colors hover:bg-secondary"
          >
            <span aria-hidden className="inline-block size-4 rounded-[5px] bg-brand" />
            Entrar com Microsoft
          </button>
        </form>
        <p className="text-center text-[11.5px] text-input">
          Acesso restrito a analistas do Departamento Pessoal.
        </p>
      </div>
    </main>
  );
}
