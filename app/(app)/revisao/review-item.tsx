"use client";

import { useActionState, useState } from "react";

import { confirmClassification, type ActionResult } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NEW_COMPANY = "__new__";

// Locale e fuso fixos: renderiza igual no servidor e no cliente.
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export interface ReviewDemand {
  id: string;
  category: string | null;
  companyId: string | null;
  companyName: string | null;
  subject: string;
  preview: string;
  senderEmail: string;
  senderDomain: string;
  receivedAt: string | null;
  webLink: string | null;
}

export function ReviewItem({
  demand,
  companies,
}: {
  demand: ReviewDemand;
  companies: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    confirmClassification,
    null,
  );
  const [companyChoice, setCompanyChoice] = useState(
    demand.companyId ?? "",
  );

  return (
    <li className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{demand.subject}</p>
          <p className="truncate text-sm text-muted-foreground">
            {demand.senderEmail || "remetente desconhecido"}
            {demand.receivedAt
              ? ` · ${dateFormat.format(new Date(demand.receivedAt))}`
              : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {demand.companyName ? (
            <Badge variant="secondary">{demand.companyName}</Badge>
          ) : (
            <Badge variant="outline">Não classificado</Badge>
          )}
          {demand.webLink ? (
            <Button asChild variant="ghost" size="sm">
              <a href={demand.webLink} target="_blank" rel="noreferrer">
                Abrir no Outlook
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {demand.preview ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {demand.preview}
        </p>
      ) : null}

      <form action={formAction} className="flex flex-wrap items-end gap-4">
        <input type="hidden" name="demandId" value={demand.id} />
        {/* O sentinela "nova empresa" é só do client; o servidor recebe
            companyId vazio e decide pelo newCompanyName. */}
        <input
          type="hidden"
          name="companyId"
          value={companyChoice === NEW_COMPANY ? "" : companyChoice}
        />

        <div className="flex w-56 flex-col gap-2">
          <Label htmlFor={`company-${demand.id}`}>Empresa</Label>
          <select
            id={`company-${demand.id}`}
            value={companyChoice}
            onChange={(event) => setCompanyChoice(event.target.value)}
            className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          >
            <option value="">Selecione…</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
            <option value={NEW_COMPANY}>Nova empresa…</option>
          </select>
        </div>

        {companyChoice === NEW_COMPANY ? (
          <div className="flex w-56 flex-col gap-2">
            <Label htmlFor={`new-company-${demand.id}`}>Nome da nova empresa</Label>
            <Input
              id={`new-company-${demand.id}`}
              name="newCompanyName"
              placeholder={demand.senderDomain || "Razão social"}
              required
            />
          </div>
        ) : null}

        <div className="flex w-56 flex-col gap-2">
          <Label htmlFor={`category-${demand.id}`}>Categoria</Label>
          <Input
            id={`category-${demand.id}`}
            name="category"
            defaultValue={demand.category ?? ""}
            placeholder="ex.: ferias"
            required
          />
        </div>

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Confirmando…" : "Confirmar"}
        </Button>

        {state && !state.ok ? (
          <p role="alert" className="basis-full text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
      </form>
    </li>
  );
}
