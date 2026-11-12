"use client";

import { useEffect } from "react";

export function PwaRuntime() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation remains available when offline support is unavailable.
      });
    }
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const editing = document.activeElement?.matches("input, textarea, select, [contenteditable=true]");
        const keyboard = Boolean(editing && viewport && window.innerHeight - viewport.height > 120 && viewport.scale === 1);
        root.classList.toggle("keyboardOpen", keyboard);
        if (keyboard && viewport) {
          root.style.setProperty("--app-viewport-height", `${viewport.height}px`);
          document.activeElement?.scrollIntoView({ block: "nearest" });
        } else {
          root.style.removeProperty("--app-viewport-height");
        }
      });
    };
    viewport?.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      root.classList.remove("keyboardOpen");
      root.style.removeProperty("--app-viewport-height");
    };
  }, []);
  return null;
}
