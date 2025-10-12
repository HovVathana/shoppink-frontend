"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Upload, CheckCircle, CreditCard } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { customerOrdersAPI } from "@/lib/api";

const STRINGS = {
  km: {
    header: "ការទូទាត់",
    back: "ថយក្រោយ",
    customerInformation: "ព័ត៌មានអតិថិជន",
    fullName: "ឈ្មោះពេញ *",
    fullNamePlaceholder: "បញ្ចូលឈ្មោះពេញរបស់អ្នក",
    fullNameRequired: "ត្រូវការឈ្មោះ",
    phoneNumber: "លេខទូរស័ព្ទ *",
    phoneRequired: "ត្រូវការលេខទូរស័ព្ទ",
    phoneInvalid: "សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ",
    location: "ទីតាំង *",
    locationRequired: "ត្រូវការទីតាំង",
    locationPlaceholder: "បញ្ចូលអាសយដ្ឋានរបស់អ្នក",
    province: "ខេត្ត/ក្រុង *",
    provinceRequired: "ត្រូវការខេត្ត/ក្រុង",
    selectProvince: "ជ្រើសរើសខេត្ត/ក្រុង",
    phnomPenh: "ភ្នំពេញ",
    provinceOther: "ខេត្តផ្សេងៗ",
    remarkOptional: "កំណត់សម្គាល់ (ជាជម្រើស)",
    remarkPlaceholder: "សេចក្តីណែនាំឬកំណត់ចំណាំពិសេសណាមួយ",
    payment: "ការទូទាត់",
    scanToPay: "ស្កេនដើម្បីទូទាត់",
    scanText:
      "ស្កេនកូដ QR ខាងក្រោមជាមួយកម្មវិធី ABA របស់អ្នកដើម្បីធ្វើការទូទាត់",
    total: "សរុប",
    uploadPayment: "ផ្ទុករូបថតបង់ប្រាក់ *",
    uploadPrompt: "ផ្ទុករូបថតការបញ្ជាក់ការទូទាត់របស់អ្នក",
    chooseFile: "ជ្រើសរើសឯកសារ",
    paymentUploaded: "បានផ្ទុកភស្តុតាងបង់ប្រាក់",
    remove: "លុបចេញ",
    orderSummary: "សង្ខេបការបញ្ជាទិញ",
    qty: "បរិមាណ",
    subtotal: "សរុបរង",
    deliveryFee: "ថ្លៃដឹកជញ្ជូន",
    placeOrder: "ដាក់បញ្ជាទិញ",
    placingOrder: "កំពុងដាក់បញ្ជាទិញ...",
    orderSuccess: "បានដាក់បញ្ជាទិញដោយជោគជ័យ!",
    uploadProofError: "សូមផ្ទុកភស្តុតាងបង់ប្រាក់",
    fileTooLarge: "ទំហំឯកសារត្រូវតែតិចជាង 5MB",
    invalidFileType: "សូមផ្ទុកឯកសាររូបភាព",
  },
  en: {
    header: "Checkout",
    back: "Back",
    customerInformation: "Customer Information",
    fullName: "Full Name *",
    fullNamePlaceholder: "Enter your full name",
    fullNameRequired: "Name is required",
    phoneNumber: "Phone Number *",
    phoneRequired: "Phone number is required",
    phoneInvalid: "Please enter a valid phone number",
    location: "Location *",
    locationRequired: "Location is required",
    locationPlaceholder: "Enter your address",
    province: "Province *",
    provinceRequired: "Province is required",
    selectProvince: "Select Province",
    phnomPenh: "Phnom Penh",
    provinceOther: "Province",
    remarkOptional: "Remarks (Optional)",
    remarkPlaceholder: "Any special instructions or notes",
    payment: "Payment",
    scanToPay: "Scan to Pay",
    scanText: "Scan the QR code below with your ABA mobile app to make payment",
    total: "Total",
    uploadPayment: "Upload Payment Screenshot *",
    uploadPrompt: "Upload a screenshot of your payment confirmation",
    chooseFile: "Choose File",
    paymentUploaded: "Payment proof uploaded",
    remove: "Remove",
    orderSummary: "Order Summary",
    qty: "Qty",
    subtotal: "Subtotal",
    deliveryFee: "Delivery Fee",
    placeOrder: "Place Order",
    placingOrder: "Placing Order...",
    orderSuccess: "Order placed successfully!",
    uploadProofError: "Please upload payment proof",
    fileTooLarge: "File size must be less than 5MB",
    invalidFileType: "Please upload an image file",
  },
} as const;

