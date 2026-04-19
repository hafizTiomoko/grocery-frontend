export function ProductCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-card">
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-9 w-20 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}
