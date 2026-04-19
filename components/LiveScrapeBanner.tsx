"use client";
import { useEffect, useState } from "react";

/**
 * Shown while a live scrape is running (~20–30s). Progress is a time-based
 * estimate that eases toward ~95% and never completes on its own — the parent
 * unmounts this component when the real response lands.
 */
export function LiveScrapeBanner({ estimatedMs = 25000 }: { estimatedMs?: number }) {
  const [progress, setProgress] = useState(3);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, 3 + (elapsed / estimatedMs) * 92);
      setProgress(pct);
    }, 200);
    return () => clearInterval(id);
  }, [estimatedMs]);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex items-center gap-2">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-700"
          aria-hidden
        />
        <p className="text-sm font-medium text-emerald-800">Scraping live data…</p>
      </div>
      <p className="mt-1 text-xs text-emerald-700/80">
        Fetching the latest prices from Tesco, Sainsbury's and Asda. This can take 20–30 seconds.
      </p>
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
