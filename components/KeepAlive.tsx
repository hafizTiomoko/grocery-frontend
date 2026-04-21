"use client";
import { useEffect } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://grocery-backend-i6yt.onrender.com";
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function KeepAlive() {
  useEffect(() => {
    function ping() {
      fetch(`${API_BASE}/health`).catch(() => {});
    }
    ping(); // immediate first ping on mount
    const id = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
