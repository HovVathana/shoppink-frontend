"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

interface PageState {
  currentPage: number;
  searchTerm: string;
  selectedState: string;
  selectedProvince: string;
  selectedDriver: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  dateFrom: string;
  dateTo: string;
  itemsPerPage: number;
}

interface PageStateContextType {
  ordersPageState: PageState;
  assignedPageState: PageState;
  customerOrdersPageState: PageState;
  driversPageState: PageState;
  updateOrdersPageState: (updates: Partial<PageState>) => void;
  updateAssignedPageState: (updates: Partial<PageState>) => void;
  updateCustomerOrdersPageState: (updates: Partial<PageState>) => void;
  updateDriversPageState: (updates: Partial<PageState>) => void;
}

const defaultPageState: PageState = {
  currentPage: 1,
  searchTerm: "",
  selectedState: "",
  selectedProvince: "",
  selectedDriver: "",
  sortField: "orderAt",
  sortDirection: "desc",
  dateFrom: new Date().toISOString().split("T")[0],
  dateTo: new Date().toISOString().split("T")[0],
  itemsPerPage: 20,
};

const PageStateContext = createContext<PageStateContextType | undefined>(
  undefined
);

export function PageStateProvider({ children }: { children: ReactNode }) {
  // Load initial state from localStorage
  const loadStateFromStorage = (key: string, defaultState: PageState) => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`page-state-${key}`);
        if (saved) {
          const parsedState = JSON.parse(saved);
          // Reset dates to current date on page refresh, but keep other filters
          return {
            ...defaultState,
            ...parsedState,
            dateFrom: new Date().toISOString().split("T")[0],
            dateTo: new Date().toISOString().split("T")[0],
          };
        }
      } catch (error) {
        console.warn("Failed to load page state:", error);
      }
    }
    return defaultState;
  };

  const [ordersPageState, setOrdersPageState] = useState<PageState>(() =>
    loadStateFromStorage("orders", {
      ...defaultPageState,
      sortField: "orderAt",
    })
  );

  const [assignedPageState, setAssignedPageState] = useState<PageState>(() =>
    loadStateFromStorage("assigned", {
      ...defaultPageState,
      sortField: "assignedAt",
    })
  );

  const [customerOrdersPageState, setCustomerOrdersPageState] =
    useState<PageState>(() =>
      loadStateFromStorage("customer-orders", {
        ...defaultPageState,
        sortField: "orderAt",
      })
    );

  const [driversPageState, setDriversPageState] = useState<PageState>(() =>
    loadStateFromStorage("drivers", {
      ...defaultPageState,
      sortField: "name",
    })
  );

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("page-state-orders", JSON.stringify(ordersPageState));
  }, [ordersPageState]);

  useEffect(() => {
    localStorage.setItem(
      "page-state-assigned",
      JSON.stringify(assignedPageState)
    );
  }, [assignedPageState]);

  useEffect(() => {
    localStorage.setItem(
      "page-state-customer-orders",
      JSON.stringify(customerOrdersPageState)
    );
  }, [customerOrdersPageState]);

  useEffect(() => {
    localStorage.setItem(
      "page-state-drivers",
      JSON.stringify(driversPageState)
    );
  }, [driversPageState]);

  const updateOrdersPageState = (updates: Partial<PageState>) => {
    setOrdersPageState((prev) => ({ ...prev, ...updates }));
  };

  const updateAssignedPageState = (updates: Partial<PageState>) => {
    setAssignedPageState((prev) => ({ ...prev, ...updates }));
  };

  const updateCustomerOrdersPageState = (updates: Partial<PageState>) => {
    setCustomerOrdersPageState((prev) => ({ ...prev, ...updates }));
  };

  const updateDriversPageState = (updates: Partial<PageState>) => {
    setDriversPageState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <PageStateContext.Provider
      value={{
        ordersPageState,
        assignedPageState,
        customerOrdersPageState,
        driversPageState,
        updateOrdersPageState,
        updateAssignedPageState,
        updateCustomerOrdersPageState,
        updateDriversPageState,
      }}
    >
      {children}
    </PageStateContext.Provider>
  );
}

export function usePageState() {
  const context = useContext(PageStateContext);
  if (context === undefined) {
    throw new Error("usePageState must be used within a PageStateProvider");
  }
  return context;
}
