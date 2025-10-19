"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Grid3X3,
  List,
  Grid2X2,
  ShoppingBag,
  ShoppingCart,
  Plus,
} from "lucide-react";
import { publicProductsAPI, publicCategoriesAPI } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import toast from "react-hot-toast";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProductPreviewModal from "@/components/Products/ProductPreviewModal";
import CollapsibleNavbar from "@/components/Layout/CollapsibleNavbar";

// Simple i18n strings for Khmer and English
const STRINGS = {
  km: {
    brandTagline: "ស្វែងរកផលិតផលអស្ចារ្យរបស់យើង",
    searchPlaceholder: "ស្វែងរកផលិតផល...",
    viewLabel: "មើល",
    searchResults: "លទ្ធផលស្វែងរក",
    noProductsFound: "មិនមានផលិតផលទេ",
    trySearching: "សូមសាកល្បងស្វែងរកដោយពាក្យគន្លឹះផ្សេងទៀត",
    inStock: "នៅក្នុងស្តុក",
    inCart: "នៅក្នុងរទេះ",
    addToCart: "បញ្ចូលទៅក្នុងរទេះ",
    addMore: "បន្ថែមទៀត",
    noProductsAvailable: "មិនមានផលិតផលឡើយ",
    checkBackLater: "សូមត្រលប់មកម្តងទៀត ដើម្បីមើលផលិតផលថ្មី!",
    save: "សន្សំ",
    off: "បញ្ចុះ",
    addedToCart: "បានបន្ថែមទៅក្នុងរទេះ!",
  },
  en: {
    brandTagline: "Discover our amazing products",
    searchPlaceholder: "Search products...",
    viewLabel: "View",
    searchResults: "Search Results",
    noProductsFound: "No products found",
    trySearching: "Try searching with different keywords",
    inStock: "in stock",
    inCart: "in cart",
    addToCart: "Add to Cart",
    addMore: "Add More",
    noProductsAvailable: "No products available",
    checkBackLater: "Check back later for new products!",
    save: "Save",
    off: "off",
    addedToCart: "added to cart!",
  },
} as const;

interface ProductOption {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceType: string;
  priceValue?: number;
  isDefault: boolean;
  isAvailable: boolean;
  stock: number;
  sortOrder: number;
}

interface ProductOptionGroup {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  selectionType: string;
  isRequired: boolean;
  sortOrder: number;
  options: ProductOption[];
}

