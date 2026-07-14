import { Skeleton } from "@/components/ui/skeleton";

export default function EmpresaLoading() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <div>
        <Skeleton className="mb-2 h-6 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex flex-col divide-y rounded-md border">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    </main>
  );
}
