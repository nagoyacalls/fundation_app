"use client";

import { Button } from "@/components/ui/button";

export default function EmpresaError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center gap-4 p-8 text-center">
      <p className="text-sm text-destructive">
        Não foi possível carregar a empresa.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Tentar de novo
      </Button>
    </main>
  );
}
