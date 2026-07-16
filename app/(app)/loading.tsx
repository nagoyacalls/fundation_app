import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 p-9 max-lg:p-4">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
