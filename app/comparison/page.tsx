"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useBasket } from "@/store/useBasket";
import { searchProducts, type Product, type Retailer } from "@/lib/api";

const RETAILERS: Retailer[] = ["tesco", "asda", "sainsburys"];
const RETAILER_LABEL: Record<Retailer, string> = {
  tesco: "Tesco",
  asda: "Asda",
  sainsburys: "Sainsbury's",
};

type Row = {
  basketItem: Product;
  matches: Partial<Record<Retailer, Product>>;
  smartSwitch?: { candidate: Product; savings: number; percent: number };
};

const SWITCH_THRESHOLD = 0.2; // 20% cheaper

function findSmartSwitch(
  target: Product,
  candidates: Product[],
): Row["smartSwitch"] {
  const targetPrice = target.effective_price;
  if (!targetPrice) return undefined;
  const cheaper = candidates
    .filter((c) => c.id !== target.id && c.effective_price > 0)
    .filter((c) => (targetPrice - c.effective_price) / targetPrice >= SWITCH_THRESHOLD)
    .sort((a, b) => a.effective_price - b.effective_price);
  const best = cheaper[0];
  if (!best) return undefined;
  const savings = targetPrice - best.effective_price;
  return { candidate: best, savings, percent: (savings / targetPrice) * 100 };
}

function pickMatch(candidates: Product[], retailer: Retailer, target: Product): Product | undefined {
  const sameRetailer = candidates.filter((c) => c.retailer === retailer);
  if (sameRetailer.length === 0) return undefined;
  if (target.gtin) {
    const byGtin = sameRetailer.find((c) => c.gtin && c.gtin === target.gtin);
    if (byGtin) return byGtin;
  }
  return sameRetailer[0];
}

