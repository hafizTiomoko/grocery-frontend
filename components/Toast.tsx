"use client";
import { useEffect } from "react";

export type ToastTone = "success" | "error" | "info";

export function Toast({
  message,
  tone = "success",
  onDismiss,
  durationMs = 3500,
}: {
  message: string;
  tone?: ToastTone;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [onDismiss, durationMs]);

  const styles: Record<ToastTone, string> = {
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-slate-900 text-white",
  };
  const icon: Record<ToastTone, string> = { success: "✅", error: "⚠️", info: "ℹ️" };

  return (
    <div
      role="status"
      className="pointer-events-auto fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg animate-[fadeIn_0.2s_ease-out]"
    >
      <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${styles[tone]}`}>
        <span aria-hidden>{icon[tone]}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
