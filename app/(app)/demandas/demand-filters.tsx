"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";

const selectClass =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

const STATUS_OPTIONS = [
  ["aberta", "Aberta"],
  ["em_andamento", "Em andamento"],
  ["concluida", "Concluída"],
  ["cancelada", "Cancelada"],
] as const;

const PRAZO_OPTIONS = [
  ["sem_prazo", "Sem prazo"],
  ["no_prazo", "No prazo"],
  ["vencendo", "Vencendo"],
  ["atrasada", "Atrasada"],
] as const;

export function DemandFilters({
  companies,
  users,
  categories,
}: {
  companies: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(params.size > 0 ? `${pathname}?${params}` : pathname);
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setParam("q", new FormData(event.currentTarget).get("q") as string);
      }}
    >
      <Input
        name="q"
        type="search"
        placeholder="Buscar assunto ou remetente…"
        defaultValue={searchParams.get("q") ?? ""}
        className="h-9 w-64"
        aria-label="Buscar por assunto ou remetente"
      />
      <select
        aria-label="Filtrar por empresa"
        className={selectClass}
        value={searchParams.get("empresa") ?? ""}
        onChange={(event) => setParam("empresa", event.target.value)}
      >
        <option value="">Empresa: todas</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por status"
        className={selectClass}
        value={searchParams.get("status") ?? ""}
        onChange={(event) => setParam("status", event.target.value)}
      >
        <option value="">Status: todos</option>
        {STATUS_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por categoria"
        className={selectClass}
        value={searchParams.get("categoria") ?? ""}
        onChange={(event) => setParam("categoria", event.target.value)}
      >
        <option value="">Categoria: todas</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por prazo"
        className={selectClass}
        value={searchParams.get("prazo") ?? ""}
        onChange={(event) => setParam("prazo", event.target.value)}
      >
        <option value="">Prazo: todos</option>
        {PRAZO_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por responsável"
        className={selectClass}
        value={searchParams.get("resp") ?? ""}
        onChange={(event) => setParam("resp", event.target.value)}
      >
        <option value="">Responsável: todos</option>
        <option value="sem">Sem responsável</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </form>
  );
}
