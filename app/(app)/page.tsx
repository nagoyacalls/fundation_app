import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="p-4">
      <h1>Departamento Pessoal</h1>
      <p>Conectado como {session.user.email}.</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit">Sair</button>
      </form>
    </main>
  );
}
