"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

const NavigationContext = createContext<() => void>(() => {});

export function useNavigationStart() {
  return useContext(NavigationContext);
}

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navigating, setNavigating] = useState(false);
  const pathname = usePathname();
  const startNavigation = useCallback(() => setNavigating(true), []);

  useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  return (
    <NavigationContext.Provider value={startNavigation}>
      {navigating && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] h-1 overflow-hidden md:left-64"
          role="progressbar"
          aria-label="Loading page"
        >
          <div className="h-full w-full bg-primary/15">
            <div className="h-full w-1/2 animate-pulse bg-primary" />
          </div>
        </div>
      )}
      {children}
    </NavigationContext.Provider>
  );
}