interface ProductVariant {
  id: string;
  name: string;
  imageUrl?: string;
  stock: number;
  priceAdjustment: number;
  isActive: boolean;
  variantOptions: {
    id: string;
    optionId: string;
    option: {
      id: string;
      name: string;
    };
  }[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  weight: number;
  imageUrl: string;
  bannerText?: string;
  bannerColor?: string;
  bannerType?: string;
  originalPrice?: number;
  isOnSale?: boolean;
  hasOptions?: boolean;
  optionGroups?: ProductOptionGroup[];
  variants?: ProductVariant[];
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const ProductCard = ({
  product,
  layout,
  onAddToCart,
  onProductClick,
  currentQuantity = 0,
  labels,
}: {
  product: Product;
  layout: string;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
  currentQuantity?: number;
  labels: {
    inStock: string;
    inCart: string;
    addToCart: string;
    addMore: string;
  };
}) => {
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // console.log(product);

  const getBannerStyle = () => {
    if (!product.bannerText) return { className: "", shape: "" };

    const colorMap = {
      blue: "bg-blue-500 text-white",
      green: "bg-green-500 text-white",
      red: "bg-red-500 text-white",
      yellow: "bg-yellow-500 text-black",
      purple: "bg-purple-500 text-white",
      pink: "bg-pink-500 text-white",
      gray: "bg-gray-500 text-white",
    };

    const typeShapeMap = {
      // New simplified types
      circle: "rounded-full", // Circle
      square: "rounded-none", // Square
      rectangle: "rounded-lg", // Rectangle
      tilted: "rounded-lg rotate-12", // Tilted rectangle
      // Backward compatibility for old types
      sale: "rounded-full", // Circle (legacy)
      info: "rounded-full", // Circle (legacy)
      new: "rounded-none", // Square (legacy)
      error: "rounded-none", // Square (legacy)
      hot: "rounded-lg", // Rectangle (legacy)
      success: "rounded-lg", // Rectangle (legacy)
      discount: "rounded-lg rotate-12", // Tilted (legacy)
      warning: "rounded-lg rotate-12", // Tilted (legacy)
    };

    // Additional styling for better shape display
    const getAdditionalClasses = (type: string) => {
      switch (type) {
        // New simplified types
        case "circle":
        // Legacy circular types
        case "sale":
        case "info":
          return "min-w-[36px] min-h-[36px] flex items-center justify-center px-1"; // Force square dimensions for circles with small padding
        // New simplified types
        case "square":
        // Legacy square types
        case "new":
        case "error":
          return "min-w-[32px] min-h-[32px] flex items-center justify-center px-1"; // Square badges with small padding
        // New simplified types
        case "tilted":
        // Legacy tilted types
        case "discount":
        case "warning":
          return "px-3 py-2"; // More padding for tilted rectangles
        // New simplified types + legacy rectangle types
        case "rectangle":
        case "hot":
        case "success":
        default:
          return "px-3 py-2"; // Default rectangular padding with more space
      }
    };

    const baseColor =
      colorMap[product.bannerColor as keyof typeof colorMap] ||
      "bg-blue-500 text-white";
    const shape =
      typeShapeMap[product.bannerType as keyof typeof typeShapeMap] ||
      "rounded-full";

    return {
      className: baseColor,
      shape: shape,
      additionalClasses: getAdditionalClasses(product.bannerType || ""),
    };
  };

  const renderBanner = () => {
    if (!product.bannerText) return null;

    const bannerStyle = getBannerStyle();

    return (
      <div
        className={`absolute top-2 left-2 text-xs font-bold z-10 shadow-lg ${bannerStyle.className} ${bannerStyle.shape} ${bannerStyle.additionalClasses}`}
      >
        {product.bannerText}
      </div>
    );
  };

  const renderPrice = () => {
    const hasOriginalPrice =
      product.originalPrice &&
      product.originalPrice > 0 &&
      product.originalPrice > product.price;

    if (hasOriginalPrice) {
      const savings = product.originalPrice! - product.price;
      const savingsPercent = Math.round(
        (savings / product.originalPrice!) * 100
      );

      return (
        <div className="space-y-1 min-h-[48px]">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-600">
              {formatPrice(product.price)}
            </span>
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.originalPrice!)}
            </span>
          </div>
          {/* <div className="text-xs text-green-600 font-medium">
            Save {formatPrice(savings)} ({savingsPercent}% off)
          </div> */}
        </div>
      );
    }

    return (
      <div className="min-h-[48px] flex items-start">
        <span className="text-lg font-bold text-pink-600">
          {formatPrice(product.price)}
        </span>
      </div>
    );
  };

