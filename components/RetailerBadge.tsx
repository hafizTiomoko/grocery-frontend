import type { Retailer } from "@/lib/api";

const RETAILER_META: Record<Retailer, { label: string; bg: string; fg: string }> = {
  tesco: { label: "Tesco", bg: "bg-blue-50", fg: "text-blue-700" },
  sainsburys: { label: "Sainsbury's", bg: "bg-orange-50", fg: "text-orange-700" },
  asda: { label: "Asda", bg: "bg-green-50", fg: "text-green-700" },
  morrisons: { label: "Morrisons", bg: "bg-amber-50", fg: "text-amber-700" },
  waitrose: { label: "Waitrose", bg: "bg-teal-50", fg: "text-teal-700" },
  ocado: { label: "Ocado", bg: "bg-pink-50", fg: "text-pink-700" },
  iceland: { label: "Iceland", bg: "bg-red-50", fg: "text-red-700" },
  aldi: { label: "Aldi", bg: "bg-sky-50", fg: "text-sky-700" },
  lidl: { label: "Lidl", bg: "bg-yellow-50", fg: "text-yellow-800" },
  tariqhalalmeats: { label: "Tariq Halal Meats", bg: "bg-lime-50", fg: "text-lime-700" },
  orientalmart: { label: "Oriental Mart", bg: "bg-fuchsia-50", fg: "text-fuchsia-700" },
};

export function RetailerBadge({ retailer }: { retailer: Retailer }) {
  const meta = RETAILER_META[retailer] ?? { label: retailer, bg: "bg-slate-100", fg: "text-slate-700" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.fg}`}>
      {meta.label}
    </span>
  );
}
