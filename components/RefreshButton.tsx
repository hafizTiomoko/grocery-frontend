"use client";

export function RefreshButton({
  onClick,
  disabled,
  refreshing,
}: {
  onClick: () => void;
  disabled?: boolean;
  refreshing?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || refreshing}
      title="Refresh prices (live scrape)"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 3v6h-6" />
      </svg>
      {refreshing ? "Refreshing…" : "Refresh prices"}
    </button>
  );
}