export default function ComparisonPage() {
  const items = useBasket((s) => s.items);
  const clear = useBasket((s) => s.clear);
  const add = useBasket((s) => s.add);
  const remove = useBasket((s) => s.remove);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      items.map(async (item): Promise<Row> => {
        try {
          const res = await searchProducts(item.name, { limit: 10 });
          const matches: Partial<Record<Retailer, Product>> = {};
          for (const r of RETAILERS) {
            const m = pickMatch(res.results, r, item);
            if (m) matches[r] = m;
          }
          // Always keep the user's own pick for its retailer.
          matches[item.retailer] = item;
          const smartSwitch = findSmartSwitch(item, res.results);
          return { basketItem: item, matches, smartSwitch };
        } catch {
          return { basketItem: item, matches: { [item.retailer]: item } };
        }
      }),
    ).then((r) => {
      if (!cancelled) {
        setRows(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const totals: Record<Retailer, { total: number; complete: boolean }> = {
    tesco: { total: 0, complete: true },
    asda: { total: 0, complete: true },
    sainsburys: { total: 0, complete: true },
  };
  for (const row of rows) {
    for (const r of RETAILERS) {
      const m = row.matches[r];
      if (m) totals[r].total += m.effective_price;
      else totals[r].complete = false;
    }
  }

  const ranked = RETAILERS
    .filter((r) => totals[r].complete && rows.length > 0)
    .sort((a, b) => totals[a].total - totals[b].total);
  const winner = ranked[0];
  const savings =
    winner && ranked.length > 1 ? totals[ranked[ranked.length - 1]].total - totals[winner].total : 0;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm font-medium text-emerald-700 hover:underline">
            ← Back to search
          </Link>
          <span className="ml-auto text-xs text-slate-500">{items.length} item{items.length === 1 ? "" : "s"}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <section
          className={`rounded-2xl p-5 shadow-card ${
            winner ? "bg-emerald-500 text-white" : "bg-white"
          }`}
        >
          {items.length === 0 ? (
            <div>
              <h1 className="text-lg font-semibold">Your basket is empty</h1>
              <p className="mt-1 text-sm text-slate-500">
                Add items from the search page to see a side-by-side comparison.
              </p>
            </div>
          ) : loading && !winner ? (
            <h1 className="text-lg font-semibold text-slate-700">Comparing retailers…</h1>
          ) : winner ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
                Best basket
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Total Savings: £{savings.toFixed(2)} by shopping at {RETAILER_LABEL[winner].toUpperCase()}
              </h1>
              <p className="mt-1 text-sm text-emerald-50">
                {RETAILER_LABEL[winner]} total: £{totals[winner].total.toFixed(2)}
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Partial comparison</h1>
              <p className="mt-1 text-sm text-slate-500">
                Not every retailer has every item. Totals shown below cover the items they stock.
              </p>
            </div>
          )}
        </section>

        {rows.some((r) => r.smartSwitch) && (
          <section className="mt-4 space-y-2">
            {rows
              .filter((r): r is Row & { smartSwitch: NonNullable<Row["smartSwitch"]> } => !!r.smartSwitch)
              .map((row) => {
                const { candidate, savings } = row.smartSwitch;
                const retailerLabel = RETAILER_LABEL[candidate.retailer];
                return (
                  <div
                    key={`tip-${row.basketItem.id}`}
                    className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900"
                  >
                    <span aria-hidden className="text-lg leading-none">💡</span>
                    <div className="flex-1">
                      <p>
                        <span className="font-semibold">Smart Switch:</span> You can save an extra{" "}
                        <span className="font-semibold">£{savings.toFixed(2)}</span> by switching{" "}
                        <span className="font-medium">“{row.basketItem.name}”</span> to{" "}
                        <span className="font-medium">
                          “{candidate.name}”
                        </span>{" "}
                        <span className="text-sky-700">({retailerLabel})</span>.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        remove(row.basketItem.id);
                        add(candidate);
                      }}
                      className="shrink-0 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
                    >
                      Switch
                    </button>
                  </div>
                );
              })}
          </section>
        )}

        {items.length > 0 && (
          <section className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-card">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Product</th>
                  {RETAILERS.map((r) => (
                    <th key={r} className="px-4 py-3 font-medium">{RETAILER_LABEL[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const prices = RETAILERS.map((r) => row.matches[r]?.effective_price ?? null);
                  const validPrices = prices.filter((p): p is number => p !== null);
                  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
                  return (
                    <tr key={row.basketItem.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900 line-clamp-2">
                          {row.basketItem.name}
                        </div>
                        {row.basketItem.unit_price && (
                          <div className="mt-0.5 text-xs text-slate-400">
                            {row.basketItem.unit_price}
                          </div>
                        )}
                      </td>
                      {RETAILERS.map((r, i) => {
                        const match = row.matches[r];
                        const price = prices[i];
                        const isCheapest = price !== null && minPrice !== null && price === minPrice;
                        return (
                          <td key={r} className="px-4 py-3 align-top">
                            {match && price !== null ? (
                              <div
                                className={
                                  isCheapest
                                    ? "font-bold text-emerald-600"
                                    : "text-slate-700"
                                }
                              >
                                £{price.toFixed(2)}
                                {match.has_member_price && (
                                  <span className="ml-1 text-[10px]" title={match._member_scheme_label ?? "Member price"}>
                                    {r === "tesco" ? "🎫" : r === "sainsburys" ? "🌟" : "💚"}
                                  </span>
                                )}
                              </div>
                            ) : loading ? (
                              <span className="text-slate-300">…</span>
                            ) : (
                              <span className="text-slate-300">— Not found</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 text-sm">
                  <td className="px-4 py-3 font-semibold text-slate-700">Basket total</td>
                  {RETAILERS.map((r) => {
                    const t = totals[r];
                    const isWinner = winner === r;
                    return (
                      <td
                        key={r}
                        className={`px-4 py-3 font-semibold ${
                          isWinner ? "text-emerald-600" : "text-slate-700"
                        }`}
                      >
                        £{t.total.toFixed(2)}
                        {!t.complete && (
                          <span className="ml-1 text-[10px] font-normal text-slate-400">partial</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </section>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Back to Search
          </Link>
          <button
            onClick={clear}
            disabled={items.length === 0}
            className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Basket
          </button>
        </div>
      </main>
    </div>
  );
}
