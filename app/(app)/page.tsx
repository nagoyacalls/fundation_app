import { auth, signOut } from "@/lib/auth";

// Acesso garantido pelo middleware; aqui a sessão é só para exibir o usuário.
export default async function Home() {
  const session = await auth();

  return (
    <main className="p-4">
      <h1>Departamento Pessoal</h1>
      <p>Conectado como {session?.user?.email}.</p>
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