  if (layout === "list") {
    return (
      <div
        className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer h-28"
        onClick={() => onProductClick(product)}
      >
        <div className="flex h-full">
          <div className="w-24 h-24 flex-shrink-0 relative">
            <img
              src={product.imageUrl || "/placeholder-product.jpg"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {renderBanner()}
          </div>
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">
                {product.name}
              </h3>
              <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                {product.description}
              </p>
            </div>
            <div className="flex items-center justify-between">
              {renderPrice()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div
        className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer flex flex-col"
        onClick={() => onProductClick(product)}
      >
        <div className="aspect-square relative flex-shrink-0">
          <img
            src={product.imageUrl || "/placeholder-product.jpg"}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {renderBanner()}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-gray-600 text-xs mb-2 line-clamp-2">
            {product.description}
          </p>
          <div className="mt-auto">{renderPrice()}</div>
        </div>
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div
      className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer flex flex-col"
      onClick={() => onProductClick(product)}
    >
      <div className="aspect-[4/3] relative flex-shrink-0">
        <img
          src={product.imageUrl || "/placeholder-product.jpg"}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {renderBanner()}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>
        <div className="mt-auto">
          {renderPrice()}
          {/* Cart Info */}
          {currentQuantity > 0 && (
            <p className="text-xs text-blue-600 mt-2 font-medium">
              {currentQuantity} {labels.inCart}
            </p>
          )}
        </div>

        {/* Add to Cart Button
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering product click
            onAddToCart(product);
          }}
          className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white mt-auto"
        >
          {currentQuantity > 0
            ? `${labels.addMore} (${currentQuantity} ${labels.inCart})`
            : labels.addToCart}
        </button> */}
      </div>
    </div>
  );
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [layout, setLayout] = useState("compact");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const { state: cartState, addItem, getItemQuantity } = useCart();
  const [loading, setLoading] = useState(true);

  // Language (default Khmer), persisted per user in localStorage
  const [lang, setLang] = useState<"km" | "en">("km");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("products_lang");
      if (saved === "km" || saved === "en") setLang(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("products_lang", lang);
    } catch {}
  }, [lang]);

  const containerRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    scrollActiveTabIntoView();
  }, [activeCategory]);

  // Detect active category based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const viewportCenter = scrollTop + containerHeight / 2;

      // Find which category is currently in the center of the viewport
      let currentCategory = null;
      let minDistance = Infinity;

      Object.entries(categoryRefs.current).forEach(([categoryId, element]) => {
        if (element) {
          const elementTop = element.offsetTop;
          const elementHeight = element.clientHeight;
          const elementCenter = elementTop + elementHeight / 2;
          const distance = Math.abs(viewportCenter - elementCenter);

          if (distance < minDistance) {
            minDistance = distance;
            currentCategory = categoryId;
          }
        }
      });

      if (currentCategory && currentCategory !== activeCategory) {
        setActiveCategory(currentCategory);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [activeCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, categoriesResponse] = await Promise.all([
        publicProductsAPI.getAll({ limit: 100 }),
        publicCategoriesAPI.getAll(),
      ]);

      const fetchedProducts = productsResponse.data.products || [];
      const fetchedCategories = categoriesResponse.data.categories || [];

      setProducts(fetchedProducts);
      setCategories(fetchedCategories);

      if (fetchedCategories.length > 0) {
        setActiveCategory(fetchedCategories[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollActiveTabIntoView = () => {
    if (activeTabRef.current && tabsContainerRef.current) {
      const tabElement = activeTabRef.current;
      const container = tabsContainerRef.current;

      const tabLeft = tabElement.offsetLeft;
      const tabWidth = tabElement.offsetWidth;
      const containerScrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;

      // Calculate if tab is out of view
      const tabRight = tabLeft + tabWidth;
      const containerRight = containerScrollLeft + containerWidth;

      if (tabLeft < containerScrollLeft) {
        // Tab is cut off on the left
        container.scrollTo({
          left: tabLeft - 20, // Add some padding
          behavior: "smooth",
        });
      } else if (tabRight > containerRight) {
        // Tab is cut off on the right
        container.scrollTo({
          left: tabRight - containerWidth + 20, // Add some padding
          behavior: "smooth",
        });
      }
    }
  };

  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    const container = containerRef.current;

    if (element && container) {
      setActiveCategory(categoryId);
      const offsetTop = element.offsetTop - 140;
      container.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });

      // Scroll the active tab into view after a short delay
      setTimeout(() => {
        scrollActiveTabIntoView();
      }, 100);
    }
  };

  const handleAddToCart = (product: Product) => {
    // Always allow adding to cart - no stock limitations
    addItem({
      id: `cart-${product.id}`,
      productId: product.id,
      name: product.name,
      price: Number(product.price || 0),
      originalPrice: product.originalPrice
        ? Number(product.originalPrice)
        : undefined,
      imageUrl: product.imageUrl,
      weight: Number(product.weight || 0),
      maxQuantity: Number(product.quantity || 0),
    });

    toast.success(`${product.name} ${STRINGS[lang].addedToCart}`, {
      duration: 1500, // Much quicker - 1.5 seconds instead of default 4 seconds
      position: "top-center",
      style: {
        background: "linear-gradient(to right, #ec4899, #a855f7)",
        color: "#ffffff",
        fontWeight: "600",
        border: "1px solid #f9a8d4",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(236, 72, 153, 0.3)",
      },
      iconTheme: {
        primary: "#ffffff",
        secondary: "#ec4899",
      },
    });
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setSelectedProduct(null);
  };

  // Filter products based on search
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group products by category
  const groupedProducts = categories.reduce((acc, category) => {
    const categoryProducts = filteredProducts.filter(
      (product) => product.category.id === category.id
    );
    if (categoryProducts.length > 0) {
      acc[category.id] = categoryProducts;
    }
    return acc;
  }, {} as { [key: string]: Product[] });

  const getCategoryEmoji = (index: number) => {
    const emojis = ["🔥", "⚡", "🌟", "✨", "💫", "🎉", "🍕", "🍔", "🍰", "🥗"];
    return emojis[index % emojis.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <CollapsibleNavbar
        restaurantInfo={{
          name: "Shoppink",
        }}
        customization={{
          primaryColor: "#ec4899",
          backgroundColor: "linear-gradient(to bottom right, #fdf2f8, #faf5ff)",
          textColor: "#6b7280",
          cardBackgroundColor: "#ffffff",
          borderColor: "#e2e8f0",
          buttonTextColor: "#ffffff",
          headerSubtitle: STRINGS[lang].brandTagline,
        }}
        containerRef={containerRef}
        cartState={{
          totalItems: cartState.totalItems,
          total: cartState.totalPrice || 0,
        }}
        lang={lang}
      >
        {/* Search Bar and Layout Controls */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="z-10 absolute left-3 top-1/4 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
            <input
              type="text"
              placeholder={STRINGS[lang].searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 focus:outline-none transition-all duration-200 backdrop-blur-sm shadow-lg bg-gradient-to-r from-white to-pink-50 border-pink-200 focus:border-pink-400 focus:from-pink-50 focus:to-purple-50 text-gray-900 placeholder-pink-300"
            />
            <div className="mt-2 flex items-center justify-end">
              <div
                className="inline-flex rounded-lg shadow-lg overflow-hidden"
                role="group"
              >
                <button
                  type="button"
                  onClick={() => setLang("km")}
                  className={`px-4 py-2 text-sm font-medium border-r border-pink-200 transition-all duration-200 ${
                    lang === "km"
                      ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md"
                      : "bg-gradient-to-r from-white to-pink-50 text-gray-700 hover:from-pink-50 hover:to-pink-100"
                  }`}
                >
                  ខ្មែរ
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    lang === "en"
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md"
                      : "bg-gradient-to-r from-white to-purple-50 text-gray-700 hover:from-purple-50 hover:to-purple-100"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* Layout Controls */}
          <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50 p-3 rounded-xl border border-pink-100 shadow-sm">
            <span className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {STRINGS[lang].viewLabel}
            </span>
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm">
              <button
                onClick={() => setLayout("compact")}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  layout === "compact"
                    ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md"
                    : "text-gray-500 hover:bg-gradient-to-r hover:from-pink-50 hover:to-pink-100 hover:text-pink-600"
                }`}
                title="Compact View"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout("grid")}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  layout === "grid"
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                    : "text-gray-500 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-100 hover:text-purple-600"
                }`}
                title="Grid View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout("list")}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  layout === "list"
                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md"
                    : "text-gray-500 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-600"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs - Always visible */}
        <div
          ref={tabsContainerRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          <div
            className="flex gap-3 pb-2 px-2"
            style={{ minWidth: "max-content" }}
          >
            {categories.map((category, index) => {
              const isActive = activeCategory === category.id;
              const hasProducts = groupedProducts[category.id]?.length > 0;

              if (!hasProducts) return null;

              return (
                <button
                  key={category.id}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => scrollToCategory(category.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? "text-white shadow-xl scale-105"
                      : "border-2 hover:scale-105 shadow-md"
                  }`}
                  style={{
                    background: isActive
                      ? "linear-gradient(to right, #ec4899, #a855f7)"
                      : "linear-gradient(to right, #ffffff, #fdf2f8)",
                    color: isActive ? "#ffffff" : "#374151",
                    borderColor: isActive ? "#ec4899" : "#f3e8ff",
                  }}
                >
                  <span className="text-xl">{getCategoryEmoji(index)}</span>
                  <span className="font-bold">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CollapsibleNavbar>

      {/* Products Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pb-20"
        style={{ height: "calc(100vh - 200px)" }}
      >
        {searchTerm ? (
          // Search Results
          <div className="px-4 py-6 bg-gradient-to-br from-white to-pink-50 mx-4 mt-4 rounded-2xl shadow-sm border border-pink-100">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {STRINGS[lang].searchResults} ({filteredProducts.length})
            </h2>
            <div
              className={`grid gap-4 ${
                layout === "list"
                  ? "grid-cols-1"
                  : layout === "compact"
                  ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  layout={layout}
                  onAddToCart={handleAddToCart}
                  onProductClick={handleProductClick}
                  currentQuantity={getItemQuantity(product.id)}
                  labels={{
                    inStock: STRINGS[lang].inStock,
                    inCart: STRINGS[lang].inCart,
                    addToCart: STRINGS[lang].addToCart,
                    addMore: STRINGS[lang].addMore,
                  }}
                />
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border-2 border-dashed border-pink-200">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {STRINGS[lang].noProductsFound}
                </h3>
                <p className="text-gray-600">{STRINGS[lang].trySearching}</p>
              </div>
            )}
          </div>
        ) : (
          // Category Sections
          <div className="pb-20">
            {Object.entries(groupedProducts).map(
              ([categoryId, categoryProducts]) => {
                const category = categories.find((c) => c.id === categoryId);
                const categoryIndex = categories.findIndex(
                  (c) => c.id === categoryId
                );

                if (!category) return null;

                return (
                  <div
                    key={categoryId}
                    ref={(el) => {
                      categoryRefs.current[categoryId] = el;
                    }}
                    className="mb-8"
                  >
                    {/* Category Header */}
                    <div className="px-4 py-6">
                      <div className="text-center mb-6 bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-2xl border border-pink-100 shadow-sm">
                        <h2 className="text-3xl font-bold mb-3 flex items-center justify-center gap-3 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                          {category.name}
                          <span className="text-3xl">
                            {getCategoryEmoji(categoryIndex)}
                          </span>
                        </h2>
                        {category.description && (
                          <p className="font-medium text-lg text-gray-600 bg-white bg-opacity-70 px-4 py-2 rounded-full inline-block">
                            {category.description}
                          </p>
                        )}
                        <div className="mt-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700">
                            {categoryProducts.length} product
                            {categoryProducts.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Products Grid */}
                    <div className="px-4">
                      <div
                        className={`grid gap-4 ${
                          layout === "list"
                            ? "grid-cols-1 gap-3"
                            : layout === "compact"
                            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        }`}
                      >
                        {categoryProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            layout={layout}
                            onAddToCart={handleAddToCart}
                            onProductClick={handleProductClick}
                            currentQuantity={getItemQuantity(product.id)}
                            labels={{
                              inStock: STRINGS[lang].inStock,
                              inCart: STRINGS[lang].inCart,
                              addToCart: STRINGS[lang].addToCart,
                              addMore: STRINGS[lang].addMore,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
            )}

            {Object.keys(groupedProducts).length === 0 && !searchTerm && (
              <div className="text-center py-12 px-4">
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-12 border-2 border-dashed border-pink-200">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {STRINGS[lang].noProductsAvailable}
                  </h3>
                  <p className="text-gray-600">
                    {STRINGS[lang].checkBackLater}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Cart Button - Always visible on desktop, hidden on mobile when CollapsibleNavbar manages it */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50">
        <Link
          href={`/cart?lang=${lang}`}
          className="relative bg-gradient-to-r from-pink-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
        >
          <ShoppingCart className="w-6 h-6" />
          {cartState.totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {cartState.totalItems}
            </span>
          )}
        </Link>
      </div>

      {/* Product Preview Modal */}
      <ProductPreviewModal
        product={selectedProduct}
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        lang={lang}
      />
    </div>
  );
}
