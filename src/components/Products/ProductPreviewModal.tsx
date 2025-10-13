"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart, Star, Tag, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import toast from "react-hot-toast";
import hierarchicalStockAPI from "@/services/hierarchicalStockAPI";

const STRINGS = {
  km: {
    productDetails: "លម្អិតផលិតផល",
    sale: "បញ្ចុះតម្លៃ",
    outOfStock: "អស់ពីស្តុក",
    customizeOrder: "កែតម្រូវការកម្មង់",
    description: "ការពិពណ៌នា",
    weight: "ទំងន់",
    stock: "ស្តុក",
    available: "ដែលមាន",
    itemsAlreadyInCart: "ធាតុមានរួចហើយក្នុងរទេះ",
    quantity: "បរិមាណ",
    alwaysAvailable: "មានជានិច្ច",
    pleaseSelect: "សូមជ្រើសរើស",
    selectAllRequiredOptions:
      "សូមជ្រើសរើសជម្រើសទាំងអស់ដែលត្រូវបានទាមទារ មុនពេលបញ្ចូលទៅក្នុងរទេះ",
    free: "ឥតគិតថ្លៃ",
    save: "សន្សំ",
    add: "បន្ថែម",
    toCart: "ចូលរទេះ",
    continueShopping: "បន្តទិញទំនិញ",
    addedToCart: "ត្រូវបានបន្ថែមទៅក្នុងរទេះ!",
    receiptPreview: "វិក្កយបត្រ",
    unitPrice: "តម្លៃឯកតា",
    qtyShort: "បរិមាណ",
    amount: "សរុប",
    options: "ជម្រើស",
    variant: "វ៉ារីយ៉ង់",
  },
  en: {
    productDetails: "Product Details",
    sale: "SALE",
    outOfStock: "Out of Stock",
    customizeOrder: "Customize Your Order",
    description: "Description",
    weight: "Weight",
    stock: "Stock",
    available: "available",
    itemsAlreadyInCart: "item(s) already in cart",
    quantity: "Quantity",
    alwaysAvailable: "Always available",
    pleaseSelect: "Please select",
    selectAllRequiredOptions:
      "Please select all required options before adding to cart",
    free: "Free",
    save: "Save",
    add: "Add",
    toCart: "to Cart",
    continueShopping: "Continue Shopping",
    addedToCart: "added to cart!",
    receiptPreview: "Receipt",
    unitPrice: "Unit",
    qtyShort: "Qty",
    amount: "Amount",
    options: "Options",
    variant: "Variant",
  },
} as const;

interface ProductOption {
  id: string;
  name: string;
  description?: string;
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
  selectionType: string;
  isRequired: boolean;
  sortOrder: number;
  options: ProductOption[];
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
  category: {
    id: string;
    name: string;
  };
}

interface ProductPreviewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  lang?: "km" | "en";
}

