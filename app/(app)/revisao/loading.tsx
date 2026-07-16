import { Skeleton } from "@/components/ui/skeleton";

export default function RevisaoLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 p-9 max-lg:p-4">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-36 rounded-2xl" />
      ))}
    </main>
  );
}
