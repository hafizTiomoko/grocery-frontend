import type { Retailer } from "@/lib/api";

const RETAILER_META: Record<Retailer, { label: string; bg: string; fg: string }> = {
  tesco: { label: "Tesco", bg: "bg-blue-50", fg: "text-blue-700" },
  sainsburys: { label: "Sainsbury's", bg: "bg-orange-50", fg: "text-orange-700" },
  asda: { label: "Asda", bg: "bg-green-50", fg: "text-green-700" },
};

export function RetailerBadge({ retailer }: { retailer: Retailer }) {
  const meta = RETAILER_META[retailer] ?? { label: retailer, bg: "bg-slate-100", fg: "text-slate-700" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.fg}`}>
      {meta.label}
    </span>
  );
}
