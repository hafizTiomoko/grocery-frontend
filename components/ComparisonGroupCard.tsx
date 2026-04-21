"use client";
import type { ComparisonGroup, Product, Retailer } from "@/lib/api";
import { useBasket } from "@/store/useBasket";
import { RetailerBadge } from "./RetailerBadge";

const RETAILERS: Retailer[] = ["tesco", "asda", "sainsburys"];

const RETAILER_LABEL: Record<Retailer, string> = {
  tesco: "Tesco",
  asda: "Asda",
  sainsburys: "Sainsbury's",
};

function loyaltyIcon(retailer: Retailer) {
  if (retailer === "tesco") return "🎫";
  if (retailer === "sainsburys") return "🌟";
  return "💚";
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

function RetailerTile({
  product,
  retailer,
  isCheapest,
}: {
  product: Product | undefined;
  retailer: Retailer;
  isCheapest: boolean;
}) {
  const inBasket = useBasket((s) =>
    product ? s.items.some((p) => p.id === product.id) : false
  );
  const add = useBasket((s) => s.add);

  if (!product) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center">
        <span className="text-xs font-medium text-slate-400">{RETAILER_LABEL[retailer]}</span>
        <span className="mt-2 text-xs text-slate-300">Not found</span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center rounded-xl border p-3 text-center transition ${
        isCheapest
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-100 bg-white"
      }`}
    >
      {isCheapest && (
        <span className="absolute -top-2.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          Best value
        </span>
      )}

      <RetailerBadge retailer={retailer} />

      <div className="mt-2 flex items-baseline gap-1">
        <span
          className={`text-lg font-bold tracking-tight ${
            isCheapest ? "text-emerald-700" : "text-slate-900"
          }`}
        >
          £{product.effective_price.toFixed(2)}
        </span>
        {product.has_member_price && (
          <span className="text-xs text-slate-400 line-through">
            £{product.price.toFixed(2)}
          </span>
        )}
      </div>

      {product.has_member_price && (
        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
          <span aria-hidden>{loyaltyIcon(retailer)}</span>
          {product._member_scheme_label ?? "Member"}
        </span>
      )}

      {product.unit_price && (
        <span className="mt-0.5 text-[10px] text-slate-400">{product.unit_price}</span>
      )}

      {inBasket ? (
        <div className="mt-2 w-full">
          <QuantityControl productId={product.id} />
        </div>
      ) : (
        <button
          onClick={() => add(product)}
          className={`mt-2 w-full rounded-full py-1.5 text-xs font-semibold transition ${
            isCheapest
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          Add
        </button>
      )}
    </div>
  );
}

export function ComparisonGroupCard({ group }: { group: ComparisonGroup }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-card">
      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
        {group.display_name}
      </h3>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {RETAILERS.map((r) => (
          <RetailerTile
            key={r}
            retailer={r}
            product={group.options[r]}
            isCheapest={r === group.cheapest_retailer}
          />
        ))}
      </div>
    </article>
  );
}
