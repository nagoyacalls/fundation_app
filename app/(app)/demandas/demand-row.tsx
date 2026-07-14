"use client";

import { useActionState } from "react";

import {
  assignDemand,
  setDueDate,
  updateDemandStatus,
  type ActionResult,
} from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DeadlineState } from "@/lib/deadline";
import type { DemandStatus } from "@/lib/validations";

const selectClass =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

const STATUS_LABELS: Record<DemandStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export interface DemandRowData {
  id: string;
  subject: string;
  senderEmail: string;
  webLink: string | null;
  companyName: string | null;
  category: string | null;
  status: DemandStatus;
  assigneeId: string | null;
  /** YYYY-MM-DD ou null. */
  dueDate: string | null;
  deadline: DeadlineState;
}

// Destaque reservado a estado (docs/ui.md): atrasada forte, vencendo médio,
// no_prazo sem destaque. sem_prazo é aviso discreto ao lado do campo de data.
function DeadlineBadge({ deadline }: { deadline: DeadlineState }) {
  if (deadline === "atrasada") {
    return <Badge variant="destructive">Atrasada</Badge>;
  }
  if (deadline === "vencendo") {
    return <Badge>Vencendo</Badge>;
  }
  return null;
}

export function DemandRow({
  demand,
  users,
}: {
  demand: DemandRowData;
  users: Array<{ id: string; name: string }>;
}) {
  const [statusState, statusAction, statusPending] = useActionState<
    ActionResult | null,
    FormData
  >(updateDemandStatus, null);
  const [assignState, assignAction, assignPending] = useActionState<
    ActionResult | null,
    FormData
  >(assignDemand, null);
  const [dueState, dueAction, duePending] = useActionState<
    ActionResult | null,
    FormData
  >(setDueDate, null);

  const errors = [statusState, assignState, dueState].filter(
    (state): state is { ok: false; error: string } => state !== null && !state.ok,
  );

  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-64">
          <p className="truncate text-sm font-medium">{demand.subject}</p>
          <p className="truncate text-xs text-muted-foreground">
            {demand.senderEmail || "remetente desconhecido"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {demand.companyName ? (
            <Badge variant="secondary">{demand.companyName}</Badge>
          ) : null}
          {demand.category ? (
            <Badge variant="outline">{demand.category}</Badge>
          ) : null}
          <DeadlineBadge deadline={demand.deadline} />
        </div>

        <form action={dueAction} className="flex shrink-0 items-center gap-2">
          <input type="hidden" name="demandId" value={demand.id} />
          {demand.deadline === "sem_prazo" ? (
            <span className="text-xs text-muted-foreground">
              sem prazo definido
            </span>
          ) : null}
          <input
            type="date"
            name="dueDate"
            aria-label="Prazo da demanda"
            // key remonta o input quando o valor real muda no servidor;
            // enquanto isso, o valor digitado permanece visível.
            key={demand.dueDate ?? "sem-prazo"}
            defaultValue={demand.dueDate ?? ""}
            disabled={duePending}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className={selectClass}
          />
        </form>

        <form action={statusAction} className="shrink-0">
          <input type="hidden" name="demandId" value={demand.id} />
          <select
            name="status"
            aria-label="Status da demanda"
            key={demand.status}
            defaultValue={demand.status}
            disabled={statusPending}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className={selectClass}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </form>

        <form action={assignAction} className="shrink-0">
          <input type="hidden" name="demandId" value={demand.id} />
          <select
            name="assigneeId"
            aria-label="Responsável pela demanda"
            key={demand.assigneeId ?? "sem-responsavel"}
            defaultValue={demand.assigneeId ?? ""}
            disabled={assignPending}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className={selectClass}
          >
            <option value="">Sem responsável</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </form>

        {demand.webLink ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <a href={demand.webLink} target="_blank" rel="noreferrer">
              Outlook
            </a>
          </Button>
        ) : null}
      </div>

      {errors.map((state, index) => (
        <p key={index} role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ))}
    </li>
  );
}
