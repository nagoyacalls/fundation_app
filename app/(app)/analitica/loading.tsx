import { Skeleton } from "@/components/ui/skeleton";

export default function AnaliticaLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 p-9 max-lg:p-4">
      <Skeleton className="h-7 w-28" />
      <div className="grid grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-2 gap-5">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </main>
  );
}
