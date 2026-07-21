"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useBasket } from "@/store/useBasket";
import { searchProducts, RETAILER_LABEL, type Product, type Retailer } from "@/lib/api";

// Stable display order for whichever retailers actually turn up in a given
// basket's search results — not a fixed 3, so this scales to however many
// retailers we track without hardcoding.
const RETAILER_ORDER: Retailer[] = ["tesco", "asda", "sainsburys", "morrisons", "waitrose", "ocado", "iceland"];

type UnitDimension = "weight" | "volume";
type UnitRate = { ratePerBase: number; dimension: UnitDimension };

type SmartSwitchOption = {
  candidate: Product;
  packs: number;
  totalCost: number;
  totalQuantity: number; // in base unit (kg for weight, litre for volume)
  dimension: UnitDimension;
  savings: number;
  percent: number;
};

type SmartSwitch = {
  // Either a single clean-multiple option, or a less/more pair when pack
  // counts don't divide evenly into the original quantity.
  exact?: SmartSwitchOption;
  less?: SmartSwitchOption;
  more?: SmartSwitchOption;
};

type Row = {
  basketItem: Product;
  matches: Partial<Record<Retailer, Product>>;
  smartSwitch?: SmartSwitch;
};

const SWITCH_THRESHOLD = 0.2; // 20% cheaper, applied to the unit rate (not sticker price)

