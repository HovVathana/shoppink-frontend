"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const STRINGS = {
  km: {
    title: "រទេះទំនិញ",
    emptyTitle: "រទេះទំនិញរបស់អ្នកទទេ",
    emptySubtitle:
      "ស្វែងរកផលិតផលអស្ចារ្យ ហើយចាប់ផ្តើមបង្កើតការបញ្ជាទិញរបស់អ្នក!",
    startShopping: "ចាប់ផ្តើមធ្វើទិញ",
    items: "ធាតុ",
    clearCart: "សម្អាតរទេះ",
    cartItems: "ទំនិញក្នុងរទេះ",
    alwaysAvailable: "មានស្រាប់ជានិច្ច",
    subtotal: "សរុបរង",
    deliveryFee: "ថ្លៃដឹកជញ្ជូន",
    total: "សរុប",
    proceedToCheckout: "បន្តទៅទូទាត់",
    back: "ថយក្រោយ",
  },
  en: {
    title: "Shopping Cart",
    emptyTitle: "Your cart is empty",
    emptySubtitle:
      "Discover amazing products and start building your perfect order!",
    startShopping: "Start Shopping",
    items: "items",
    clearCart: "Clear Cart",
    cartItems: "Cart Items",
    alwaysAvailable: "Always available",
    subtotal: "Subtotal",
    deliveryFee: "Delivery Fee",
    total: "Total",
    proceedToCheckout: "Proceed to Checkout",
    back: "Back",
  },
} as const;

// Component that uses useSearchParams - needs to be wrapped in Suspense
function CartContent() {
  const { state, updateQuantity, removeItem, clearCart } = useCart();
  const searchParams = useSearchParams();
  const initialLang =
    (searchParams?.get("lang") as "km" | "en") ||
    (typeof window !== "undefined"
      ? (localStorage.getItem("products_lang") as "km" | "en")
      : null) ||
    "km";
  const [lang, setLang] = useState<"km" | "en">(initialLang);
  useEffect(() => {
    try {
      localStorage.setItem("products_lang", lang);
    } catch {}
  }, [lang]);
  const withLang = (path: string) => `${path}?lang=${lang}`;

  const router = useRouter();

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleCheckout = () => {
    router.push(withLang("/checkout"));
  };

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100/70 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link
                  href={withLang("/products")}
                  className="mr-4 p-2 text-gray-600 hover:text-pink-600 transition-colors rounded-full hover:bg-pink-50"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  {STRINGS[lang].title}
                </h1>
              </div>
              <div className="inline-flex rounded-lg shadow-lg overflow-hidden" role="group">
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
        </header>

        {/* Empty Cart */}
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="h-10 w-10 text-pink-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {STRINGS[lang].emptySubtitle}
            </p>
            <Link
              href={withLang("/products")}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-pink-700 hover:to-purple-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105 inline-block"
            >
              {STRINGS[lang].startShopping}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100/70 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href={withLang("/products")}
                className="mr-4 p-2 text-gray-600 hover:text-pink-600 transition-colors rounded-full hover:bg-pink-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {STRINGS[lang].title} ({state.totalItems} {STRINGS[lang].items})
              </h1>
            </div>
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-700 transition-colors px-3 py-1 rounded-full hover:bg-red-50"
            >
              {STRINGS[lang].clearCart}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl border border-pink-100">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {STRINGS[lang].cartItems}
                </h2>
                <div className="space-y-4">
                  {state.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gradient-to-br from-white to-pink-50 rounded-2xl p-4 border border-pink-100"
                    >
                      <div className="flex items-start space-x-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-xl shadow-sm"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-base mb-2">
                            {item.name}
                          </h3>

                          {/* Selected Options */}
                          {item.optionDetails &&
                            item.optionDetails.length > 0 && (
                              <div className="mb-2 space-y-1">
                                {item.optionDetails.map((group) => (
                                  <div
                                    key={group.groupId}
                                    className="text-sm text-gray-600"
                                  >
                                    <span className="font-medium">
                                      {group.groupName}:
                                    </span>{" "}
                                    {group.selectedOptions.map(
                                      (option, index) => (
                                        <span key={option.id}>
                                          {option.name}
                                          {option.priceType === "FIXED" &&
                                            option.priceValue && (
                                              <span className="text-green-600">
                                                {" "}
                                                (+$
                                                {option.priceValue.toFixed(2)})
                                              </span>
                                            )}
                                          {option.priceType === "PERCENTAGE" &&
                                            option.priceValue && (
                                              <span className="text-green-600">
                                                {" "}
                                                (+{option.priceValue}%)
                                              </span>
                                            )}
                                          {index <
                                            group.selectedOptions.length - 1 &&
                                            ", "}
                                        </span>
                                      )
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                          <div className="flex items-center mb-2">
                            <span className="text-lg font-bold text-pink-600">
                              ${Number(item.price || 0).toFixed(2)}
                            </span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="ml-2 text-sm text-gray-500 line-through">
                                ${Number(item.originalPrice).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {STRINGS[lang].alwaysAvailable}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls and Total */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.id,
                                Number(item.quantity) - 1
                              )
                            }
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-pink-100 text-gray-600 hover:text-pink-600 transition-colors flex items-center justify-center"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-12 text-center text-lg font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.id,
                                Number(item.quantity) + 1
                              )
                            }
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-pink-100 text-gray-600 hover:text-pink-600 transition-colors flex items-center justify-center"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              $
                              {(
                                Number(item.price || 0) *
                                Number(item.quantity || 0)
                              ).toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl border border-pink-100 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">
                    {STRINGS[lang].subtotal} ({state.totalItems}{" "}
                    {STRINGS[lang].items})
                  </span>
                  <span className="font-bold text-gray-900">
                    ${Number(state.subtotal || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-base">
                  <span className="text-gray-600">
                    {STRINGS[lang].deliveryFee}
                  </span>
                  <span className="font-bold text-gray-900">
                    ${Number(state.deliveryPrice || 0).toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span className="text-gray-900">{STRINGS[lang].total}</span>
                    <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      ${Number(state.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full mt-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-pink-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {STRINGS[lang].proceedToCheckout}
              </button>

              <Link
                href={withLang("/products")}
                className="block w-full mt-4 text-center text-pink-600 hover:text-pink-700 transition-colors font-medium py-2"
              >
                {STRINGS[lang].startShopping}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="h-8 w-8 text-pink-600 animate-pulse" />
          </div>
          <p className="text-gray-600 text-center">Loading cart...</p>
        </div>
      </div>
    }>
      <CartContent />
    </Suspense>
  );
}
