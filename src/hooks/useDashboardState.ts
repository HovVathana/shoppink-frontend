import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

// Generic hook for persisting page state
export function usePageState<T>(pageKey: string, initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !isLoaded) {
      try {
        const savedState = localStorage.getItem(`page-state-${pageKey}`);
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          setState({ ...initialState, ...parsedState });
        }
      } catch (error) {
        console.warn("Failed to load page state:", error);
      }
      setIsLoaded(true);
    }
  }, [pageKey, initialState, isLoaded]);

  // Save state to localStorage whenever it changes
  const updateState = useCallback(
    (newState: Partial<T> | ((prev: T) => T)) => {
      setState((prevState) => {
        const updatedState =
          typeof newState === "function"
            ? newState(prevState)
            : { ...prevState, ...newState };

        // Save to localStorage
        try {
          localStorage.setItem(
            `page-state-${pageKey}`,
            JSON.stringify(updatedState)
          );
        } catch (error) {
          console.warn("Failed to save page state:", error);
        }

        return updatedState;
      });
    },
    [pageKey]
  );

  return { state, updateState, isLoaded };
}

export function useDashboardState() {
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);

  // Save current page to localStorage for state persistence
  useEffect(() => {
    if (pathname) {
      localStorage.setItem("dashboard-current-page", pathname);
    }
  }, [pathname]);

  // Restore saved page on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !isInitialized) {
      const savedPage = localStorage.getItem("dashboard-current-page");
      if (savedPage && savedPage !== window.location.pathname) {
        // Only redirect if we're on the base dashboard page
        if (window.location.pathname === "/dashboard") {
          router.replace(savedPage);
        }
      }
      setIsInitialized(true);
    }
  }, [router, isInitialized]);

  return { isInitialized };
}
