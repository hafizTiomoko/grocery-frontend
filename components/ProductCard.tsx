"use client";
import type { Product } from "@/lib/api";
import { useBasket } from "@/store/useBasket";
import { RetailerBadge } from "./RetailerBadge";

function loyaltyIcon(retailer: Product["retailer"]) {
  if (retailer === "tesco") return "🎫";
  if (retailer === "sainsburys") return "🌟";
  if (retailer === "asda") return "💚";
  return "🎁";
}

export function ProductCard({ product }: { product: Product }) {
  const inBasket = useBasket((s) => s.items.some((p) => p.id === product.id));
  const add = useBasket((s) => s.add);
  const remove = useBasket((s) => s.remove);

  return (
    <article className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <RetailerBadge retailer={product.retailer} />
          {product.has_member_price && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <span aria-hidden>{loyaltyIcon(product.retailer)}</span>
              {product._member_scheme_label ?? "Member price"}
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-medium text-slate-900">{product.name}</h3>
        {product.unit_price && (
          <p className="mt-0.5 text-xs text-slate-500">{product.unit_price}</p>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-slate-900">
            £{product.effective_price.toFixed(2)}
          </span>
          {product.has_member_price && (
            <span className="text-xs text-slate-400 line-through">£{product.price.toFixed(2)}</span>
          )}
        </div>
        {product.updated_ago && (
          <p className="mt-1.5 text-[11px] text-slate-400">{product.updated_ago}</p>
        )}
      </div>
      <button
        onClick={() => (inBasket ? remove(product.id) : add(product))}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
          inBasket
            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
            : "bg-emerald-500 text-white hover:bg-emerald-600"
        }`}
      >
        {inBasket ? "Remove" : "Add"}
      </button>
    </article>
  );
}
