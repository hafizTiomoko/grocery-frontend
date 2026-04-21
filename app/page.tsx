"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
      // Live scrape via the original endpoint, then re-fetch grouped
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

  return (
    <div className="min-h-screen pb-64">
      <Header value={query} onChange={setQuery} loading={loading} onScanClick={() => setScannerOpen(true)} />

      <main className="mx-auto max-w-2xl px-4 py-4">
        {showEmptyState && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-card">
            <div className="text-3xl">🛒</div>
            <h1 className="mt-2 text-lg font-semibold">Compare baskets across Tesco, Asda, Sainsbury's</h1>
            <p className="mt-1 text-sm text-slate-500">
              Search a product above to start building your basket.
            </p>
          </div>
        )}

        {(hasSearched || loading || refreshing) && (
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

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && !refreshing && (
          <ul className="mt-2 space-y-3" aria-busy="true" aria-label="Loading results">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        )}

        {showNoResults && (
          <div className="py-10 text-center">
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
          </div>
        )}

        {!loading && groups.length > 0 && (
          <ul className="mt-2 space-y-4">
            {groups.map((g, i) => (
              <li key={`${g.display_name}-${i}`}>
                <ComparisonGroupCard group={g} />
              </li>
            ))}
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