export default function ProductPreviewModal({
  product,
  isOpen,
  onClose,
  lang,
}: ProductPreviewModalProps) {
  const currentLang: keyof typeof STRINGS = lang === "en" ? "en" : "km";

  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{
    [groupId: string]: string[];
  }>({});
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [variants, setVariants] = useState<any[]>([]);
  const { addItem, getItemQuantity } = useCart();

  // Helper function to calculate price with options, handling BASE price correctly
  const calculatePriceWithOptions = (
    product: Product,
    selectedOptions: { [groupId: string]: string[] }
  ) => {
    let calculatedPrice = 0; // Start with 0, not product base price
    let hasBasePrice = false;

    if (product.optionGroups) {
      product.optionGroups.forEach((group) => {
        const selectedOptionIds = selectedOptions[group.id] || [];
        selectedOptionIds.forEach((optionId) => {
          const option = group.options.find((opt) => opt.id === optionId);
          if (option) {
            switch (option.priceType) {
              case "BASE":
                // BASE price is the final price for this option - don't add to anything
                if (!hasBasePrice) {
                  calculatedPrice = option.priceValue || 0;
                  hasBasePrice = true;
                } else {
                  // If we already have a base price, add this base price
                  calculatedPrice += option.priceValue || 0;
                }
                break;
              case "FIXED":
                // FIXED is added to current calculated price
                calculatedPrice += option.priceValue || 0;
                break;
              case "PERCENTAGE":
                // PERCENTAGE is added as percentage of current calculated price
                calculatedPrice +=
                  (calculatedPrice * (option.priceValue || 0)) / 100;
                break;
              case "FREE":
              default:
                // No price change for FREE options
                break;
            }
          }
        });
      });
    }

    // If no BASE price was set, fall back to product base price
    if (!hasBasePrice) {
      calculatedPrice = product.price || 0;
    }

    return calculatedPrice;
  };

  // Initialize default options when product changes
  useEffect(() => {
    if (product && product.optionGroups) {
      const defaultOptions: { [groupId: string]: string[] } = {};

      product.optionGroups.forEach((group) => {
        const defaultOption = group.options.find(
          (option) => option.isDefault && option.isAvailable
        );
        if (defaultOption) {
          defaultOptions[group.id] = [defaultOption.id];
        } else if (group.isRequired) {
          // If required but no default, select first available option
          const firstAvailable = group.options.find(
            (option) => option.isAvailable
          );
          if (firstAvailable) {
            defaultOptions[group.id] = [firstAvailable.id];
          }
        }
      });

      setSelectedOptions(defaultOptions);
    } else {
      setSelectedOptions({});
    }
  }, [product]);

  // Load variants for stock checking
  useEffect(() => {
    const loadVariants = async () => {
      try {
        if (product?.id) {
          const res = await hierarchicalStockAPI.getHierarchicalStock(
            product.id
          );
          const v = res?.variants || res?.data?.variants || [];
          setVariants(Array.isArray(v) ? v : []);
        } else {
          setVariants([]);
        }
      } catch (err) {
        console.warn("Failed to load variants for product", product?.id, err);
        setVariants([]);
      }
    };
    loadVariants();
  }, [product?.id]);

  // Calculate price based on selected options (prefer variant pricing)
  useEffect(() => {
    if (!product) return;

    let totalPrice = product.price;

    try {
      const vlist = variants || [];
      const selectedIdsAll: string[] = Object.values(
        selectedOptions || {}
      ).flat();
      if (vlist.length > 0 && selectedIdsAll.length > 0) {
        const desired = new Set(selectedIdsAll);
        const exact = vlist.find((v: any) => {
          const voSet = new Set(
            (v.variantOptions || []).map(
              (vo: any) => vo.optionId || vo.option?.id
            )
          );
          if (voSet.size !== desired.size) return false;
          for (const id of Array.from(desired)) {
            if (!voSet.has(id)) return false;
          }
          return true;
        });
        if (exact) {
          // Check if any of the variant's options have BASE price type
          const hasBaseOption = exact.variantOptions?.some(
            (vo: any) => vo.option?.priceType === "BASE"
          );

          if (hasBaseOption) {
            // If variant contains BASE price options, use priceAdjustment as final price
            totalPrice = exact.priceAdjustment || 0;
          } else {
            // Otherwise, use base price + variant adjustment
            totalPrice = (product.price || 0) + (exact.priceAdjustment || 0);
          }
        } else if (product.optionGroups) {
          // Fallback to option-based adjustments when exact variant not found
          totalPrice = calculatePriceWithOptions(product, selectedOptions);
        }
      } else if (product.optionGroups) {
        // No variants fetched; fallback to option-based adjustments
        totalPrice = calculatePriceWithOptions(product, selectedOptions);
      }
    } catch {}

    setCalculatedPrice(totalPrice);
  }, [product, selectedOptions, variants]);

  // Compute available stock for an option based on variants and current selections
  const getOptionAvailableStock = (groupId: string, option: any) => {
    const vlist = variants || [];
    if (vlist.length > 0) {
      const requiredIds = Object.entries(selectedOptions)
        .filter(([gid]) => gid !== groupId)
        .flatMap(([, ids]) => (Array.isArray(ids) ? ids : []));
      const idsToMatch = Array.from(new Set([...requiredIds, option.id]));
      const total = vlist
        .filter(
          (v: any) =>
            (v.isActive ?? true) &&
            idsToMatch.every((rid) =>
              (v.variantOptions || []).some(
                (vo: any) => (vo.optionId || vo.option?.id) === rid
              )
            )
        )
        .reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
      return total;
    }
    return option?.stock ?? 0;
  };

  if (!isOpen || !product) return null;

  const currentCartQuantity = getItemQuantity(product.id);
  // Always allow selling - no stock limitations
  const isOutOfStock = false;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setSelectedQuantity(newQuantity);
    }
  };

  const handleOptionSelect = (
    groupId: string,
    optionId: string,
    selectionType: string
  ) => {
    setSelectedOptions((prev) => {
      const newOptions = { ...prev };

      if (selectionType === "SINGLE") {
        // Single selection - replace existing selection
        newOptions[groupId] = [optionId];
      } else {
        // Multiple selection - toggle option
        const currentSelections = newOptions[groupId] || [];
        if (currentSelections.includes(optionId)) {
          newOptions[groupId] = currentSelections.filter(
            (id) => id !== optionId
          );
        } else {
          newOptions[groupId] = [...currentSelections, optionId];
        }
      }

      return newOptions;
    });
  };

  const validateRequiredOptions = () => {
    if (!product?.optionGroups) return true;

    for (const group of product.optionGroups) {
      if (group.isRequired) {
        const selectedForGroup = selectedOptions[group.id] || [];
        if (selectedForGroup.length === 0) {
          toast.error(`${STRINGS[currentLang].pleaseSelect} ${group.name}`);
          return false;
        }
      }
    }
    return true;
  };

  const hasRequiredOptionsSelected = () => {
    if (!product?.optionGroups) return true;

    for (const group of product.optionGroups) {
      if (group.isRequired) {
        const selectedForGroup = selectedOptions[group.id] || [];
        if (selectedForGroup.length === 0) {
          return false;
        }
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    // Validate required options
    if (!validateRequiredOptions()) {
      return;
    }

    // Create option details for cart
    const optionDetails = product.optionGroups
      ?.map((group) => {
        const selectedIds = selectedOptions[group.id] || [];
        const selectedOptionDetails = selectedIds
          .map((optionId) => {
            const option = group.options.find((opt) => opt.id === optionId);
            return option
              ? {
                  id: option.id,
                  name: option.name,
                  priceType: option.priceType,
                  priceValue: option.priceValue,
                }
              : null;
          })
          .filter(
            (
              x
            ): x is {
              id: string;
              name: string;
              priceType: string;
              priceValue: number | undefined;
            } => x !== null
          );

        return {
          groupId: group.id,
          groupName: group.name,
          selectionType: group.selectionType,
          selectedOptions: selectedOptionDetails,
        };
      })
      .filter((group) => group.selectedOptions.length > 0);

    addItem({
      id: `cart-${product.id}-${Date.now()}`, // Unique ID for different option combinations
      productId: product.id,
      name: product.name,
      price: Number(calculatedPrice || product.price || 0),
      originalPrice: product.originalPrice
        ? Number(product.originalPrice)
        : undefined,
      imageUrl: product.imageUrl,
      weight: Number(product.weight || 0),
      maxQuantity: Number(product.quantity || 0),
      quantity: Number(selectedQuantity || 1),
      optionDetails: optionDetails || [],
    });

    toast.success(
      `${selectedQuantity}x ${product.name} ${STRINGS[currentLang].addedToCart}`,
      {
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
      }
    );
    setSelectedQuantity(1);
  };

  const getBannerStyles = (bannerColor: string) => {
    switch (bannerColor) {
      case "red":
        return "bg-red-500 text-white";
      case "blue":
        return "bg-blue-500 text-white";
      case "green":
        return "bg-green-500 text-white";
      case "yellow":
        return "bg-yellow-500 text-black";
      case "purple":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      data-lang={lang}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Made smaller and added better shadow */}
        {/* Header - More compact */}
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-pink-50 to-purple-50">
          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {STRINGS[currentLang].productDetails}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-full transition-all duration-200 hover:scale-105"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4">
          {/* Single column layout for compactness */}
          {/* Product Image - Smaller and centered */}
          <div className="relative mb-6">
            <div className="aspect-[4/3] max-w-sm mx-auto rounded-xl overflow-hidden bg-gray-100 shadow-lg">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />

              {/* Banners */}
              {product.bannerText && (
                <div
                  className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-medium ${getBannerStyles(
                    product.bannerColor || "gray"
                  )}`}
                >
                  {product.bannerText}
                </div>
              )}

              {product.originalPrice &&
                product.originalPrice > 0 &&
                product.originalPrice > product.price && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {STRINGS[currentLang].sale}
                  </div>
                )}

              {isOutOfStock && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <span className="text-white font-medium text-lg">
                    {STRINGS[currentLang].outOfStock}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product Details - More compact spacing */}
          <div className="space-y-4">
            {/* Category - Enhanced styling */}
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <Tag className="h-3 w-3 mr-1" />
                {product.category.name}
              </span>
            </div>

            {/* Product Name - Centered and smaller */}
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              {product.name}
            </h1>

            {/* Price - Centered and enhanced */}
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                ${(calculatedPrice || product.price).toFixed(2)}
              </span>
              {product.originalPrice &&
                product.originalPrice > 0 &&
                product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                    <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                      {STRINGS[currentLang].save} $
                      {(product.originalPrice - product.price).toFixed(2)}
                    </span>
                  </>
                )}
            </div>

            {/* Product Options */}
            {product.optionGroups && product.optionGroups.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {STRINGS[currentLang].customizeOrder}
                </h3>

                {product.optionGroups.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">
                        {group.name}
                      </h4>
                      {group.isRequired && (
                        <span className="text-red-500 text-sm">*</span>
                      )}
                    </div>

                    {group.description && (
                      <p className="text-sm text-gray-600">
                        {group.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {group.options
                        .filter((option) => option.isAvailable)
                        .map((option) => {
                          const isSelected = (
                            selectedOptions[group.id] || []
                          ).includes(option.id);
                          const availableStock = getOptionAvailableStock(
                            group.id,
                            option
                          );
                          const isOutOfStock = availableStock <= 0;

                          return (
                            <div
                              key={option.id}
                              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : isOutOfStock
                                  ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              onClick={() => {
                                if (!isOutOfStock) {
                                  handleOptionSelect(
                                    group.id,
                                    option.id,
                                    group.selectionType
                                  );
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center">
                                    {group.selectionType === "SINGLE" ? (
                                      <div
                                        className={`w-4 h-4 rounded-full border-2 ${
                                          isSelected
                                            ? "border-blue-500 bg-blue-500"
                                            : "border-gray-300"
                                        }`}
                                      >
                                        {isSelected && (
                                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                                        )}
                                      </div>
                                    ) : (
                                      <div
                                        className={`w-4 h-4 rounded border-2 ${
                                          isSelected
                                            ? "border-blue-500 bg-blue-500"
                                            : "border-gray-300"
                                        }`}
                                      >
                                        {isSelected && (
                                          <svg
                                            className="w-3 h-3 text-white"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {option.name}
                                    </p>
                                    {option.description && (
                                      <p className="text-sm text-gray-600">
                                        {option.description}
                                      </p>
                                    )}
                                    {isOutOfStock && (
                                      <p className="text-sm text-red-600">
                                        {STRINGS[currentLang].outOfStock}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right">
                                  {option.priceType === "FREE" && (
                                    <span className="text-sm text-green-600 font-medium">
                                      {STRINGS[currentLang].free}
                                    </span>
                                  )}
                                  {option.priceType === "BASE" &&
                                    option.priceValue && (
                                      <span className="text-sm font-medium">
                                        ${option.priceValue.toFixed(2)}
                                      </span>
                                    )}
                                  {option.priceType === "FIXED" &&
                                    option.priceValue && (
                                      <span className="text-sm font-medium">
                                        +${option.priceValue.toFixed(2)}
                                      </span>
                                    )}
                                  {option.priceType === "PERCENTAGE" &&
                                    option.priceValue && (
                                      <span className="text-sm font-medium">
                                        +{option.priceValue}%
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Description - More compact */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                {STRINGS[currentLang].description}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Cart Info */}
            {currentCartQuantity > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <ShoppingCart className="h-4 w-4 inline mr-1" />
                  {currentCartQuantity}{" "}
                  {STRINGS[currentLang].itemsAlreadyInCart}
                </p>
              </div>
            )}

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {STRINGS[currentLang].quantity}
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleQuantityChange(selectedQuantity - 1)}
                    disabled={selectedQuantity <= 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-16 text-center text-lg font-medium">
                    {selectedQuantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(selectedQuantity + 1)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <div className="space-y-3">
              {product.hasOptions && !hasRequiredOptionsSelected() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    {STRINGS[currentLang].selectAllRequiredOptions}
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  handleAddToCart();
                  onClose(); // Close modal after adding to cart
                }}
                disabled={product.hasOptions && !hasRequiredOptionsSelected()}
                className={`w-full py-3 px-6 rounded-xl font-medium text-base transition-all duration-200 transform hover:scale-105 shadow-lg ${
                  product.hasOptions && !hasRequiredOptionsSelected()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
                }`}
              >
                <ShoppingCart className="inline h-4 w-4 mr-2" />
                {STRINGS[currentLang].add} {selectedQuantity}{" "}
                {STRINGS[currentLang].toCart} - $
                {(
                  (calculatedPrice || product.price || 0) * selectedQuantity
                ).toFixed(2)}
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 px-6 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 text-sm"
              >
                {STRINGS[currentLang].continueShopping}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
