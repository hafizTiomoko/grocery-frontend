import { create } from "zustand";
import { optimizeBasket, type BasketOptimizeResponse, type Product } from "@/lib/api";

interface BasketState {
  items: Product[];
  comparison: BasketOptimizeResponse | null;
  loadingComparison: boolean;
  error: string | null;

  add: (product: Product) => void;
  remove: (id: number) => void;
  clear: () => void;
  refreshComparison: () => Promise<void>;
}

export const useBasket = create<BasketState>((set, get) => ({
  items: [],
  comparison: null,
  loadingComparison: false,
  error: null,

  add: (product) => {
    if (get().items.some((p) => p.id === product.id)) return;
    set({ items: [...get().items, product] });
    void get().refreshComparison();
  },

  remove: (id) => {
    set({ items: get().items.filter((p) => p.id !== id) });
    void get().refreshComparison();
  },

  clear: () => set({ items: [], comparison: null }),

  refreshComparison: async () => {
    const ids = get().items.map((p) => p.id);
    if (ids.length === 0) {
      set({ comparison: null, error: null });
      return;
    }
    set({ loadingComparison: true, error: null });
    try {
      const comparison = await optimizeBasket(ids);
      set({ comparison, loadingComparison: false });
    } catch (e) {
      set({
        loadingComparison: false,
        error: e instanceof Error ? e.message : "Failed to optimize basket",
      });
    }
  },
}));
