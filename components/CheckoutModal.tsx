"use client";
import { useState, type FormEvent } from "react";
import { useBasket } from "@/store/useBasket";
import { submitOrder, type Retailer } from "@/lib/api";
import { Toast, type ToastTone } from "./Toast";

const RETAILER_LABEL: Record<Retailer, string> = {
  tesco: "Tesco",
  asda: "Asda",
  sainsburys: "Sainsbury's",
};

const DELIVERY_TIMES = [
  { value: "today_morning", label: "Today — Morning (8am–12pm)" },
  { value: "today_evening", label: "Today — Evening (4pm–8pm)" },
  { value: "tomorrow_morning", label: "Tomorrow — Morning (8am–12pm)" },
  { value: "tomorrow_evening", label: "Tomorrow — Evening (4pm–8pm)" },
];

export function CheckoutModal({ onClose }: { onClose: () => void }) {
  const items = useBasket((s) => s.items);
  const comparison = useBasket((s) => s.comparison);
  const clear = useBasket((s) => s.clear);

  const [address, setAddress] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  const winner = comparison?.cheapest_retailer ?? null;
  const total = comparison?.cheapest_total ?? 0;

  const valid = address.trim().length > 5 && deliveryTime && phone.trim().length >= 10;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || !winner) return;

    setSubmitting(true);
    try {
      await submitOrder({
        items: items.map((p) => ({ id: p.id, name: p.name, price: p.effective_price })),
        retailer: winner,
        total,
        address: address.trim(),
        delivery_time: deliveryTime,
        phone: phone.trim(),
      });
      setToast({ message: "Order placed successfully!", tone: "success" });
      setTimeout(() => {
        clear();
        onClose();
      }, 1500);
    } catch {
      setToast({ message: "Failed to place order. Try again.", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-slate-900">Checkout</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {winner && (
          <div className="mx-5 mt-4 rounded-2xl bg-emerald-500 p-4 text-white">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
              Delivering from
            </p>
            <p className="mt-1 text-xl font-bold">{RETAILER_LABEL[winner]}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">£{total.toFixed(2)}</span>
              <span className="text-sm text-emerald-100">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700">
              Delivery address
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 High Street, London, SW1A 1AA"
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 resize-none"
            />
          </div>

          <div>
            <label htmlFor="delivery-time" className="block text-sm font-medium text-slate-700">
              Delivery time
            </label>
            <select
              id="delivery-time"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 appearance-none"
            >
              <option value="">Select a slot…</option>
              {DELIVERY_TIMES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
              Contact number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07700 900000"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <button
            type="submit"
            disabled={!valid || submitting || !winner}
            className="mt-2 w-full rounded-full bg-emerald-500 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {submitting ? "Placing order…" : `Confirm — £${total.toFixed(2)}`}
          </button>
        </form>
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}
