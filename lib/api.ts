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
  hint?: "no_cache" | null;
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
  process.env.NEXT_PUBLIC_API_BASE ?? "https://grocery-backend-i6yt.onrender.com";

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

export interface OrderPayload {
  items: { id: number; name: string; price: number }[];
  retailer: Retailer;
  total: number;
  address: string;
  delivery_time: string;
  phone: string;
}

export interface OrderResponse {
  order_id: string;
  status: string;
}

export async function submitOrder(payload: OrderPayload): Promise<OrderResponse> {
  const url = new URL("/order", API_BASE);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<OrderResponse>;
}
