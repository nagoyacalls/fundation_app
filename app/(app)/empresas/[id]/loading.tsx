import { Skeleton } from "@/components/ui/skeleton";

export default function EmpresaLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-9 max-lg:p-4">
      <div>
        <Skeleton className="mb-2 h-7 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-2.5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-b p-5 last:border-b-0">
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </main>
  );
}
