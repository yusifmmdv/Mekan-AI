"use client";
import { useEffect } from "react";
export function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => {});
  }, [productId]);
  return null;
}
