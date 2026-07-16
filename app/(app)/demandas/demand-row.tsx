"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  assignDemand,
  setDueDate,
  updateDemandStatus,
  type ActionResult,
} from "./actions";
import type { DeadlineState } from "@/lib/deadline";
import type { DemandStatus } from "@/lib/validations";

const controlClass =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 shrink-0 rounded-md border bg-transparent px-1.5 text-[13px] outline-none focus-visible:ring-[3px] disabled:opacity-50";

const pillClass =
  "shrink-0 truncate rounded-full bg-secondary px-3 py-1 text-[13px] font-semibold text-ink-soft";

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
  companyId: string | null;
  companyName: string | null;
  category: string | null;
  status: DemandStatus;
  assigneeId: string | null;
  /** YYYY-MM-DD ou null. */
  dueDate: string | null;
  deadline: DeadlineState;
}

// Destaque reservado a estado (docs/ui.md): atrasada forte, vencendo médio,
// no_prazo sem destaque. sem_prazo é o aviso discreto ao lado do campo de
// data, exigido por docs/prazos.md — o design omitia; o contrato vence.
function DeadlineBadge({ deadline }: { deadline: DeadlineState }) {
  if (deadline === "atrasada") {
    return (
      <span className="shrink-0 whitespace-nowrap rounded-full bg-destructive px-3 py-1 text-[13px] font-bold text-white">
        Atrasada
      </span>
    );
  }
  if (deadline === "vencendo") {
    return (
      <span className="shrink-0 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[13px] font-bold text-white">
        Vencendo
      </span>
    );
  }
  if (deadline === "sem_prazo") {
    return (
      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        sem prazo definido
      </span>
    );
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
    <li className="min-w-[960px] animate-fade-up border-b last:border-b-0">
      <div className="flex h-[76px] items-center gap-4 px-5 transition-colors duration-150 hover:bg-secondary/50">
        <div className="min-w-[180px] flex-1">
          <p className="truncate text-sm font-medium">{demand.subject}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {demand.senderEmail || "remetente desconhecido"}
          </p>
        </div>

        {demand.companyName && demand.companyId ? (
          <Link
            href={`/empresas/${demand.companyId}`}
            className={`${pillClass} w-[130px] text-center transition-all duration-150 hover:scale-105 hover:bg-muted active:scale-100`}
          >
            {demand.companyName}
          </Link>
        ) : null}

        {demand.category ? (
          <span className={`${pillClass} max-w-[130px]`}>{demand.category}</span>
        ) : null}

        <DeadlineBadge deadline={demand.deadline} />

        <form action={dueAction} className="shrink-0">
          <input type="hidden" name="demandId" value={demand.id} />
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
            className={`${controlClass} w-[130px]`}
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
            className={`${controlClass} w-[120px]`}
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
            className={`${controlClass} w-[140px]`}
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
          <a
            href={demand.webLink}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[13px] text-brand transition-colors hover:text-primary"
          >
            Outlook
          </a>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div className="flex flex-col gap-1 px-5 pb-3">
          {errors.map((state, index) => (
            <p key={index} role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ))}
        </div>
      ) : null}
    </li>
  );
}
