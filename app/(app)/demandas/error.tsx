"use client";

import { Button } from "@/components/ui/button";

export default function DemandasError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto mt-9 flex w-full max-w-[1240px] flex-col items-center gap-4 rounded-2xl border border-destructive-border bg-destructive-muted p-8 text-center">
      <p className="text-sm text-destructive">
        Não foi possível carregar as demandas.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Tentar de novo
      </Button>
    </main>
  );
}
