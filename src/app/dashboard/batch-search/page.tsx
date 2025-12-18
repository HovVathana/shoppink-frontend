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
  Copy,
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
      imageUrl?: string;
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

// Render option details helper
const renderOptionDetails = (od: any) => {
  const selections = Array.isArray(od) ? od : od?.selections;
  if (!selections || selections.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {selections.map((group: any, groupIndex: number) => (
        <div key={groupIndex} className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">{group.groupName}:</span>{" "}
          <span className="inline-flex flex-wrap gap-1">
            {group.selectedOptions.map((option: any, optionIndex: number) => (
              <span
                key={optionIndex}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                {option.name}
                {option.priceType === "FIXED" && option.priceValue && (
                  <span className="ml-1 text-green-600">
                    +${option.priceValue.toFixed(2)}
                  </span>
                )}
                {option.priceType === "PERCENTAGE" && option.priceValue && (
                  <span className="ml-1 text-green-600">
                    +{option.priceValue}%
                  </span>
                )}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function BatchSearchPage() {
  const [searchType, setSearchType] = useState<"id" | "phone">("id");
  const [orderIds, setOrderIds] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    const newDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc";

    setSortField(field);
    setSortDirection(newDirection);
  };

  const sortedResults = useMemo(() => {
    if (!sortField) return results;

    const withOrder = results.filter((r) => r.order);
    const withoutOrder = results.filter((r) => !r.order);

    const dir = sortDirection === "asc" ? 1 : -1;

    withOrder.sort((a, b) => {
      const oa = a.order!;
      const ob = b.order!;

      switch (sortField) {
        case "id":
          return oa.id.localeCompare(ob.id) * dir;

        case "orderAt":
          return (
            (new Date(oa.orderAt).getTime() - new Date(ob.orderAt).getTime()) *
            dir
          );

        case "customerName":
          return (
            (oa.customerName || "").localeCompare(ob.customerName || "") * dir
          );

        case "province":
          return (oa.province || "").localeCompare(ob.province || "") * dir;

        case "totalPrice":
          return (oa.totalPrice - ob.totalPrice) * dir;

        case "state":
          return oa.state.localeCompare(ob.state) * dir;

        default:
          return 0;
      }
    });

    // Keep error rows visible (on top)
    return [...withoutOrder, ...withOrder];
  }, [results, sortField, sortDirection]);

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

  const parsedPhones = useMemo(
    () =>
      phoneNumbers
        .split("\n")
        .map((phone) => phone.trim())
        .filter((phone) => phone.length > 0),
    [phoneNumbers]
  );

  const handleSearch = async () => {
    if (searchType === "id") {
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
    } else {
      // Phone number search
      if (parsedPhones.length === 0) {
        toast.error("Please enter phone numbers (one per line)");
        return;
      }

      setLoading(true);
      setSelectedOrders([]); // Clear selection on new search
      try {
        const response = await ordersAPI.batchSearchByPhone(parsedPhones);
        const orders = response.data.data.orders as Order[];

        // Map orders to result rows
        const resultMap = new Map<string, Order[]>();
        orders.forEach((order) => {
          if (!resultMap.has(order.customerPhone)) {
            resultMap.set(order.customerPhone, []);
          }
          resultMap.get(order.customerPhone)!.push(order);
        });

        // Create result rows grouped by phone
        const settled: ResultRow[] = [];
        parsedPhones.forEach((phone) => {
          // Normalize phone (add 0 if missing)
          const digitsOnly = phone.replace(/\D/g, "");
          const normalized = digitsOnly.startsWith("0")
            ? digitsOnly
            : "0" + digitsOnly;

          const matchingOrders = resultMap.get(normalized);
          if (matchingOrders && matchingOrders.length > 0) {
            matchingOrders.forEach((order) => {
              settled.push({ id: order.id, order });
            });
          } else {
            settled.push({
              id: phone,
              error: "No orders found for this phone number",
            });
          }
        });

        setResults(settled);

        const found = settled.filter((r) => r.order).length;
        const failed = settled.filter((r) => r.error).length;
        if (found) toast.success(`Found ${found} order(s)`);
        if (failed) toast.error(`${failed} phone number(s) with no orders`);
      } catch (e: any) {
        console.error(e);
        if (e?.response?.data?.invalidPhones) {
          const invalid = e.response.data.invalidPhones;
          toast.error(
            `Invalid phone numbers: ${invalid
              .map((i: any) => i.phone)
              .join(", ")}`
          );
        } else {
          toast.error(e?.response?.data?.message || "Search failed");
        }
      } finally {
        setLoading(false);
      }
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
    const validOrderIds = results.filter((r) => r.order).map((r) => r.id);

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

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    toast.success(`Copied: ${orderId}`);
  };

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
                <h1 className="text-3xl font-bold text-gray-900">
                  Batch Search
                </h1>
                <p className="text-gray-600">
                  Lookup many orders by{" "}
                  {searchType === "id" ? "ID" : "phone number"} at once.
                </p>
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
              {/* Search Type Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search By
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchType("id")}
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      searchType === "id"
                        ? "bg-gradient-to-r from-[#070B34] to-[#070B34] text-white shadow-sm"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } disabled:opacity-50`}
                  >
                    Order ID
                  </button>
                  <button
                    onClick={() => setSearchType("phone")}
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      searchType === "phone"
                        ? "bg-gradient-to-r from-[#070B34] to-[#070B34] text-white shadow-sm"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } disabled:opacity-50`}
                  >
                    Phone Number
                  </button>
                </div>
              </div>

              {/* Conditional Input */}
              {searchType === "id" ? (
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
              ) : (
                <div>
                  <label
                    htmlFor="phoneNumbers"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Phone Numbers (one per line)
                  </label>
                  <textarea
                    id="phoneNumbers"
                    value={phoneNumbers}
                    onChange={(e) => setPhoneNumbers(e.target.value)}
                    placeholder={
                      "Enter phone numbers, one per line:\n0123456789\n87654321\n012-345-6789"
                    }
                    rows={10}
                    className="input-field resize-none"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter each phone number on a new line. Phone numbers without
                    leading 0 will be normalized automatically.
                  </p>
                </div>
              )}

              {/* <div className="flex items-center gap-3">
                <button
                 
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Search className="w-4 h-4 mr-2" /> Search
                </button>
               
              </div> */}
              <div className="flex justify-end items-center gap-5">
                <span className="text-sm text-gray-600">
                  {searchType === "id"
                    ? `${parsedIds.length} ID(s)`
                    : `${parsedPhones.length} phone number(s)`}
                </span>
                <button
                  onClick={handleSearch}
                  disabled={
                    loading ||
                    (searchType === "id"
                      ? parsedIds.length === 0
                      : parsedPhones.length === 0)
                  }
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
            <div className="menubox-table">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="menubox-table-header">
                    <tr>
                      <th className="sticky left-0 z-20 px-2 sm:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
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

                      <th
                        className="lg:sticky left-10 z-20 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                        onClick={() => handleSort("id")}
                      >
                        <div className="flex items-center">
                          Order ID
                          {sortField === "id" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>

                      <th
                        className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[150px] cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("orderAt")}
                      >
                        <div className="flex items-center">
                          Order Date
                          {sortField === "orderAt" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>

                      <th
                        className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("customerName")}
                      >
                        <div className="flex items-center">
                          Customer Info
                          {sortField === "customerName" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>

                      <th
                        className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("province")}
                      >
                        <div className="flex items-center">
                          Location
                          {sortField === "province" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>

                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[250px]">
                        Products
                      </th>

                      <th
                        className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("totalPrice")}
                      >
                        <div className="flex items-center">
                          Pricing
                          {sortField === "totalPrice" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>

                      <th
                        className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("state")}
                      >
                        <div className="flex items-center">
                          Status
                          {sortField === "state" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>

                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Remarks
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedResults.map((r) => {
                      if (!r.order) {
                        return (
                          <tr key={r.id} className="bg-red-50">
                            <td className="sticky left-0 z-10 px-4 py-4 bg-red-50 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                              <span className="text-gray-300">-</span>
                            </td>
                            <td
                              className="lg:sticky left-10 z-10 px-4 py-4 bg-red-50 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                              colSpan={10}
                            >
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="font-mono">{r.id}</span>:{" "}
                                {r.error}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const order = r.order;
                      const stateInfo = getStateInfo(order.state);

                      return (
                        <tr
                          key={order.id}
                          className="table-row group hover:bg-gray-50"
                        >
                          <td className="sticky left-0 z-10 px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleSelectOrder(order.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>

                          <td className="lg:sticky left-10 z-10 px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                            {order.id}
                          </td>

                          <td className="px-4 py-4 min-w-[150px]">
                            {new Date(order.orderAt).toLocaleString()}
                          </td>

                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {order.customerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customerPhone}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">
                              {order.province}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customerLocation}
                            </div>
                          </td>

                          <td className="px-4 py-6 min-w-[250px]">
                            <div className="text-sm font-medium text-gray-900 mb-3">
                              {order.orderItems.length} item(s)
                            </div>
                            <div className="space-y-3">
                              {order.orderItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-start space-x-3 p-2 rounded-lg"
                                >
                                  {/* Product Image */}
                                  <div className="flex-shrink-0">
                                    <img
                                      src={
                                        item.product.imageUrl ||
                                        "/placeholder-product.png"
                                      }
                                      alt={item.product.name}
                                      className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "/placeholder-product.png";
                                      }}
                                    />
                                  </div>

                                  {/* Product Details */}
                                  <div className="flex-1 min-w-0 pr-10">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-medium text-gray-900 truncate">
                                        {item.product.name}
                                      </h4>
                                      <span className="text-sm font-medium text-gray-600 ml-2">
                                        ×{item.quantity}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      ${item.price.toFixed(2)} each
                                    </div>
                                    {renderOptionDetails(item.optionDetails)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            ${order.totalPrice.toFixed(2)}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stateInfo.color}`}
                            >
                              {stateInfo.label}
                            </span>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {order.creator?.name || "N/A"}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {order.driver?.name || "Unassigned"}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {order.remark || "No remarks"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
