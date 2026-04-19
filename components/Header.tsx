"use client";

export function Header({
  value,
  onChange,
  loading,
}: {
  value: string;
  onChange: (q: string) => void;
  loading?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500" />
          <span className="text-lg font-semibold tracking-tight">OneBasquet</span>
        </div>
        <div className="ml-auto flex flex-1 items-center">
          <div className="relative w-full">
            <input
              type="search"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search milk, bread, eggs…"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            {loading && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600"
                aria-label="Searching"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