// interface CheckoutForm {
//   customerName: string;
//   customerPhone: string;
//   customerLocation: string;
//   province: string;
//   const searchParams = useSearchParams();
//   const initialLang = (searchParams?.get("lang") as "km" | "en") || (typeof window !== 'undefined' ? (localStorage.getItem("products_lang") as "km" | "en") : null) || "km";
//   const [lang, setLang] = useState<"km" | "en">(initialLang);
//   useEffect(() => { try { localStorage.setItem("products_lang", lang); } catch {} }, [lang]);
//   const withLang = (path: string) => `${path}?lang=${lang}`;

//   remark?: string;
// }

interface CheckoutForm {
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  province: string;
  remark?: string;
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function CheckoutContent() {
  const { state, clearCart } = useCart();
  const router = useRouter();
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>();

  const selectedProvince = watch("province");

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

  // Redirect if cart is empty
  if (state.items.length === 0) {
    router.push(withLang("/cart"));
    return null;
  }

  // Calculate delivery price based on province
  const getDeliveryPrice = (province: string) => {
    return province === "Phnom Penh" ? 2.5 : 3.0;
  };

  const deliveryPrice = selectedProvince
    ? getDeliveryPrice(selectedProvince)
    : 2.5;
  const total = state.subtotal + deliveryPrice;

  const handlePaymentProofUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("File size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      setPaymentProof(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentProofPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CheckoutForm) => {
    setIsSubmitting(true);

    try {
      // Prepare form data
      const formData = new FormData();

      // Add customer data
      formData.append("customerName", data.customerName);
      formData.append("customerPhone", data.customerPhone);
      formData.append("customerLocation", data.customerLocation);
      formData.append("province", data.province);
      if (data.remark) {
        formData.append("remark", data.remark);
      }

      // Add pricing data
      formData.append("subtotalPrice", state.subtotal.toString());
      formData.append("deliveryPrice", deliveryPrice.toString());
      formData.append("totalPrice", total.toString());

      // Add cart items
      const items = state.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        weight: item.weight,
        optionDetails: item.optionDetails || [],
      }));
      formData.append("items", JSON.stringify(items));

      // Add payment proof
      if (paymentProof) {
        formData.append("paymentProof", paymentProof);
      }

      // Submit order
      const response = await customerOrdersAPI.create(formData);

