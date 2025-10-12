"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { customerOrdersAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { X } from "lucide-react";

interface CustomerOrderForm {
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  province: string;
  remark: string;
  subtotalPrice: number;
  deliveryPrice: number;
  totalPrice: number;
  isPaid?: string; // "true" | "false" to fit FormData
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    weight: number;
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
  }>;
}

interface CustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order?: any;
}

export default function CustomerOrderModal({
  isOpen,
  onClose,
  onSuccess,
  order,
}: CustomerOrderModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerOrderForm>();

  useEffect(() => {
    if (isOpen && order) {
      // Populate form with existing order data
      reset({
        customerName: order.customerName || "",
        customerPhone: order.customerPhone || "",
        customerLocation: order.customerLocation || "",
        province: order.province || "",
        remark: order.remark || "",
        subtotalPrice: order.subtotalPrice || 0,
        deliveryPrice: order.deliveryPrice || 0,
        totalPrice: order.totalPrice || 0,
        isPaid: order.isPaid ? "true" : "false",
        items:
          order.orderItems?.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            weight: item.weight,
            optionDetails: item.optionDetails || [],
          })) || [],
      });
    } else if (isOpen) {
      reset();
    }
  }, [isOpen, order, reset]);

  const onSubmit = async (data: CustomerOrderForm) => {
    try {
      setIsLoading(true);

      const formData = new FormData();

      // Add form fields
      formData.append("customerName", data.customerName);
      formData.append("customerPhone", data.customerPhone);
      formData.append("customerLocation", data.customerLocation);
      formData.append("province", data.province);
      formData.append("remark", data.remark || "");
      formData.append("subtotalPrice", data.subtotalPrice.toString());
      formData.append("deliveryPrice", data.deliveryPrice.toString());
      formData.append("totalPrice", data.totalPrice.toString());

      // Add items
      formData.append("items", JSON.stringify(data.items));

      // Payment status
      if (typeof data.isPaid !== "undefined") {
        formData.append("isPaid", data.isPaid);
      }

      // Add payment proof if provided
      if (paymentProofFile) {
        formData.append("paymentProof", paymentProofFile);
      }

      if (order) {
        await customerOrdersAPI.update(order.id, formData);
        toast.success("Customer order updated successfully");
      } else {
        await customerOrdersAPI.create(formData);
        toast.success("Customer order created successfully");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to save customer order:", error);
      toast.error(
        error.response?.data?.message || "Failed to save customer order"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 mobile-compact">
      <div className="menubox-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {order ? "Edit Customer Order" : "Create Customer Order"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                {...register("customerName", {
                  required: "Customer name is required",
                })}
                type="text"
                className="menubox-input w-full"
              />
              {errors.customerName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.customerName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Phone *
              </label>
              <input
                {...register("customerPhone", {
                  required: "Customer phone is required",
                })}
                type="text"
                className="menubox-input w-full"
              />
              {errors.customerPhone && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.customerPhone.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Location *
            </label>
            <input
              {...register("customerLocation", {
                required: "Customer location is required",
              })}
              type="text"
              className="menubox-input w-full"
            />
            {errors.customerLocation && (
              <p className="text-red-500 text-sm mt-1">
                {errors.customerLocation.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province *
              </label>
              <select
                {...register("province", { required: "Province is required" })}
                className="menubox-input w-full"
              >
                <option value="">Select Province</option>
                <option value="Phnom Penh">Phnom Penh</option>
                <option value="Province">Province</option>
              </select>
              {errors.province && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.province.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remark
              </label>
              <input
                {...register("remark")}
                type="text"
                className="menubox-input w-full"
              />
            </div>
          </div>

          {/* Pricing Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal Price *
              </label>
              <input
                {...register("subtotalPrice", {
                  required: "Subtotal price is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Price must be positive" },
                })}
                type="number"
                step="0.01"
                className="menubox-input w-full"
              />
              {errors.subtotalPrice && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.subtotalPrice.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Price *
              </label>
              <input
                {...register("deliveryPrice", {
                  required: "Delivery price is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Price must be positive" },
                })}
                type="number"
                step="0.01"
                className="menubox-input w-full"
              />
              {errors.deliveryPrice && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.deliveryPrice.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Price *
              </label>
              <input
                {...register("totalPrice", {
                  required: "Total price is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Price must be positive" },
                })}
                type="number"
                step="0.01"
                className="menubox-input w-full"
              />
              {errors.totalPrice && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.totalPrice.message}
                </p>
              )}
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              {...register("isPaid")}
              className="menubox-input w-full"
              defaultValue={order?.isPaid ? "true" : "false"}
            >
              <option value="false">Unpaid</option>
              <option value="true">Paid</option>
            </select>
          </div>

          {/* Payment Proof */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Proof {!order && "*"}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
              className="menubox-input w-full"
            />
            {order?.paymentProofUrl && (
              <p className="text-sm text-gray-500 mt-1">
                Current payment proof will be kept if no new file is uploaded.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="menubox-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="menubox-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Saving..."
                : order
                ? "Update Order"
                : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
