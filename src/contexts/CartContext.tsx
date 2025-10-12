"use client";

import React, { createContext, useContext, useReducer, useEffect } from "react";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  quantity: number;
  weight: number;
  maxQuantity: number;
  optionDetails?: Array<{
    groupId: string;
    groupName: string;
    selectionType: string;
    selectedOptions: Array<{
      id: string;
      name: string;
      priceType: string;
      priceValue?: number;
    }>;
  }>;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  deliveryPrice: number;
  total: number;
}

type CartAction =
  | {
      type: "ADD_ITEM";
      payload: Omit<CartItem, "quantity"> & { quantity?: number };
    }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] };

const CartContext = createContext<{
  state: CartState;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
} | null>(null);

const STORAGE_KEY = "shoppink_cart";

function calculateTotals(
  items: CartItem[]
): Pick<CartState, "totalItems" | "subtotal" | "deliveryPrice" | "total"> {
  const totalItems = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price || 0);
    const quantity = Number(item.quantity || 0);
    return sum + price * quantity;
  }, 0);

  // Calculate delivery price based on location (this will be updated during checkout)
  // For now, use a default calculation
  const deliveryPrice = subtotal > 0 ? 2.5 : 0; // Default delivery price

  const total = subtotal + deliveryPrice;

  return {
    totalItems,
    subtotal,
    deliveryPrice,
    total,
  };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      // For products with options, use the unique ID to create separate cart items
      // Only combine items if they have identical IDs (same product + same options)
      const existingItemIndex = state.items.findIndex(
        (item) => item.id === action.payload.id
      );

      let newItems: CartItem[];

      if (existingItemIndex >= 0) {
        // Update existing item quantity - only for identical items (same options)
        const existingItem = state.items[existingItemIndex];
        const newQuantity =
          Number(existingItem.quantity || 0) +
          Number(action.payload.quantity || 1);

        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Add new item - different option combinations get separate entries
        const newItem: CartItem = {
          ...action.payload,
          price: Number(action.payload.price || 0),
          originalPrice: action.payload.originalPrice
            ? Number(action.payload.originalPrice)
            : undefined,
          weight: Number(action.payload.weight || 0),
          maxQuantity: Number(action.payload.maxQuantity || 0),
          quantity: Number(action.payload.quantity || 1),
        };
        newItems = [...state.items, newItem];
      }

      const totals = calculateTotals(newItems);
      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case "REMOVE_ITEM": {
      const newItems = state.items.filter((item) => item.id !== action.payload);
      const totals = calculateTotals(newItems);
      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case "UPDATE_QUANTITY": {
      const newItems = state.items
        .map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                quantity: Math.max(Number(action.payload.quantity || 0), 0),
              }
            : item
        )
        .filter((item) => Number(item.quantity || 0) > 0);

      const totals = calculateTotals(newItems);
      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case "CLEAR_CART": {
      return {
        items: [],
        totalItems: 0,
        subtotal: 0,
        deliveryPrice: 0,
        total: 0,
      };
    }

    case "LOAD_CART": {
      // Ensure all numeric values are properly converted when loading from localStorage
      const normalizedItems = action.payload.map((item: any) => ({
        ...item,
        price: Number(item.price || 0),
        originalPrice: item.originalPrice
          ? Number(item.originalPrice)
          : undefined,
        weight: Number(item.weight || 0),
        quantity: Number(item.quantity || 0),
        maxQuantity: Number(item.maxQuantity || 0),
      }));

      const totals = calculateTotals(normalizedItems);
      return {
        ...state,
        items: normalizedItems,
        ...totals,
      };
    }

    default:
      return state;
  }
}

const initialState: CartState = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  deliveryPrice: 0,
  total: 0,
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      if (savedCart) {
        const items = JSON.parse(savedCart);
        dispatch({ type: "LOAD_CART", payload: items });
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [state.items]);

  const addItem = (
    item: Omit<CartItem, "quantity"> & { quantity?: number }
  ) => {
    dispatch({ type: "ADD_ITEM", payload: item });
  };

  const removeItem = (id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" });
  };

  const getItemQuantity = (productId: string) => {
    // Sum up quantities for all variants of the same product
    return state.items
      .filter((item) => item.productId === productId)
      .reduce((total, item) => total + Number(item.quantity || 0), 0);
  };

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
