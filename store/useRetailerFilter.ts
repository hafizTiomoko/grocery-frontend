import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RETAILER_LABEL, type Retailer } from "@/lib/api";

const ALL_RETAILERS = Object.keys(RETAILER_LABEL) as Retailer[];

interface RetailerFilterState {
  enabled: Retailer[];
  toggle: (r: Retailer) => void;
  isEnabled: (r: Retailer) => boolean;
  selectAll: () => void;
  clearAll: () => void;
}

export const useRetailerFilter = create<RetailerFilterState>()(
  persist(
    (set, get) => ({
      // Defaults to every known retailer so existing users see no behavior
      // change until they actively hide something.
      enabled: ALL_RETAILERS,

      toggle: (r) => {
        const current = get().enabled;
        set({
          enabled: current.includes(r)
            ? current.filter((x) => x !== r)
            : [...current, r],
        });
      },

      isEnabled: (r) => get().enabled.includes(r),

      selectAll: () => set({ enabled: ALL_RETAILERS }),
      clearAll: () => set({ enabled: [] }),
    }),
    { name: "onebasqet-retailer-filter" },
  ),
);
