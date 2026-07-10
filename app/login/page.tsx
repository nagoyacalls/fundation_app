import { redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="p-4">
      <h1>Departamento Pessoal</h1>
      <form
        action={async () => {
          "use server";
          await signIn("microsoft-entra-id", { redirectTo: "/" });
        }}
      >
        <button type="submit">Entrar com Microsoft</button>
      </form>
    </main>
  );
}
