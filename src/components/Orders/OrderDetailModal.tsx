"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { XCircle, Download } from "lucide-react";
import { toPng } from "html-to-image";

interface OrderItemOptionGroup {
  groupId: string;
  groupName: string;
  selectionType: string;
  selectedOptions: Array<{
    id: string;
    name: string;
    priceType: string;
    priceValue?: number;
  }>;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id?: string;
    name: string;
    imageUrl?: string;
  };
  // optionDetails can be either an array of groups or an object with selections
  optionDetails?:
    | OrderItemOptionGroup[]
    | {
        variantId?: string;
        selections: OrderItemOptionGroup[];
      }
    | null;
}

interface CreatorInfo {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface OrderDetailInfo {
  id: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  province: string;
  remark?: string;
  subtotalPrice: number;
  companyDeliveryPrice: number;
  deliveryPrice: number;
  totalPrice: number;
  isPaid: boolean;
  orderAt: string;
  assignedAt?: string;
  creator?: CreatorInfo;
  orderItems: OrderItem[];
}

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetailInfo | null;
  isBlacklisted?: boolean;
}

function formatOptionDetails(
  optionDetails: OrderItem["optionDetails"]
): string | null {
  if (!optionDetails) return null;
  let groups: OrderItemOptionGroup[] = [];
  if (Array.isArray(optionDetails)) {
    groups = optionDetails;
  } else if (optionDetails && typeof optionDetails === "object") {
    groups = optionDetails.selections || [];
  }
  if (!groups.length) return null;

  const parts: string[] = [];
  for (const g of groups) {
    const names = (g.selectedOptions || []).map((o) => o.name).filter(Boolean);
    if (names.length) parts.push(`${g.groupName}: ${names.join(", ")}`);
  }
  return parts.length ? parts.join(" | ") : null;
}

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
  isBlacklisted = false,
}: OrderDetailModalProps) {
  if (!isOpen || !order) return null;

  const orderDate = new Date(order.orderAt).toLocaleString();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleSaveImage = useCallback(async () => {
    if (!receiptRef.current || !imageUrl) return;
    try {
      const link = document.createElement("a");
      link.download = `order-${order.id}.png`;
      link.href = imageUrl;
      link.click();
    } catch (e) {
      console.error("Failed to export image", e);
    }
  }, [order.id]);

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // reset image when order changes or modal opens
    setImageUrl(null);
  }, [order.id, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = receiptRef.current;
    if (!el) return;
    const timer = setTimeout(async () => {
      try {
        const dataUrl = await toPng(el, {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          filter: (node: any) => {
            try {
              if (
                node?.getAttribute &&
                node.getAttribute("data-skip-capture") === "true"
              ) {
                return false;
              }
            } catch {}
            return true;
          },
        });
        setImageUrl(dataUrl);
      } catch (e) {
        console.error("Failed to render image", e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, order.id]);

  return (
    <div className="khmerFont fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Receipt-like narrow modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-md">
          {/* Controls (outside capture area) */}
          <div className="px-5 pt-3 pb-0 flex justify-end gap-2">
            <button
              onClick={handleSaveImage}
              disabled={!imageUrl}
              data-skip-capture="true"
              className={`text-xs flex items-center gap-1 ${
                imageUrl
                  ? "text-blue-600 hover:text-blue-800"
                  : "text-gray-400 cursor-not-allowed"
              }`}
            >
              <Download className="h-4 w-4" />
              <span>Save Image</span>
            </button>
            <button
              onClick={onClose}
              data-skip-capture="true"
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <div
            className={`bg-white ${
              imageUrl ? "hidden pt-5 pb-0" : "block py-5"
            }`}
            ref={receiptRef}
          >
            {/* Header */}
            <div className="px-5 pb-3 border-b border-gray-200 flex items-end justify-between">
              <div>
                <div className=" text-base font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  វិក្កយបត្រ
                </div>
                <div className=" text-xs text-gray-600">
                  កាលបរិច្ឆេទ: <span className="font-medium">{orderDate}</span>
                </div>
                {order.creator && (
                  <div className="text-xs text-gray-600 ">
                    <span className=""> បញ្ជាដោយ: </span>
                    <span className="font-medium">
                      {order.creator?.name || "N/A"} (
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <img
                  src="/logo.JPG"
                  alt="logo"
                  className="w-10 h-10 object-cover rounded"
                />
              </div>
            </div>
            {/* <div className={`${imageUrl ? "hidden" : "block"}`}> */}
            {/* Barcode */}
            <div className="flex justify-center mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${order.id}&scale=2&height=10&includetext`}
                alt="barcode"
                className="w-[200px] h-[30px]"
              />
            </div>

            {/* Customer Info */}
            <div className="px-5 mt-3 space-y-0.5">
              <div className=" text-sm font-semibold">អតិថិជន:</div>
              <div className="text-sm">{order.customerName}</div>
              <div className="text-xs text-gray-700 flex items-center gap-2">
                <span>{order.customerPhone}</span>
                {isBlacklisted && (
                  <span className="inline-flex items-center text-[10px] font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                    Blacklisted
                  </span>
                )}
              </div>
              <div className=" text-sm">
                {order.customerLocation}
                {order.province === "Phnom Penh"
                  ? ", Phnom Penh"
                  : ", Province"}
              </div>
              {order.remark && (
                <div className=" text-xs text-gray-700">
                  ចំណាំ: {order.remark}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="px-5 mt-4">
              <div className="border-2 border-black rounded">
                <div className="bg-gray-100 border-b-2 border-black flex">
                  <div className="flex-1 text-center px-2 py-1.5 text-sm font-semibold">
                    ផលិតផល
                  </div>
                  <div className="w-20 text-center px-2 py-1.5 text-sm font-semibold">
                    ចំនួន
                  </div>
                </div>
                {order.orderItems.map((item) => {
                  const opts = formatOptionDetails(item.optionDetails);
                  return (
                    <div
                      key={item.id}
                      className="flex border-b-2 border-black last:border-b-0"
                    >
                      <div className="flex-1 px-2 py-2">
                        <div className="text-sm font-medium text-gray-900">
                          {item.product.name}
                        </div>
                        {opts && (
                          <div className="text-xs font-bold text-black mt-0.5">
                            {opts}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-500">
                          ${item.price.toFixed(2)} / unit
                        </div>
                      </div>
                      <div className="w-20 px-2 py-2 flex items-center justify-center">
                        {item.quantity > 1 ? (
                          <span className="inline-flex items-center justify-center border-2 border-red-600 text-red-700 rounded-full w-7 h-7 text-xs font-bold">
                            {item.quantity}
                          </span>
                        ) : (
                          <span className="text-sm">{item.quantity}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="px-5 mt-4">
              <div className="flex flex-col items-end gap-1">
                <div className="min-w-[160px] border-2 border-black rounded p-2 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className=" font-medium">សម្គាល់បង់ប្រាក់</span>
                    <span
                      className={` ${
                        order.isPaid
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      } inline-flex px-2 py-0.5 rounded-full text-xs font-medium`}
                    >
                      {order.isPaid ? "រួចរាល់" : "មិនទាន់"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className=" font-medium">សរុបរង</span>
                    <span>${order.subtotalPrice.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className=" font-medium">ថ្លៃដឹកជញ្ជូន</span>
                    <span>${order.deliveryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-bold">
                    <span className="">សរុប</span>
                    <span>${order.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* </div> */}
          </div>

          {/* Image preview for iOS long-press save */}
          {imageUrl && (
            <div className="px-5 mt-3 pb-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Order receipt"
                className="w-full h-auto rounded-md border border-gray-200"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
