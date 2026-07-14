import { Skeleton } from "@/components/ui/skeleton";

export default function AnaliticaLoading() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <Skeleton className="h-6 w-28" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-32" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </main>
  );
}
