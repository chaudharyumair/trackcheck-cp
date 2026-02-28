"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname + searchParams.toString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    cleanup();
    setVisible(true);
    setProgress(0);
    let current = 0;
    timerRef.current = setInterval(() => {
      current += Math.random() * 12 + 3;
      if (current >= 90) {
        current = 90;
        if (timerRef.current) clearInterval(timerRef.current);
      }
      setProgress(current);
    }, 80);
  }, [cleanup]);

  const completeProgress = useCallback(() => {
    cleanup();
    setProgress(100);
    completeTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  }, [cleanup]);

  useEffect(() => {
    const currentPath = pathname + searchParams.toString();
    if (prevPath.current !== currentPath) {
      startProgress();
      completeTimerRef.current = setTimeout(() => completeProgress(), 200);
      prevPath.current = currentPath;
    }
    return cleanup;
  }, [pathname, searchParams, startProgress, completeProgress, cleanup]);

  // Intercept link clicks for immediate feedback
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (
        link &&
        link.href &&
        link.href.startsWith(window.location.origin) &&
        !link.target &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const url = new URL(link.href);
        const currentPath = pathname + searchParams.toString();
        const newPath = url.pathname + url.search;
        if (newPath !== currentPath) {
          startProgress();
        }
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, searchParams, startProgress]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div
        className="h-full bg-primary shadow-[0_0_8px_rgba(24,189,99,0.4)] transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
