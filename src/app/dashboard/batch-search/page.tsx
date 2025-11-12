"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { ordersAPI } from "@/lib/api";
import OrdersExcelExport from "@/components/Orders/OrdersExcelExport";
import toast from "react-hot-toast";
import {
  Search,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  province: string;
  remark?: string;
  state: string;
  subtotalPrice: number;
  deliveryPrice: number;
  companyDeliveryPrice: number;
  totalPrice: number;
  isPaid: boolean;
  isPrinted: boolean;
  orderAt: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  returnedAt?: string;
  updatedAt: string;
  driverId?: string;
  createdBy: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      name: string;
    };
    optionDetails?: any;
  }>;
}

interface ResultRow {
  id: string;
  order?: Order;
  error?: string;
}

const ORDER_STATES = [
  {
    value: "PLACED",
    label: "Placed",
    icon: Clock,
    color: "text-yellow-600 bg-yellow-100",
  },
  {
    value: "DELIVERING",
    label: "Delivering",
    icon: Truck,
    color: "text-blue-600 bg-blue-100",
  },
  {
    value: "RETURNED",
    label: "Returned",
    icon: XCircle,
    color: "text-red-600 bg-red-100",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-600 bg-green-100",
  },
];

const getStateInfo = (state: string) =>
  ORDER_STATES.find((s) => s.value === state) || ORDER_STATES[0];

export default function BatchSearchPage() {
  const [orderIds, setOrderIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  const parsedIds = useMemo(
    () =>
      orderIds
        .split("\n")
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    [orderIds]
  );

  const handleSearch = async () => {
    if (parsedIds.length === 0) {
      toast.error("Please enter order IDs (one per line)");
      return;
    }

    setLoading(true);
    setSelectedOrders([]); // Clear selection on new search
    try {
      const requests: Promise<ResultRow>[] = parsedIds.map((id) =>
        ordersAPI
          .getById(id)
          .then((res) => ({ id, order: res.data.order as Order }))
          .catch((err) => ({
            id,
            error:
              err?.response?.data?.message ||
              "Order not found or failed to load",
          }))
      );

      const settled: ResultRow[] = await Promise.all(requests);
      setResults(settled);

      const found = settled.filter((r) => r.order).length;
      const failed = settled.filter((r) => r.error).length;
      if (found) toast.success(`Found ${found} order(s)`);
      if (failed) toast.error(`Failed ${failed} order(s)`);
    } catch (e) {
      console.error(e);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    const validOrderIds = results
      .filter((r) => r.order)
      .map((r) => r.id);

    if (selectedOrders.length === validOrderIds.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(validOrderIds);
    }
  };

  const getSelectedOrdersData = () => {
    return results
      .filter((r) => r.order && selectedOrders.includes(r.id))
      .map((r) => r.order!);
  };

  const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString() : "-";

  return (
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Batch Search</h1>
                <p className="text-gray-600">Lookup many orders by ID at once.</p>
                {selectedOrders.length > 0 && (
                  <p className="mt-1 text-sm text-blue-600 font-medium">
                    {selectedOrders.length} order(s) selected
                  </p>
                )}
              </div>
            </div>
            {selectedOrders.length > 0 && (
              <div className="flex gap-2">
                <OrdersExcelExport
                  orders={getSelectedOrdersData()}
                  title="Batch Search Orders"
                />
              </div>
            )}
          </div>

          {/* Input Card */}
          <div className="menubox-card p-6 mb-8">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="orderIds"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Order IDs (one per line)
                </label>
                <textarea
                  id="orderIds"
                  value={orderIds}
                  onChange={(e) => setOrderIds(e.target.value)}
                  placeholder={
                    "Enter order IDs, one per line:\nSP3108251430A1B2C\nSP3108251432X9Y8Z"
                  }
                  rows={10}
                  className="input-field resize-none"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter each order ID on a new line. Empty lines will be
                  ignored.
                </p>
              </div>

              {/* <div className="flex items-center gap-3">
                <button
                 
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Search className="w-4 h-4 mr-2" /> Search
                </button>
               
              </div> */}
              <div className="flex justify-end items-center gap-5">
                <span className="text-sm text-gray-600">
                  {parsedIds.length} ID(s)
                </span>
                <button
                  onClick={handleSearch}
                  disabled={loading || parsedIds.length === 0}
                  className="menubox-button-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" /> Search
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="menubox-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={
                            results.filter((r) => r.order).length > 0 &&
                            selectedOrders.length ===
                              results.filter((r) => r.order).length
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Create Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed Date
                      </th>{" "}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Returned Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pricing
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        State
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {r.order ? (
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(r.id)}
                              onChange={() => handleSelectOrder(r.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-900">
                          {r.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.order ? formatDateTime(r.order.createdAt) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.order ? formatDateTime(r.order.assignedAt) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.order ? formatDateTime(r.order.completedAt) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.order ? formatDateTime(r.order.returnedAt) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.order
                            ? `${r.order.customerLocation || ""}${
                                r.order.province ? ", " + r.order.province : ""
                              }`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.order ? (
                            <div className="space-y-0.5">
                              <div>
                                <span className="text-gray-500">Subtotal:</span>{" "}
                                ${r.order.subtotalPrice.toFixed(2)}
                              </div>
                              <div>
                                <span className="text-gray-500">Delivery:</span>{" "}
                                ${r.order.deliveryPrice.toFixed(2)}
                              </div>
                              <div>
                                <span className="text-gray-500">Company:</span>{" "}
                                ${r.order.companyDeliveryPrice.toFixed(2)}
                              </div>
                              <div className="font-semibold">
                                <span className="text-gray-600">Total:</span> $
                                {r.order.totalPrice.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.order?.driver ? (
                            <div>
                              <div className="font-medium text-gray-900">
                                {r.order.driver.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {r.order.driver.phone}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.order ? (
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                getStateInfo(r.order.state).color
                              }`}
                            >
                              {getStateInfo(r.order.state).label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <AlertTriangle className="w-4 h-4" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Error list */}
              {results.some((r) => r.error) && (
                <div className="border-t p-4 bg-amber-50">
                  <div className="text-sm font-medium text-amber-800 mb-2">
                    Errors
                  </div>
                  <ul className="text-sm text-amber-800 list-disc pl-5 space-y-1">
                    {results
                      .filter((r) => r.error)
                      .map((r) => (
                        <li key={`err-${r.id}`}>
                          <span className="font-mono">{r.id}</span>: {r.error}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
