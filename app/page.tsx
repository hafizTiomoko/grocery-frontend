"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { ComparisonGroupCard } from "@/components/ComparisonGroupCard";
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton";
import { BasketDrawer } from "@/components/BasketDrawer";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { RefreshButton } from "@/components/RefreshButton";
import { LiveScrapeBanner } from "@/components/LiveScrapeBanner";
import { Toast, type ToastTone } from "@/components/Toast";
import { searchGrouped, searchProducts, type ComparisonGroup } from "@/lib/api";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

type ToastState = { message: string; tone: ToastTone } | null;

const QUICK_CATEGORIES = [
  { label: "Milk", icon: "🥛", query: "milk" },
  { label: "Bread", icon: "🍞", query: "bread" },
  { label: "Eggs", icon: "🥚", query: "eggs" },
  { label: "Fruit", icon: "🍎", query: "fruit" },
  { label: "Chicken", icon: "🍗", query: "chicken" },
  { label: "Cheese", icon: "🧀", query: "cheese" },
  { label: "Rice", icon: "🍚", query: "rice" },
  { label: "Pasta", icon: "🍝", query: "pasta" },
];

function isBackendDown(error: string | null): boolean {
  if (!error) return false;
  return (
    error.includes("Failed to fetch") ||
    error.includes("NetworkError") ||
    error.includes("ERR_") ||
    error.includes("CORS") ||
    error.includes("API 5")
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 500);

  const [groups, setGroups] = useState<ComparisonGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [noCacheHint, setNoCacheHint] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();

    if (!trimmed) {
      setGroups([]);
      setError(null);
      setLoading(false);
      setHasSearched(false);
      setNoCacheHint(false);
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    searchGrouped(trimmed, { limit: 30 })
      .then((res) => {
        if (reqId !== requestIdRef.current) return;
        setGroups(res.groups);
        setHasSearched(true);
        setNoCacheHint(res.group_count === 0);
      })
      .catch((e: unknown) => {
        if (reqId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : "Search failed");
        setGroups([]);
        setHasSearched(true);
      })
      .finally(() => {
        if (reqId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [debouncedQuery]);

  const refreshLive = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || refreshing) return;

    const reqId = ++requestIdRef.current;
    setRefreshing(true);
    setError(null);

    try {
      await searchProducts(trimmed, { limit: 30, live: true });
      const res = await searchGrouped(trimmed, { limit: 30 });
      if (reqId !== requestIdRef.current) return;
      setGroups(res.groups);
      setHasSearched(true);
      setToast({ message: "Prices updated successfully", tone: "success" });
    } catch (e) {
      if (reqId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : "Refresh failed");
      setToast({ message: "Live refresh failed", tone: "error" });
    } finally {
      if (reqId === requestIdRef.current) setRefreshing(false);
    }
  }, [query, refreshing]);

  const showEmptyState = !query.trim() && !loading && !refreshing;
  const showNoResults =
    hasSearched && !loading && !refreshing && !error && groups.length === 0 && !!query.trim();
  const backendDown = isBackendDown(error);

  return (
    <div className="min-h-screen pb-64">
      <Header value={query} onChange={setQuery} loading={loading} onScanClick={() => setScannerOpen(true)} />

      <main className="mx-auto max-w-2xl px-4 py-4">
        {/* ── Maintenance banner ── */}
        {backendDown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center"
          >
            <div className="text-3xl">🔧</div>
            <h2 className="mt-2 text-base font-semibold text-amber-900">
              We're doing some maintenance
            </h2>
            <p className="mt-1 text-sm text-amber-700">
              Our price engine is temporarily offline. Please try again in a few minutes.
            </p>
            <button
              onClick={() => {
                setError(null);
                setQuery((q) => q + " ");
                setTimeout(() => setQuery((q) => q.trim()), 10);
              }}
              className="mt-3 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* ── Empty state: Start your shop ── */}
        {showEmptyState && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="rounded-2xl bg-white p-6 text-center shadow-card">
              <div className="text-4xl">🛒</div>
              <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                Start your shop
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Compare prices across Tesco, Asda & Sainsbury's — find the cheapest basket.
              </p>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Popular categories
              </p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.query}
                    onClick={() => setQuery(cat.query)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-card transition hover:shadow-md active:scale-95"
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium text-slate-700">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Results header ── */}
        {(hasSearched || loading || refreshing) && !backendDown && (
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {query ? `Results for "${query}"` : "Results"}
              {!loading && groups.length > 0 && (
                <span className="ml-1 text-slate-400">· {groups.length} group{groups.length !== 1 ? "s" : ""}</span>
              )}
            </p>
            <RefreshButton
              onClick={refreshLive}
              refreshing={refreshing}
              disabled={!query.trim() || loading}
            />
          </div>
        )}

        {refreshing && (
          <div className="mb-3">
            <LiveScrapeBanner />
          </div>
        )}

        {/* ── Non-backend errors ── */}
        {error && !backendDown && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* ── Skeleton loading ── */}
        {loading && !refreshing && (
          <ul className="mt-2 space-y-3" aria-busy="true" aria-label="Loading results">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        )}

        {/* ── No results ── */}
        {showNoResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-10 text-center"
          >
            <div className="text-3xl">🔎</div>
            <p className="mt-2 text-sm font-medium text-slate-700">No products found</p>
            {noCacheHint ? (
              <div className="mt-3">
                <p className="text-xs text-slate-500">
                  This item isn't in our cache yet.
                </p>
                <button
                  onClick={refreshLive}
                  disabled={refreshing}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  Fetch live prices
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Try a different search term.</p>
            )}
          </motion.div>
        )}

        {/* ── Grouped results with staggered fade-in ── */}
        {!loading && groups.length > 0 && (
          <ul className="mt-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {groups.map((g, i) => (
                <motion.li
                  key={`${g.display_name}-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                >
                  <ComparisonGroupCard group={g} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>

      <BasketDrawer />

      {scannerOpen && (
        <BarcodeScanner onClose={() => setScannerOpen(false)} />
      )}

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
