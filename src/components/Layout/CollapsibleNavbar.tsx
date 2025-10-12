"use client";

import React, { useState, useEffect, RefObject } from "react";
import { ChevronUp, ChevronDown, ShoppingCart } from "lucide-react";
import Link from "next/link";

// Helper style functions (simplified versions)
const getPrimaryStyle = (customization: any) => ({
  background: customization.primaryColor
    ? `linear-gradient(to right, ${customization.primaryColor}, ${customization.primaryColor})`
    : "linear-gradient(to right, #ec4899, #a855f7)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
});

const getButtonStyle = (customization: any) => ({
  backgroundColor: customization.primaryColor || "#ec4899",
});

const getTextStyle = (customization: any) => ({
  color: customization.textColor || "#6b7280",
  fontFamily: customization.fontFamily || "Inter",
});

interface Restaurant {
  name: string;
  logo?: string;
}

interface TableInfo {
  tableNumber?: string;
  seatNumber?: string;
}

interface RestaurantCustomization {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  cardBackgroundColor?: string;
  borderColor?: string;
  buttonTextColor?: string;
  headerIcon?: string;
  restaurantName?: string;
  headerFontSize?: string;
  headerSubtitle?: string;
  welcomeMessage?: string;
  fontFamily?: string;
  secondaryColor?: string;
}

interface CollapsibleNavbarProps {
  restaurantInfo: Restaurant;
  tableInfo?: TableInfo;
  customization?: RestaurantCustomization;
  onCartOpen?: () => void;
  containerRef: RefObject<HTMLDivElement>;
  children: React.ReactNode;
  cartState: {
    totalItems: number;
    total: number;
  };
  lang?: string;
}

const CollapsibleNavbar: React.FC<CollapsibleNavbarProps> = ({
  restaurantInfo,
  tableInfo,
  customization = {},
  onCartOpen,
  containerRef,
  children,
  cartState,
  lang = "en",
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [lastScrollY, setLastScrollY] = useState<number>(0);

  const totalItems = cartState.totalItems;

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef?.current) return;

      const currentScrollY = containerRef.current.scrollTop;

      // Simple logic: collapse when scrolling down past threshold, only uncollapse at top
      if (currentScrollY <= 10) {
        // At the very top - always show full navbar
        setIsCollapsed(false);
      } else if (currentScrollY > 100) {
        // Past threshold - collapse navbar
        setIsCollapsed(true);
      }

      setLastScrollY(currentScrollY);
    };

    const container = containerRef?.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [lastScrollY, containerRef]);

  return (
    <>
      <div
        className={`sticky top-0 z-50 backdrop-blur-xl border-b shadow-lg transition-all duration-500 ease-out`}
        style={{
          backgroundColor: customization.cardBackgroundColor
            ? `${customization.cardBackgroundColor}e6`
            : "#ffffffe6",
          borderColor: customization.borderColor || "#e2e8f0",
          minHeight: isCollapsed ? "60px" : "120px", // Fixed minimum heights
          height: "auto",
        }}
      >
        <div className={`px-4 transition-all duration-500 ease-out ${
          isCollapsed ? "py-2" : "py-4"
        }`}>
          {/* Always visible header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Restaurant Logo */}
              {restaurantInfo?.logo ? (
                <img
                  src={restaurantInfo.logo}
                  alt={restaurantInfo.name}
                  className={`${
                    isCollapsed ? "w-8 h-8" : "w-10 h-10"
                  } object-cover rounded-lg transition-all duration-500 ease-out`}
                />
              ) : customization.headerIcon ? (
                <span className="text-xl">{customization.headerIcon}</span>
              ) : null}

              <div>
                <div className="flex items-center gap-2">
                  <h1
                    className={`${
                      isCollapsed
                        ? "text-lg"
                        : customization.headerFontSize || "text-2xl"
                    } font-bold transition-all duration-500 ease-out`}
                    style={getPrimaryStyle(customization)}
                  >
                    {customization.restaurantName ||
                      restaurantInfo?.name ||
                      "Restaurant"}
                  </h1>
                  {tableInfo && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-500 ease-out ${
                        isCollapsed ? "text-xs" : "text-sm"
                      }`}
                      style={{
                        backgroundColor: customization.primaryColor
                          ? `${customization.primaryColor}20`
                          : "#6366f120",
                        color: customization.primaryColor || "#6366f1",
                        fontFamily: customization.fontFamily || "Inter",
                      }}
                    >
                      Table {tableInfo.tableNumber}
                      {tableInfo.seatNumber &&
                        ` • Seat ${tableInfo.seatNumber}`}
                    </span>
                  )}
                </div>
                <div
                  className={`overflow-hidden transition-all duration-500 ease-out ${
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-12 opacity-100"
                  }`}
                >
                  {customization.headerSubtitle && (
                    <p
                      className="text-sm font-medium transition-all duration-500 ease-out"
                      style={{
                        color: customization.secondaryColor || "#6b7280",
                        fontFamily: customization.fontFamily || "Inter",
                      }}
                    >
                      {customization.headerSubtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Cart Button - only show if there are items */}
              {totalItems > 0 && onCartOpen && (
                <button
                  onClick={onCartOpen}
                  className="relative p-2 rounded-full transition-all duration-200 hover:scale-105 text-white shadow-lg"
                  style={getButtonStyle(customization)}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                </button>
              )}

              {/* Cart Link - fallback when no onCartOpen */}
              {totalItems > 0 && !onCartOpen && (
                <Link
                  href={`/cart?lang=${lang}`}
                  className="relative p-2 rounded-full transition-all duration-200 hover:scale-105 text-white shadow-lg"
                  style={getButtonStyle(customization)}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                </Link>
              )}

              {/* Collapse/Expand Button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-full transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: `${
                    customization.primaryColor || "#ec4899"
                  }20`,
                  color: customization.primaryColor || "#ec4899",
                }}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Welcome message - only show when not collapsed */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-out ${
              isCollapsed || !customization.welcomeMessage ? "max-h-0 opacity-0" : "max-h-12 opacity-100"
            }`}
          >
            {customization.welcomeMessage && (
              <p
                className="text-sm mt-2 transition-all duration-500 ease-out"
                style={getTextStyle(customization)}
              >
                {customization.welcomeMessage}
              </p>
            )}
          </div>

          {/* Collapsible content - Search bar only */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-out ${
              isCollapsed ? "max-h-0 opacity-0 -translate-y-2" : "max-h-96 opacity-100 translate-y-0"
            }`}
          >
            <div className="pt-4 transition-all duration-500 ease-out">
              {/* Only render search bar part of children when collapsed */}
              {React.Children.toArray(children).filter(
                (child, index) => index === 0
              )}
            </div>
          </div>

          {/* Category tabs - Always visible */}
          <div className="pt-2">
            {/* Only render category tabs part of children */}
            {React.Children.toArray(children).filter(
              (child, index) => index === 1
            )}
          </div>
        </div>
      </div>

    </>
  );
};

export default CollapsibleNavbar;
