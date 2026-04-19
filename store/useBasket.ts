import { create } from "zustand";
import { optimizeBasket, type BasketOptimizeResponse, type Product } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface BasketState {
  items: Product[];
  comparison: BasketOptimizeResponse | null;
  loadingComparison: boolean;
  error: string | null;
  syncing: boolean;

  add: (product: Product) => void;
  remove: (id: number) => void;
  clear: () => void;
  refreshComparison: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  setItems: (items: Product[]) => void;
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
    if (get().items.some((p) => p.id === product.id)) return;
    set({ items: [...get().items, product] });
    void get().refreshComparison();
    void get().syncToCloud();
  },

  remove: (id) => {
    set({ items: get().items.filter((p) => p.id !== id) });
    void get().refreshComparison();
    void get().syncToCloud();
  },

  clear: () => {
    set({ items: [], comparison: null });
    void get().syncToCloud();
  },

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
        const items: Product[] = JSON.parse(data.basket_json);
        if (items.length > 0) {
          set({ items });
          void get().refreshComparison();
        }
      }
    } catch {
      // No saved basket or parse error — keep current state
    }
  },
}));
