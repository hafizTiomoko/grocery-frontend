import { create } from "zustand";
import { optimizeBasket, type BasketOptimizeResponse, type Product } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export interface BasketItem extends Product {
  quantity: number;
}

interface BasketState {
  items: BasketItem[];
  comparison: BasketOptimizeResponse | null;
  loadingComparison: boolean;
  error: string | null;
  syncing: boolean;

  add: (product: Product) => void;
  remove: (id: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  clear: () => void;
  refreshComparison: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  setItems: (items: BasketItem[]) => void;
}

export const useBasket = create<BasketState>((set, get) => ({
  items: [],
  comparison: null,
  loadingComparison: false,
  error: null,
  syncing: false,

  setItems: (items) => {
    set({ items });
    void get().refreshComparison();
  },

  add: (product) => {
    const existing = get().items.find((p) => p.id === product.id);
    if (existing) {
      // Increment quantity if already in basket
      set({
        items: get().items.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        ),
      });
    } else {
      set({ items: [...get().items, { ...product, quantity: 1 }] });
    }
    void get().refreshComparison();
    void get().syncToCloud();
  },

  remove: (id) => {
    set({ items: get().items.filter((p) => p.id !== id) });
    void get().refreshComparison();
    void get().syncToCloud();
  },

  setQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().remove(id);
      return;
    }
    set({
      items: get().items.map((p) =>
        p.id === id ? { ...p, quantity } : p
      ),
    });
    void get().refreshComparison();
    void get().syncToCloud();
  },

  clear: () => {
    set({ items: [], comparison: null });
    void get().syncToCloud();
  },

  refreshComparison: async () => {
    const items = get().items;
    // Send each ID repeated by its quantity so the backend totals correctly
    const ids = items.flatMap((p) => Array(p.quantity).fill(p.id));
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

  syncToCloud: async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    set({ syncing: true });
    try {
      const basket_json = JSON.stringify(get().items);
      await supabase
        .from("user_profiles")
        .upsert(
          { id: session.user.id, basket_json, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
    } catch {
      // Silent fail — local state is still correct
    } finally {
      set({ syncing: false });
    }
  },

  loadFromCloud: async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("basket_json")
        .eq("id", session.user.id)
        .single();

      if (data?.basket_json) {
        const items: BasketItem[] = JSON.parse(data.basket_json);
        if (items.length > 0) {
          // Ensure quantity exists for legacy data
          set({ items: items.map((p) => ({ ...p, quantity: p.quantity || 1 })) });
          void get().refreshComparison();
        }
      }
    } catch {
      // No saved basket or parse error — keep current state
    }
  },
}));
