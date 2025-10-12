"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { ordersAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { RefreshCw, CheckCircle, Package } from "lucide-react";

const ORDER_STATUSES = [
  { value: "PLACED", label: "Placed", color: "bg-blue-100 text-blue-800" },
  {
    value: "DELIVERING",
    label: "Delivering",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    color: "bg-green-100 text-green-800",
  },
  { value: "RETURNED", label: "Returned", color: "bg-red-100 text-red-800" },
];

export default function ChangeOrderStatusPage() {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [orderIds, setOrderIds] = useState("");
  const [loading, setLoading] = useState(false);

  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  const handleChangeStatus = async () => {
    if (!selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    if (!orderIds.trim()) {
      toast.error("Please enter order IDs");
      return;
    }

    const orderIdList = orderIds
      .split("\n")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (orderIdList.length === 0) {
      toast.error("Please enter valid order IDs");
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const orderId of orderIdList) {
        try {
          await ordersAPI.updateState(orderId, selectedStatus);
          successCount++;
        } catch (error: any) {
          errorCount++;
          const message =
            error.response?.data?.message ||
            `Failed to update order ${orderId}`;
          errors.push(`${orderId}: ${message}`);
        }
      }

      if (successCount > 0) {
        const statusLabel =
          ORDER_STATUSES.find((s) => s.value === selectedStatus)?.label ||
          selectedStatus;
        toast.success(
          `Successfully updated ${successCount} order(s) to ${statusLabel}`
        );
      }

      if (errorCount > 0) {
        toast.error(
          `Failed to update ${errorCount} order(s). Check console for details.`
        );
        console.error("Status update errors:", errors);
      }

      // Clear the form if all updates were successful
      if (errorCount === 0) {
        setOrderIds("");
        setSelectedStatus("");
      }
    } catch (error) {
      console.error("Bulk status update error:", error);
      toast.error("Failed to update order statuses");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* MenuBox-inspired Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Change Order Status
              </h1>
              <p className="text-gray-600">
                Bulk update the status of multiple orders at once.
              </p>
            </div>
          </div>

          {/* Status Change Form */}
          <div className="menubox-card p-6">
            <div className="space-y-6">
              {/* Status Selection */}
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Select New Status
                </label>
                <div className="relative">
                  <RefreshCw className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <select
                    id="status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="pl-10 input-field"
                    disabled={loading}
                  >
                    <option value="">Choose a status...</option>
                    {ORDER_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Preview */}
                {selectedStatus && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">
                      Selected status:{" "}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        ORDER_STATUSES.find((s) => s.value === selectedStatus)
                          ?.color
                      }`}
                    >
                      {
                        ORDER_STATUSES.find((s) => s.value === selectedStatus)
                          ?.label
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Order IDs Input */}
              <div>
                <label
                  htmlFor="orderIds"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Order IDs (one per line)
                </label>
                <textarea
                  id="orderIds"
                  value={orderIds}
                  onChange={(e) => setOrderIds(e.target.value)}
                  placeholder="Enter order IDs, one per line:&#10;ORD-000001&#10;ORD-000002&#10;ORD-000003"
                  rows={10}
                  className="input-field resize-none"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter each order ID on a new line. Empty lines will be
                  ignored.
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleChangeStatus}
                  disabled={loading || !selectedStatus || !orderIds.trim()}
                  className="menubox-button-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating Status...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Update Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Instructions:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Select the new status for the orders</li>
              <li>• Enter order IDs in the text area, one per line</li>
              <li>
                • All specified orders will be updated to the selected status
              </li>
              <li>• Invalid order IDs will be skipped and reported</li>
              <li>• Status changes are immediate and cannot be undone</li>
            </ul>
          </div>

          {/* Status Reference */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-3">
              Status Reference:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ORDER_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
