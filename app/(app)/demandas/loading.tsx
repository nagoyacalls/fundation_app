import { Skeleton } from "@/components/ui/skeleton";

export default function DemandasLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-9 max-lg:p-4">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex gap-2.5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border-b p-5 last:border-b-0">
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </main>
  );
}
