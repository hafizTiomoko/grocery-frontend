"use client";
import { RETAILER_LABEL, type Retailer } from "@/lib/api";
import { useRetailerFilter } from "@/store/useRetailerFilter";

const ALL_RETAILERS = Object.keys(RETAILER_LABEL) as Retailer[];

export function RetailerFilterPanel({ onClose }: { onClose: () => void }) {
  const enabled = useRetailerFilter((s) => s.enabled);
  const toggle = useRetailerFilter((s) => s.toggle);
  const selectAll = useRetailerFilter((s) => s.selectAll);
  const clearAll = useRetailerFilter((s) => s.clearAll);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-slate-900">Filter retailers</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-500">
            Choose which supermarkets show up in your search results.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={selectAll}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Select all
            </button>
            <button
              onClick={clearAll}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Clear all
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 pb-2">
            {ALL_RETAILERS.map((r) => {
              const isOn = enabled.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => toggle(r)}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                    isOn
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-400"
                  }`}
                  aria-pressed={isOn}
                >
                  <span aria-hidden>{isOn ? "✓" : ""}</span>
                  {RETAILER_LABEL[r]}
                </button>
              );
            })}
          </div>

          {enabled.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">
              No retailers selected — search results will be empty until you pick at least one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
