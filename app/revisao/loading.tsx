import { Skeleton } from "@/components/ui/skeleton";

export default function RevisaoLoading() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-4 rounded-md border p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-4">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      ))}
    </main>
  );
}
