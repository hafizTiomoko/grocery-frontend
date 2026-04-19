"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useBasket } from "@/store/useBasket";
import { CheckoutModal } from "./CheckoutModal";
import type { BasketBreakdown, Retailer } from "@/lib/api";

const RETAILER_NAMES: Record<Retailer, string> = {
  tesco: "Tesco",
  asda: "Asda",
  sainsburys: "Sainsbury's",
};

function optimizerMessage(
  items: { id: number; retailer: Retailer }[],
  breakdown: BasketBreakdown[] | undefined,
  cheapest: Retailer | null | undefined,
): string | null {
  if (!breakdown || !cheapest) return null;

  const cheapestBreakdown = breakdown.find((b) => b.retailer === cheapest);
  if (!cheapestBreakdown) return null;

  // Count how many basket items aren't already at the cheapest retailer
  const switchable = items.filter((i) => i.retailer !== cheapest).length;
  if (switchable === 0) return null;

  // Savings vs the most expensive retailer with any items
  const expensive = breakdown
    .filter((b) => b.item_count > 0)
    .sort((a, b) => b.total - a.total)[0];
  if (!expensive || expensive.retailer === cheapest) return null;

  const saving = expensive.total - cheapestBreakdown.total;
  if (saving <= 0) return null;

  return `Switch ${switchable} item${switchable === 1 ? "" : "s"} to ${RETAILER_NAMES[cheapest]} to save £${saving.toFixed(2)}`;
}

export function BasketDrawer() {
  const items = useBasket((s) => s.items);
  const comparison = useBasket((s) => s.comparison);
  const loading = useBasket((s) => s.loadingComparison);
  const clear = useBasket((s) => s.clear);
  const [expanded, setExpanded] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const message = useMemo(
    () => optimizerMessage(items, comparison?.breakdown, comparison?.cheapest_retailer),
    [items, comparison],
  );

  const totals: Record<Retailer, number> = { tesco: 0, asda: 0, sainsburys: 0 };
  comparison?.breakdown.forEach((b) => {
    totals[b.retailer] = b.total;
  });

  const cheapest = comparison?.cheapest_retailer ?? null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto max-w-2xl rounded-t-3xl bg-white shadow-drawer">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-5 pt-3 pb-2"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            <span className="h-1 w-10 rounded-full bg-slate-200" />
          </div>
        </button>

        <div className="px-5 pb-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Basket · {items.length} item{items.length === 1 ? "" : "s"}
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                {loading ? "Updating totals…" : items.length === 0 ? "Add items to compare retailers." : "Live totals"}
              </p>
            </div>
            {items.length > 0 && (
              <button onClick={clear} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["tesco", "asda", "sainsburys"] as Retailer[]).map((r) => {
              const isCheapest = cheapest === r && items.length > 0;
              return (
                <div
                  key={r}
                  className={`rounded-xl border p-3 text-center transition ${
                    isCheapest
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-medium text-slate-600">{RETAILER_NAMES[r]}</div>
                  <div className={`mt-1 text-base font-bold tracking-tight ${isCheapest ? "text-emerald-700" : "text-slate-900"}`}>
                    £{totals[r].toFixed(2)}
                  </div>
                  {isCheapest && (
                    <div className="mt-0.5 text-[10px] font-semibold uppercase text-emerald-600">Cheapest</div>
                  )}
                </div>
              );
            })}
          </div>

          {message && (
            <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              💡 {message}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Link
              href="/comparison"
              aria-disabled={items.length === 0}
              className={`flex-1 rounded-full border py-3 text-center text-sm font-semibold transition ${
                items.length === 0
                  ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                  : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              View details
            </Link>
            <button
              disabled={items.length === 0}
              onClick={() => setCheckoutOpen(true)}
              className="flex-1 rounded-full bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Checkout for Delivery
            </button>
          </div>
        </div>

        {expanded && items.length > 0 && (
          <div className="max-h-64 overflow-y-auto border-t border-slate-100 px-5 py-3">
            <ul className="space-y-2">
              {items.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-3 text-slate-700">{p.name}</span>
                  <span className="font-medium">£{p.effective_price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </div>
  );
}
