"use client";
import { AuthButton } from "./AuthButton";

export function Header({
  value,
  onChange,
  loading,
  onScanClick,
}: {
  value: string;
  onChange: (q: string) => void;
  loading?: boolean;
  onScanClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500" />
          <span className="text-lg font-semibold tracking-tight">OneBasqet</span>
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
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {loading && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600"
                  aria-label="Searching"
                />
              )}
              {onScanClick && !loading && (
                <button
                  type="button"
                  onClick={onScanClick}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Scan barcode"
                  title="Scan barcode"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <line x1="7" y1="12" x2="17" y2="12" />
                    <line x1="7" y1="8" x2="9" y2="8" />
                    <line x1="7" y1="16" x2="9" y2="16" />
                    <line x1="11" y1="8" x2="11" y2="16" />
                    <line x1="14" y1="8" x2="17" y2="8" />
                    <line x1="14" y1="16" x2="17" y2="16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}
