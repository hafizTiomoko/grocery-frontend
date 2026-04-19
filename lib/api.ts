export type Retailer = "tesco" | "sainsburys" | "asda";

export interface Product {
  id: number;
  name: string;
  retailer: Retailer;
  price: number;
  member_price?: number | null;
  effective_price: number;
  has_member_price: boolean;
  _member_scheme_label?: string | null;
  unit_price?: string | null;
  gtin?: string | null;
  timestamp?: string | null;
  updated_ago?: string | null;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: Product[];
}

export interface BasketBreakdown {
  retailer: Retailer;
  total: number;
  member_savings: number;
  item_count: number;
  items: Product[];
}

export interface BasketOptimizeResponse {
  requested_ids: number[];
  cheapest_retailer: Retailer | null;
  cheapest_total: number | null;
  breakdown: BasketBreakdown[];
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

async function getJson<T>(path: string, params?: Record<string, string | number | boolean | (string | number)[]>): Promise<T> {
  const url = new URL(path, API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, String(v)));
      else if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function searchProducts(query: string, opts?: { limit?: number; live?: boolean }) {
  return getJson<SearchResponse>("/search", {
    query,
    limit: opts?.limit ?? 20,
    live: opts?.live ?? false,
  });
}

export function optimizeBasket(ids: number[]) {
  return getJson<BasketOptimizeResponse>("/basket/optimize", { ids });
}