function parseUnitPrice(unitPrice: string | null | undefined): UnitRate | null {
  if (!unitPrice) return null;
  const m = unitPrice.match(/^([\d.]+)\/(kg|g|100g|litre|ml|100ml)$/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  switch (m[2].toLowerCase()) {
    case "kg": return { ratePerBase: value, dimension: "weight" };
    case "g": return { ratePerBase: value * 1000, dimension: "weight" };
    case "100g": return { ratePerBase: value * 10, dimension: "weight" };
    case "litre": return { ratePerBase: value, dimension: "volume" };
    case "ml": return { ratePerBase: value * 1000, dimension: "volume" };
    case "100ml": return { ratePerBase: value * 10, dimension: "volume" };
    default: return null;
  }
}

function formatQuantity(valueInBaseUnit: number, dimension: UnitDimension): string {
  if (dimension === "weight") {
    return valueInBaseUnit < 1
      ? `${Math.round(valueInBaseUnit * 1000)}g`
      : `${parseFloat(valueInBaseUnit.toFixed(2))}kg`;
  }
  return valueInBaseUnit < 1
    ? `${Math.round(valueInBaseUnit * 1000)}ml`
    : `${parseFloat(valueInBaseUnit.toFixed(2))}L`;
}

/**
 * Pack-size-aware comparison between the basket item and one candidate.
 *
 * Sticker price alone is misleading when pack sizes differ (a 320g pack at
 * half the price of a 640g pack isn't a saving, it's the same unit price) —
 * so this compares unit rates first, then works out how many packs of the
 * candidate are actually needed to match or exceed the original quantity.
 * Returns null rather than guessing if either side has no parseable
 * unit_price, or they're not in the same dimension (weight vs volume).
 */
function evaluateSwitch(target: Product, candidate: Product): SmartSwitchOption[] | null {
  const targetPrice = target.effective_price;
  if (!targetPrice || candidate.effective_price <= 0) return null;

  const targetRate = parseUnitPrice(target.unit_price);
  const candidateRate = parseUnitPrice(candidate.unit_price);
  if (!targetRate || !candidateRate || targetRate.dimension !== candidateRate.dimension) {
    return null;
  }
  if (candidateRate.ratePerBase > targetRate.ratePerBase * (1 - SWITCH_THRESHOLD)) {
    return null; // not meaningfully cheaper per unit
  }

  const targetPackSize = target.price / targetRate.ratePerBase;
  const candidatePackSize = candidate.price / candidateRate.ratePerBase;
  if (!targetPackSize || !candidatePackSize) return null;

  const ratio = targetPackSize / candidatePackSize;
  const packsFloor = Math.max(1, Math.floor(ratio));
  const packsCeil = Math.max(1, Math.ceil(ratio));

  const makeOption = (packs: number): SmartSwitchOption | null => {
    const totalCost = candidate.effective_price * packs;
    const savings = targetPrice - totalCost;
    if (savings <= 0) return null;
    return {
      candidate,
      packs,
      totalCost,
      totalQuantity: candidatePackSize * packs,
      dimension: candidateRate.dimension,
      savings,
      percent: (savings / targetPrice) * 100,
    };
  };

  if (packsFloor === packsCeil) {
    const opt = makeOption(packsFloor);
    return opt ? [opt] : null;
  }
  const options = [makeOption(packsFloor), makeOption(packsCeil)].filter(
    (o): o is SmartSwitchOption => o !== null,
  );
  return options.length > 0 ? options : null;
}

function findSmartSwitch(target: Product, candidates: Product[]): SmartSwitch | undefined {
  const evaluated = candidates
    .filter((c) => c.id !== target.id && c.effective_price > 0)
    .map((c) => evaluateSwitch(target, c))
    .filter((o): o is SmartSwitchOption[] => o !== null);

  if (evaluated.length === 0) return undefined;

  // Pick the candidate with the best single-pack (or best-option) savings.
  evaluated.sort((a, b) => Math.max(...b.map((o) => o.savings)) - Math.max(...a.map((o) => o.savings)));
  const best = evaluated[0];

  if (best.length === 1) return { exact: best[0] };
  return { less: best[0], more: best[1] };
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
          const retailersFound = new Set<Retailer>(res.results.map((r) => r.retailer));
          for (const r of retailersFound) {
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

  // Only the retailers that actually turned up across this basket's search
  // results get a column — could be 1, could be all 7, no hardcoded set.
  const tableRetailers = RETAILER_ORDER.filter((r) => rows.some((row) => row.matches[r]));

  const totals: Partial<Record<Retailer, { total: number; complete: boolean }>> = {};
  for (const r of tableRetailers) {
    totals[r] = { total: 0, complete: true };
  }
  for (const row of rows) {
    for (const r of tableRetailers) {
      const m = row.matches[r];
      if (m) totals[r]!.total += m.effective_price;
      else totals[r]!.complete = false;
    }
  }

  const ranked = tableRetailers
    .filter((r) => totals[r]!.complete && rows.length > 0)
    .sort((a, b) => totals[a]!.total - totals[b]!.total);
  const winner = ranked[0];
  const savings =
    winner && ranked.length > 1
      ? totals[ranked[ranked.length - 1]]!.total - totals[winner]!.total
      : 0;

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
                {RETAILER_LABEL[winner]} total: £{totals[winner]!.total.toFixed(2)}
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
                const { exact, less, more } = row.smartSwitch;
                const options: Array<SmartSwitchOption & { note?: string }> = exact
                  ? [exact]
                  : [
                      ...(less ? [{ ...less, note: "closest under" }] : []),
                      ...(more ? [{ ...more, note: "closest over" }] : []),
                    ];
                if (options.length === 0) return null;
                const retailerLabel = RETAILER_LABEL[options[0].candidate.retailer];
                return (
                  <div
                    key={`tip-${row.basketItem.id}`}
                    className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900"
                  >
                    <div className="flex items-start gap-3">
                      <span aria-hidden className="text-lg leading-none">💡</span>
                      <p className="flex-1">
                        <span className="font-semibold">Smart Switch:</span> cheaper alternative for{" "}
                        <span className="font-medium">“{row.basketItem.name}”</span> at{" "}
                        <span className="text-sky-700">{retailerLabel}</span>
                        {options.length > 1 && " — pack sizes don't divide evenly, pick one:"}
                      </p>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {options.map((opt) => (
                        <div
                          key={opt.packs}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2"
                        >
                          <span>
                            {opt.packs > 1 ? `${opt.packs}× ` : ""}
                            <span className="font-medium">“{opt.candidate.name}”</span>{" "}
                            <span className="text-sky-700">
                              ({formatQuantity(opt.totalQuantity, opt.dimension)} total
                              {opt.note ? `, ${opt.note}` : ""})
                            </span>{" "}
                            — save <span className="font-semibold">£{opt.savings.toFixed(2)}</span>
                          </span>
                          <button
                            onClick={() => {
                              remove(row.basketItem.id);
                              for (let i = 0; i < opt.packs; i++) add(opt.candidate);
                            }}
                            className="shrink-0 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
                          >
                            Switch
                          </button>
                        </div>
                      ))}
                    </div>
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
                  {tableRetailers.map((r) => (
                    <th key={r} className="px-4 py-3 font-medium">{RETAILER_LABEL[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const prices = tableRetailers.map((r) => row.matches[r]?.effective_price ?? null);
                  const validPrices = prices.filter((p): p is number => p !== null);
                  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
                  return (
                    <tr key={row.basketItem.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900 line-clamp-2" title={row.basketItem.name}>
                          {row.basketItem.name}
                        </div>
                        {row.basketItem.unit_price && (
                          <div className="mt-0.5 text-xs text-slate-400">
                            {row.basketItem.unit_price}
                          </div>
                        )}
                      </td>
                      {tableRetailers.map((r, i) => {
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
                  {tableRetailers.map((r) => {
                    const t = totals[r]!;
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
