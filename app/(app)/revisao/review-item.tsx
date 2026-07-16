"use client";

import { useActionState, useState } from "react";

import { confirmClassification, type ActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NEW_COMPANY = "__new__";

const selectClass =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-[3px]";

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
    <li className="flex flex-col gap-3.5 rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{demand.subject}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {demand.senderEmail || "remetente desconhecido"}
            {demand.receivedAt
              ? ` · ${dateFormat.format(new Date(demand.receivedAt))}`
              : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-secondary px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-soft">
            {demand.companyName ?? "Não classificado"}
          </span>
          {demand.webLink ? (
            <a
              href={demand.webLink}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-brand transition-colors hover:text-primary"
            >
              Abrir no Outlook
            </a>
          ) : null}
        </div>
      </div>

      {demand.preview ? (
        <p className="line-clamp-2 text-sm text-ink-soft">{demand.preview}</p>
      ) : null}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="demandId" value={demand.id} />
        {/* O sentinela "nova empresa" é só do client; o servidor recebe
            companyId vazio e decide pelo newCompanyName. */}
        <input
          type="hidden"
          name="companyId"
          value={companyChoice === NEW_COMPANY ? "" : companyChoice}
        />

        <div className="flex w-56 flex-col gap-1.5">
          <Label
            htmlFor={`company-${demand.id}`}
            className="text-[13px] font-normal text-muted-foreground"
          >
            Empresa
          </Label>
          <select
            id={`company-${demand.id}`}
            value={companyChoice}
            onChange={(event) => setCompanyChoice(event.target.value)}
            className={selectClass}
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
          <div className="flex w-56 flex-col gap-1.5">
            <Label
              htmlFor={`new-company-${demand.id}`}
              className="text-[13px] font-normal text-muted-foreground"
            >
              Nome da nova empresa
            </Label>
            <Input
              id={`new-company-${demand.id}`}
              name="newCompanyName"
              placeholder={demand.senderDomain || "Razão social"}
              required
              className="h-10"
            />
          </div>
        ) : null}

        <div className="flex w-52 flex-col gap-1.5">
          <Label
            htmlFor={`category-${demand.id}`}
            className="text-[13px] font-normal text-muted-foreground"
          >
            Categoria
          </Label>
          <Input
            id={`category-${demand.id}`}
            name="category"
            defaultValue={demand.category ?? ""}
            placeholder="ex.: ferias"
            required
            className="h-10"
          />
        </div>

        <Button type="submit" disabled={pending} className="h-10 px-4">
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
