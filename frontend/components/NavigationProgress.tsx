'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function Progress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  // Start bar when any internal link is clicked
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      // Skip external links, hash links, non-href anchors
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel')) return;
      // Skip if modified click (opens new tab etc.)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      clearTimers();
      setVisible(true);
      setWidth(8);

      // Crawl toward 85% — slows as it approaches (easing simulation)
      let current = 8;
      intervalRef.current = setInterval(() => {
        const increment = (85 - current) * 0.12;
        current = Math.min(current + Math.max(increment, 0.5), 84);
        setWidth(current);
      }, 150);
    };

    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, []);

  // Complete when route changes
  useEffect(() => {
    clearTimers();
    setWidth(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 350);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-pink-600 transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// Must be wrapped in Suspense because useSearchParams() needs it in App Router
export default function NavigationProgress() {
  return (
    <Suspense>
      <Progress />
    </Suspense>
  );
}
