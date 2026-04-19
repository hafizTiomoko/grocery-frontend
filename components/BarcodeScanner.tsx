"use client";
import { useEffect, useRef, useState } from "react";
import { searchProducts, type Product } from "@/lib/api";
import { useBasket } from "@/store/useBasket";

type ScanState =
  | { step: "scanning" }
  | { step: "searching"; code: string }
  | { step: "found"; code: string; product: Product }
  | { step: "not_found"; code: string }
  | { step: "error"; message: string };

export function BarcodeScanner({ onClose }: { onClose: () => void }) {
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [state, setState] = useState<ScanState>({ step: "scanning" });
  const add = useBasket((s) => s.add);
  const processedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!mounted || !readerRef.current) return;

      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (processedRef.current) return;
            processedRef.current = true;

            const code = decodedText.trim();
            setState({ step: "searching", code });

            try {
              await scanner.stop();
            } catch {}

            try {
              const res = await searchProducts(code, { limit: 5 });
              if (!mounted) return;

              const exact = res.results.find(
                (p) => p.gtin && p.gtin === code
              );

              if (exact) {
                setState({ step: "found", code, product: exact });
                add(exact);
              } else if (res.results.length > 0) {
                setState({ step: "found", code, product: res.results[0] });
                add(res.results[0]);
              } else {
                setState({ step: "not_found", code });
              }
            } catch {
              if (!mounted) return;
              setState({ step: "error", message: "Search failed. Try again." });
            }
          },
          () => {}
        );
      } catch (err: any) {
        if (!mounted) return;
        setState({
          step: "error",
          message: err?.message?.includes("NotAllowed")
            ? "Camera access denied. Please allow camera in your browser settings."
            : `Camera error: ${err?.message ?? "unknown"}`,
        });
      }
    }

    startScanner();

    return () => {
      mounted = false;
      scannerRef.current?.stop?.().catch(() => {});
      scannerRef.current?.clear?.();
    };
  }, [add]);

  function retry() {
    processedRef.current = false;
    setState({ step: "scanning" });
    const { Html5Qrcode } = require("html5-qrcode");
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 160 }, aspectRatio: 1.0 },
        async (decodedText: string) => {
          if (processedRef.current) return;
          processedRef.current = true;
          const code = decodedText.trim();
          setState({ step: "searching", code });
          try { await scanner.stop(); } catch {}
          try {
            const res = await searchProducts(code, { limit: 5 });
            const exact = res.results.find((p) => p.gtin && p.gtin === code);
            if (exact) { setState({ step: "found", code, product: exact }); add(exact); }
            else if (res.results.length > 0) { setState({ step: "found", code, product: res.results[0] }); add(res.results[0]); }
            else { setState({ step: "not_found", code }); }
          } catch { setState({ step: "error", message: "Search failed." }); }
        },
        () => {}
      )
      .catch(() => setState({ step: "error", message: "Could not restart camera." }));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Scan Barcode</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
          aria-label="Close scanner"
        >
          ✕
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div
          id="barcode-reader"
          ref={readerRef}
          className="w-full max-w-sm"
        />
        {state.step === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-72 rounded-2xl border-2 border-emerald-400/60" />
          </div>
        )}
      </div>

      <div className="px-5 pb-safe" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
        {state.step === "scanning" && (
          <p className="pb-4 text-center text-sm text-white/70">
            Point your camera at a barcode
          </p>
        )}

        {state.step === "searching" && (
          <div className="flex items-center justify-center gap-2 pb-4">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
            <p className="text-sm text-white/80">Looking up {state.code}…</p>
          </div>
        )}

        {state.step === "found" && (
          <div className="mb-4 rounded-2xl bg-emerald-500 p-4 text-white">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
              Added to basket
            </p>
            <p className="mt-1 text-base font-semibold">{state.product.name}</p>
            <p className="mt-0.5 text-sm text-emerald-100">
              £{state.product.effective_price.toFixed(2)} — {state.product.retailer}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={retry}
                className="flex-1 rounded-full border border-white/30 py-2 text-sm font-semibold text-white"
              >
                Scan another
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-full bg-white py-2 text-sm font-semibold text-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {state.step === "not_found" && (
          <div className="mb-4 rounded-2xl bg-white p-4">
            <p className="text-sm font-medium text-slate-700">
              No match for barcode <span className="font-mono text-xs">{state.code}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              This product isn't in our database yet.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={retry}
                className="flex-1 rounded-full border border-slate-200 py-2 text-sm font-semibold text-slate-700"
              >
                Scan again
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-full bg-slate-900 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {state.step === "error" && (
          <div className="mb-4 rounded-2xl bg-red-500/90 p-4 text-white">
            <p className="text-sm font-medium">{state.message}</p>
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-full bg-white py-2 text-sm font-semibold text-red-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
