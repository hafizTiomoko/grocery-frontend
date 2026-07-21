"use client";
import { useState } from "react";
import type { ComparisonGroup, Product, Retailer } from "@/lib/api";
import { useBasket } from "@/store/useBasket";
import { RetailerBadge } from "./RetailerBadge";

const VISIBLE_COUNT = 3;

function loyaltyIcon(retailer: Retailer) {
  if (retailer === "tesco") return "🎫";
  if (retailer === "sainsburys") return "🌟";
  if (retailer === "asda") return "💚";
  return "🎁";
}

function QuantityControl({ productId }: { productId: number }) {
  const item = useBasket((s) => s.items.find((p) => p.id === productId));
  const setQuantity = useBasket((s) => s.setQuantity);

  if (!item) return null;

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => setQuantity(productId, item.quantity - 1)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-semibold text-slate-900">
        {item.quantity}
      </span>
      <button
        onClick={() => setQuantity(productId, item.quantity + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 transition hover:bg-emerald-200"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

function RetailerRow({ product, isCheapest }: { product: Product; isCheapest: boolean }) {
  const inBasket = useBasket((s) => s.items.some((p) => p.id === product.id));
  const add = useBasket((s) => s.add);

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${
        isCheapest ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-white"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isCheapest && (
          <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Best
          </span>
        )}
        <RetailerBadge retailer={product.retailer} />
        {product.has_member_price && (
          <span className="hidden shrink-0 items-center gap-0.5 text-[10px] font-medium text-emerald-700 sm:inline-flex">
            <span aria-hidden>{loyaltyIcon(product.retailer)}</span>
            {product._member_scheme_label ?? "Member"}
          </span>
        )}
        {product.unit_price && (
          <span className="hidden shrink-0 truncate text-[10px] text-slate-400 sm:inline">
            {product.unit_price}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <div
            className={`text-sm font-bold tracking-tight ${isCheapest ? "text-emerald-700" : "text-slate-900"}`}
          >
            £{product.effective_price.toFixed(2)}
          </div>
          {product.has_member_price && (
            <div className="text-[10px] text-slate-400 line-through">£{product.price.toFixed(2)}</div>
          )}
        </div>

        {inBasket ? (
          <QuantityControl productId={product.id} />
        ) : (
          <button
            onClick={() => add(product)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isCheapest
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}

export function ComparisonGroupCard({ group }: { group: ComparisonGroup }) {
  const [expanded, setExpanded] = useState(false);

  // Sorted, price-ascending list of whichever retailers actually have a
  // match for this group — not a fixed set of columns, so this scales to
  // any number of tracked retailers without ever showing empty "Not found"
  // placeholders for ones that simply aren't rendered.
  const sorted = Object.values(group.options)
    .filter((p): p is Product => !!p)
    .sort((a, b) => a.effective_price - b.effective_price);

  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_COUNT);
  const hiddenCount = sorted.length - visible.length;

  return (
    <article className="rounded-2xl bg-white p-4 shadow-card">
      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2" title={group.display_name}>
        {group.display_name}
      </h3>

      <div className="mt-3 space-y-1.5">
        {visible.map((product) => (
          <RetailerRow
            key={product.retailer}
            product={product}
            isCheapest={product.retailer === group.cheapest_retailer}
          />
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 w-full text-center text-xs font-medium text-emerald-700 hover:underline"
        >
          Show {hiddenCount} more retailer{hiddenCount === 1 ? "" : "s"} ▾
        </button>
      )}
      {expanded && sorted.length > VISIBLE_COUNT && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2 w-full text-center text-xs font-medium text-slate-400 hover:underline"
        >
          Show fewer ▴
        </button>
      )}
    </article>
  );
}