      // Clear cart and redirect
      clearCart();
      toast.success(STRINGS[lang].orderSuccess);
      router.push(withLang("/order-success"));
    } catch (error: any) {
      console.error("Failed to place order:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to place order. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100/70 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href={withLang("/cart")}
                className="mr-4 p-2 text-gray-600 hover:text-pink-600 transition-colors rounded-full hover:bg-pink-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {STRINGS[lang].header}
              </h1>
            </div>
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
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Customer Information */}
            <div className="space-y-6">
              {/* Customer Details */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
                <h2 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">
                  {STRINGS[lang].customerInformation}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {STRINGS[lang].fullName}
                    </label>
                    <input
                      {...register("customerName", {
                        required: STRINGS[lang].fullNameRequired,
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gradient-to-r from-white to-pink-50 transition-all duration-200"
                      placeholder={STRINGS[lang].fullNamePlaceholder}
                    />
                    {errors.customerName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.customerName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {STRINGS[lang].phoneNumber}
                    </label>
                    <input
                      {...register("customerPhone", {
                        required: STRINGS[lang].phoneRequired,
                        pattern: {
                          value: /^[0-9+\-\s()]+$/,
                          message: STRINGS[lang].phoneInvalid,
                        },
                      })}
                      type="tel"
                      className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gradient-to-r from-white to-pink-50 transition-all duration-200"
                      placeholder={STRINGS[lang].phoneNumber}
                    />
                    {errors.customerPhone && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.customerPhone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {STRINGS[lang].location}
                    </label>
                    <input
                      {...register("customerLocation", {
                        required: STRINGS[lang].locationRequired,
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gradient-to-r from-white to-pink-50 transition-all duration-200"
                      placeholder={STRINGS[lang].locationPlaceholder}
                    />
                    {errors.customerLocation && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.customerLocation.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {STRINGS[lang].province}
                    </label>
                    <select
                      {...register("province", {
                        required: STRINGS[lang].provinceRequired,
                      })}
                      className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gradient-to-r from-white to-pink-50 transition-all duration-200"
                    >
                      <option value="">{STRINGS[lang].selectProvince}</option>
                      <option value="Phnom Penh">
                        {STRINGS[lang].phnomPenh}
                      </option>
                      <option value="Province">
                        {STRINGS[lang].provinceOther}
                      </option>
                    </select>
                    {errors.province && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.province.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {STRINGS[lang].remarkOptional}
                    </label>
                    <textarea
                      {...register("remark")}
                      rows={3}
                      className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gradient-to-r from-white to-pink-50 transition-all duration-200"
                      placeholder={STRINGS[lang].remarkPlaceholder}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
                <h2 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">
                  {STRINGS[lang].payment}
                </h2>

                {/* QR Code */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg mb-4">
                    <CreditCard className="h-6 w-6 text-pink-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {STRINGS[lang].scanToPay}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {STRINGS[lang].scanText}
                  </p>

                  <div className="inline-block p-4 bg-gradient-to-br from-white to-pink-50 border-2 border-pink-200 rounded-xl shadow-lg">
                    <img
                      src="/aba_qr.PNG"
                      alt="ABA QR Code for Payment"
                      className="w-48 h-48 object-contain mx-auto"
                    />
                  </div>

                  <p className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mt-4">
                    {STRINGS[lang].total}: ${total.toFixed(2)}
                  </p>
                </div>

                {/* Payment Proof Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {STRINGS[lang].uploadPayment}
                  </label>
                  <div className="border-2 border-dashed border-pink-300 rounded-lg p-6 text-center bg-gradient-to-br from-pink-50 to-purple-50">
                    {paymentProofPreview ? (
                      <div>
                        <img
                          src={paymentProofPreview}
                          alt="Payment proof"
                          className="w-32 h-32 object-cover mx-auto rounded-lg mb-4"
                        />
                        <p className="text-sm text-green-600 mb-2">
                          <CheckCircle className="h-4 w-4 inline mr-1" />
                          {STRINGS[lang].paymentUploaded}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProof(null);
                            setPaymentProofPreview("");
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          {STRINGS[lang].remove}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          {STRINGS[lang].uploadPrompt}
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePaymentProofUpload}
                          className="hidden"
                          id="payment-proof"
                        />
                        <label
                          htmlFor="payment-proof"
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-pink-700 hover:to-purple-700 cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          {STRINGS[lang].chooseFile}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8 border border-pink-100">
                <h2 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">
                  {STRINGS[lang].orderSummary}
                </h2>

                {/* Items */}
                <div className="space-y-3 mb-6">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-gray-600">
                          {STRINGS[lang].qty}: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {STRINGS[lang].subtotal}
                    </span>
                    <span className="font-medium">
                      ${state.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {STRINGS[lang].deliveryFee}
                    </span>
                    <span className="font-medium">
                      ${deliveryPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t pt-2">
                    <span className="text-gray-900">{STRINGS[lang].total}</span>
                    <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-4 rounded-xl font-bold text-lg hover:from-pink-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting
                    ? STRINGS[lang].placingOrder
                    : STRINGS[lang].placeOrder}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-pink-600 animate-pulse" />
            </div>
            <p className="text-gray-600 text-center">Loading checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
