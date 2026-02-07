"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  User,
  Phone,
  MapPin,
  X,
  ShoppingCart,
} from "lucide-react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { customerOrdersAPI, ordersAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { usePageState } from "@/contexts/PageStateContext";
import { useBlacklist } from "@/contexts/BlacklistContext";
import { useDrivers } from "@/contexts/DriversContext";
import CustomerOrderModal from "@/components/Orders/CustomerOrderModal";
import { cache } from "@/utils/simpleCache";
import { copyToClipboard, formatOrderIdForDisplay } from "@/utils/clipboard";
import OrdersPDFExport from "@/components/Orders/OrdersPDFExport";
import OrdersExcelExport from "@/components/Orders/OrdersExcelExport";
import PrintStatusCell from "@/components/Orders/PrintStatusCell";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  province: string;
  remark?: string;
  state: string;
  subtotalPrice: number;
  companyDeliveryPrice: number;
  deliveryPrice: number;
  totalPrice: number;
  orderSource: string;
  isPaid: boolean;
  isPrinted: boolean;
  paymentProofUrl?: string;
  orderAt: string;
  assignedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  driverId?: string;
  deletedDriverName?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    isActive: boolean;
  };
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    optionDetails?:
      | {
          variantId?: string;
          selections: Array<{
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
        }
      | Array<{
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
    product: {
      id: string;
      name: string;
      imageUrl: string;
    };
  }>;
}

// Render option details for both legacy array shape and new {variantId, selections}
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

const ORDER_STATES = [
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
  {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
  },
];

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const { canEditOrders } = usePermissions();
  const { blacklistSet, normalizePhone } = useBlacklist();
  const { drivers, activeDrivers, refreshDrivers } = useDrivers();
  const { customerOrdersPageState, updateCustomerOrdersPageState } =
    usePageState();

  // Use persistent state from context
  const searchTerm = customerOrdersPageState.searchTerm;
  const selectedState = customerOrdersPageState.selectedState;
  const selectedProvince = customerOrdersPageState.selectedProvince;
  const selectedDriver = customerOrdersPageState.selectedDriver;
  const sortField = customerOrdersPageState.sortField;
  const sortDirection = customerOrdersPageState.sortDirection;
  const currentPage = customerOrdersPageState.currentPage;
  const dateFrom = customerOrdersPageState.dateFrom;
  const dateTo = customerOrdersPageState.dateTo;
  const itemsPerPage = customerOrdersPageState.itemsPerPage;

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrderForView, setSelectedOrderForView] =
    useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] =
    useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Quick functions state
  const [showQuickFunctions, setShowQuickFunctions] = useState(false);
  const [quickFunctionResult, setQuickFunctionResult] = useState<any>(null);
  const [duplicatePhones, setDuplicatePhones] = useState<any[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Fetch customer orders when dates change
  const fetchOrders = useCallback(
    async (forceRefresh = false) => {
      if (!dateFrom || !dateTo) return;

      const cacheKey = `customer-orders-${dateFrom}-${dateTo}`;

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedOrders = cache.get<Order[]>(cacheKey, 5); // 5 minutes cache
        if (cachedOrders) {
          setAllOrders(cachedOrders);
          setOrdersLoading(false);
          return;
        }
      }

      setOrdersLoading(true);
      try {
        const params: any = {
          dateFrom,
          dateTo,
          limit: 1000000, // Fetch all orders within date range
        };
        const response = await customerOrdersAPI.getAll(params);
        const orders = response.data.orders || [];

        // Cache the results
        cache.set(cacheKey, orders, 5); // 5 minutes cache
        setAllOrders(orders);
      } catch (error) {
        console.error("Failed to fetch customer orders:", error);
        toast.error("Failed to load customer orders");
      } finally {
        setOrdersLoading(false);
      }
    },
    [dateFrom, dateTo]
  );

  // Set default sort order on mount
  useEffect(() => {
    updateCustomerOrdersPageState({
      sortField: "orderAt",
      sortDirection: "asc",
    });
  }, []);

  // Fetch data when component mounts or dates change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Frontend filtering and sorting
  useEffect(() => {
    let filtered = [...allOrders];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customerPhone
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.customerLocation
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.province.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by state
    if (selectedState) {
      filtered = filtered.filter((order) => order.state === selectedState);
    }

    // Filter by province
    if (selectedProvince) {
      if (selectedProvince === "Phnom Penh") {
        filtered = filtered.filter((order) => order.province === "Phnom Penh");
      } else if (selectedProvince === "Province") {
        filtered = filtered.filter((order) => order.province !== "Phnom Penh");
      }
    }

    // Filter by driver
    if (selectedDriver) {
      if (selectedDriver === "unassigned") {
        filtered = filtered.filter((order) => !order.driver?.id);
      } else {
        filtered = filtered.filter(
          (order) => order.driver?.id === selectedDriver
        );
      }
    }

    // Sort orders
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof Order];
      let bValue: any = b[sortField as keyof Order];

      if (sortField === "customerName") {
        aValue = a.customerName;
        bValue = b.customerName;
      } else if (sortField === "orderAt") {
        aValue = new Date(a.orderAt);
        bValue = new Date(b.orderAt);
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredOrders(filtered);
  }, [
    allOrders,
    searchTerm,
    selectedState,
    selectedProvince,
    selectedDriver,
    sortField,
    sortDirection,
    dateFrom,
    dateTo,
  ]);

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      updateCustomerOrdersPageState({ currentPage: 1 });
    }
  }, [
    filteredOrders.length,
    itemsPerPage,
    currentPage,
    updateCustomerOrdersPageState,
  ]);

  const handleSort = (field: string) => {
    const newDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc";
    updateCustomerOrdersPageState({
      sortField: field,
      sortDirection: newDirection,
    });
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    const currentPageOrders = filteredOrders.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    const allSelected = currentPageOrders.every((order) =>
      selectedOrders.includes(order.id)
    );

    if (allSelected) {
      setSelectedOrders((prev) =>
        prev.filter((id) => !currentPageOrders.map((o) => o.id).includes(id))
      );
    } else {
      setSelectedOrders((prev) => [
        ...prev,
        ...currentPageOrders
          .map((o) => o.id)
          .filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const handleStateUpdate = async (orderId: string, newState: string) => {
    try {
      // Optimistic update to prevent table reset
      setAllOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, state: newState } : order
        )
      );

      await ordersAPI.updateState(orderId, newState);
      toast.success("Order state updated successfully");
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to update order state";
      toast.error(message);
      // Revert optimistic update on error
      refreshOrders();
    }
  };

  const handleDriverAssignment = async (orderId: string, driverId: string) => {
    try {
      // Find the driver object from the drivers list
      const selectedDriver = driverId
        ? drivers.find((d: any) => d.id === driverId)
        : null;

      // Optimistic update to prevent table reset
      setAllOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                driverId: driverId || undefined,
                driver: selectedDriver || undefined,
                deletedDriverName: undefined, // Clear deleted driver name when assigning new driver
                // Automatically change status to DELIVERING when driver is assigned, PLACED when unassigned
                state: driverId ? "DELIVERING" : "PLACED",
                assignedAt: driverId ? new Date().toISOString() : undefined,
              }
            : order
        )
      );

      await ordersAPI.assignDriver(orderId, driverId || null);
      toast.success("Driver assignment updated successfully");
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to assign driver";
      toast.error(message);
      // Revert optimistic update on error
      refreshOrders();
    }
  };

  const refreshOrders = () => {
    fetchOrders(true); // Force refresh
    refreshDrivers(); // Refresh drivers from context
  };

  const getSelectedOrdersData = () => {
    return allOrders.filter((order: Order) =>
      selectedOrders.includes(order.id)
    );
  };

  // ============ QUICK FUNCTIONS SYSTEM ============
  // Modular quick functions - easy to add/remove

  // Quick function: Find duplicate phone numbers
  const findDuplicatePhones = () => {
    const phoneGroups = new Map();

    filteredOrders.forEach((order) => {
      const phone = order.customerPhone;
      if (!phoneGroups.has(phone)) {
        phoneGroups.set(phone, []);
      }
      phoneGroups.get(phone).push(order);
    });

    const duplicates = Array.from(phoneGroups.entries())
      .filter(([phone, orders]) => orders.length > 1)
      .map(([phone, orders]) => ({
        phone,
        count: orders.length,
        orders: orders.sort(
          (a: any, b: any) =>
            new Date(b.orderAt).getTime() - new Date(a.orderAt).getTime()
        ),
      }))
      .sort((a, b) => b.count - a.count);

    setDuplicatePhones(duplicates);
    setShowDuplicates(true);
    toast.success(`Found ${duplicates.length} duplicate phone numbers`);
  };

  // Quick function: Find orders by customer name
  const findOrdersByCustomer = () => {
    const customerName = prompt("Enter customer name to search:");
    if (!customerName) return;

    const matchingOrders = filteredOrders.filter((order) =>
      order.customerName.toLowerCase().includes(customerName.toLowerCase())
    );

    setQuickFunctionResult({
      title: `Customer Orders for "${customerName}"`,
      data: matchingOrders,
      type: "orders",
    });
    toast.success(`Found ${matchingOrders.length} orders for ${customerName}`);
  };

  // Quick function: Find high-value orders
  const findHighValueOrders = () => {
    const threshold = prompt("Enter minimum order value (e.g., 100):");
    if (!threshold || isNaN(Number(threshold))) return;

    const highValueOrders = filteredOrders
      .filter((order) => order.totalPrice >= Number(threshold))
      .sort((a, b) => b.totalPrice - a.totalPrice);

    setQuickFunctionResult({
      title: `Customer Orders above $${threshold}`,
      data: highValueOrders,
      type: "orders",
    });
    toast.success(`Found ${highValueOrders.length} high-value customer orders`);
  };

  // Quick function: Find top spending customers
  const findTopSpendingCustomers = () => {
    const customerSpending = new Map();

    filteredOrders.forEach((order) => {
      const key = `${order.customerName}-${order.customerPhone}`;
      if (!customerSpending.has(key)) {
        customerSpending.set(key, {
          name: order.customerName,
          phone: order.customerPhone,
          totalSpent: 0,
          orderCount: 0,
          orders: [],
        });
      }
      const customer = customerSpending.get(key);
      customer.totalSpent += order.totalPrice;
      customer.orderCount += 1;
      customer.orders.push(order);
    });

    const topCustomers = Array.from(customerSpending.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    setQuickFunctionResult({
      title: "Top Spending Customers",
      data: topCustomers,
      type: "customers",
    });
    toast.success(`Found top ${topCustomers.length} spending customers`);
  };

  // Quick function: Find orders by location
  const findOrdersByLocation = () => {
    const location = prompt("Enter location or province to search:");
    if (!location) return;

    const matchingOrders = filteredOrders.filter(
      (order) =>
        order.customerLocation.toLowerCase().includes(location.toLowerCase()) ||
        order.province.toLowerCase().includes(location.toLowerCase())
    );

    setQuickFunctionResult({
      title: `Customer Orders in "${location}"`,
      data: matchingOrders,
      type: "orders",
    });
    toast.success(
      `Found ${matchingOrders.length} customer orders in ${location}`
    );
  };

  // Quick function: Find recent orders (last 24 hours)
  const findRecentOrders = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentOrders = filteredOrders
      .filter((order) => new Date(order.orderAt) >= yesterday)
      .sort(
        (a, b) => new Date(b.orderAt).getTime() - new Date(a.orderAt).getTime()
      );

    setQuickFunctionResult({
      title: "Recent Customer Orders (Last 24 Hours)",
      data: recentOrders,
      type: "orders",
    });
    toast.success(`Found ${recentOrders.length} recent customer orders`);
  };

  // Quick function: Find orders with payment proof
  const findOrdersWithPaymentProof = () => {
    const ordersWithProof = filteredOrders.filter(
      (order) => order.paymentProofUrl
    );

    setQuickFunctionResult({
      title: "Orders with Payment Proof",
      data: ordersWithProof,
      type: "orders",
    });
    toast.success(`Found ${ordersWithProof.length} orders with payment proof`);
  };

  // Quick function: Find orders without payment proof
  const findOrdersWithoutPaymentProof = () => {
    const ordersWithoutProof = filteredOrders.filter(
      (order) => !order.paymentProofUrl
    );

    setQuickFunctionResult({
      title: "Orders without Payment Proof",
      data: ordersWithoutProof,
      type: "orders",
    });
    toast.success(
      `Found ${ordersWithoutProof.length} orders without payment proof`
    );
  };

  // Quick function: Find orders by driver
  const findOrdersByDriver = () => {
    const driverName = prompt("Enter driver name to search:");
    if (!driverName) return;

    const matchingOrders = filteredOrders.filter((order) =>
      order.driver?.name.toLowerCase().includes(driverName.toLowerCase())
    );

    setQuickFunctionResult({
      title: `Customer Orders by Driver "${driverName}"`,
      data: matchingOrders,
      type: "orders",
    });
    toast.success(`Found ${matchingOrders.length} orders by ${driverName}`);
  };

  // Quick function: Find unassigned orders
  const findUnassignedOrders = () => {
    const unassignedOrders = filteredOrders.filter(
      (order) => !order.driver?.id
    );

    setQuickFunctionResult({
      title: "Unassigned Customer Orders",
      data: unassignedOrders,
      type: "orders",
    });
    toast.success(`Found ${unassignedOrders.length} unassigned orders`);
  };

  // Quick function: Find recent assignments (last 24 hours)
  const findRecentAssignments = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentAssignments = filteredOrders
      .filter(
        (order) => order.assignedAt && new Date(order.assignedAt) >= yesterday
      )
      .sort(
        (a, b) =>
          new Date(b.assignedAt!).getTime() - new Date(a.assignedAt!).getTime()
      );

    setQuickFunctionResult({
      title: "Recent Driver Assignments (Last 24 Hours)",
      data: recentAssignments,
      type: "orders",
    });
    toast.success(`Found ${recentAssignments.length} recent assignments`);
  };

  // ============ END QUICK FUNCTIONS ============

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".quick-functions-dropdown")) {
        setShowQuickFunctions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteOrder = async (order: Order) => {
    if (
      !window.confirm(
        `Are you sure you want to delete order ${order.id}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await customerOrdersAPI.delete(order.id);
      toast.success("Order deleted successfully");
      fetchOrders();
      setOrderToDelete(null);
    } catch (error) {
      console.error("Failed to delete order:", error);
      toast.error("Failed to delete order");
    }
  };

  const getStateInfo = (state: string) => {
    return ORDER_STATES.find((s) => s.value === state) || ORDER_STATES[0];
  };

  if (ordersLoading || !dateFrom || !dateTo) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          {!dateFrom || !dateTo ? (
            <p className="ml-4 text-gray-600">
              Please select date range to load orders
            </p>
          ) : null}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* MenuBox-inspired Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Customer Orders
                </h1>
                <p className="text-gray-600">
                  Manage orders placed by customers through the online store
                </p>
                {selectedOrders.length > 0 && (
                  <p className="mt-1 text-sm text-blue-600 font-medium">
                    {selectedOrders.length} order(s) selected
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {/* Mobile: Row 1 - Refresh (50%) + Quick Functions (50%) | Desktop: All buttons in one row */}
              <div className="sm:hidden grid grid-cols-2 gap-2">
                <button
                  onClick={refreshOrders}
                  disabled={ordersLoading}
                  className="menubox-button-secondary flex items-center justify-center space-x-2 px-4 py-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${ordersLoading ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>

                <div className="relative quick-functions-dropdown">
                  <button
                    onClick={() => setShowQuickFunctions(!showQuickFunctions)}
                    className="menubox-button-secondary flex items-center justify-center space-x-2 px-4 py-2 w-full"
                  >
                    <span>⚡</span>
                    <span>Quick</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {showQuickFunctions && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            findDuplicatePhones();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🔍 Find Duplicate Phone Numbers
                        </button>
                        <button
                          onClick={() => {
                            findOrdersByCustomer();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          👤 Find by Customer Name
                        </button>
                        <button
                          onClick={() => {
                            findHighValueOrders();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          💰 Find High-Value Orders
                        </button>
                        <button
                          onClick={() => {
                            findTopSpendingCustomers();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🏆 Top Spending Customers
                        </button>
                        <button
                          onClick={() => {
                            findOrdersByDriver();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🚚 Find by Driver
                        </button>
                        <button
                          onClick={() => {
                            findUnassignedOrders();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📋 Find Unassigned Orders
                        </button>
                        <button
                          onClick={() => {
                            findOrdersByLocation();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📍 Find by Location
                        </button>
                        <button
                          onClick={() => {
                            findRecentAssignments();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🕒 Recent Assignments (24h)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop: All buttons in one row */}
              <div className="hidden sm:flex flex-wrap gap-2">
                <button
                  onClick={refreshOrders}
                  disabled={ordersLoading}
                  className="menubox-button-secondary flex items-center space-x-2 px-4 py-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${ordersLoading ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>

                <div className="relative quick-functions-dropdown">
                  <button
                    onClick={() => setShowQuickFunctions(!showQuickFunctions)}
                    className="menubox-button-secondary flex items-center space-x-2 px-4 py-2"
                  >
                    <span>⚡</span>
                    <span>Quick Functions</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {showQuickFunctions && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            findDuplicatePhones();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🔍 Find Duplicate Phone Numbers
                        </button>
                        <button
                          onClick={() => {
                            findOrdersByCustomer();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          👤 Find by Customer Name
                        </button>
                        <button
                          onClick={() => {
                            findHighValueOrders();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          💰 Find High-Value Orders
                        </button>
                        <button
                          onClick={() => {
                            findTopSpendingCustomers();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🏆 Top Spending Customers
                        </button>
                        <button
                          onClick={() => {
                            findOrdersByDriver();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🚚 Find by Driver
                        </button>
                        <button
                          onClick={() => {
                            findUnassignedOrders();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📋 Find Unassigned Orders
                        </button>
                        <button
                          onClick={() => {
                            findOrdersByLocation();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📍 Find by Location
                        </button>
                        <button
                          onClick={() => {
                            findRecentAssignments();
                            setShowQuickFunctions(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🕒 Recent Assignments (24h)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Export Buttons - Third Row (Mobile) / Same Row (Desktop) */}
              {selectedOrders.length > 0 && (
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <OrdersPDFExport
                    orders={getSelectedOrdersData()}
                    title="Customer Orders"
                    isAssigned={false}
                  />
                  <OrdersExcelExport
                    orders={getSelectedOrdersData()}
                    title="Customer Orders"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="menubox-card mb-6">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customer orders..."
                  value={searchTerm}
                  onChange={(e) =>
                    updateCustomerOrdersPageState({
                      searchTerm: e.target.value,
                    })
                  }
                  className="menubox-input pl-10 w-full"
                />
              </div>
            </div>

            {/* Filter Controls */}
            <div className="p-4">
              {/* Mobile: Compact layout */}
              <div className="block md:hidden">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <select
                    value={selectedState}
                    onChange={(e) =>
                      updateCustomerOrdersPageState({
                        selectedState: e.target.value,
                      })
                    }
                    className="menubox-input text-sm"
                  >
                    <option value="">All States</option>
                    {ORDER_STATES.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedProvince}
                    onChange={(e) =>
                      updateCustomerOrdersPageState({
                        selectedProvince: e.target.value,
                      })
                    }
                    className="menubox-input text-sm"
                  >
                    <option value="">All Locations</option>
                    <option value="Phnom Penh">Phnom Penh</option>
                    <option value="Province">Province</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <select
                    value={selectedDriver}
                    onChange={(e) =>
                      updateCustomerOrdersPageState({
                        selectedDriver: e.target.value,
                      })
                    }
                    className="menubox-input text-sm"
                  >
                    <option value="">All Drivers</option>
                    <option value="unassigned">Unassigned</option>
                    {drivers.map((driver: any) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={itemsPerPage}
                    onChange={(e) =>
                      updateCustomerOrdersPageState({
                        itemsPerPage: parseInt(e.target.value),
                        currentPage: 1,
                      })
                    }
                    className="menubox-input text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) =>
                      updateCustomerOrdersPageState({
                        dateFrom: e.target.value,
                      })
                    }
                    className="menubox-input text-sm"
                    placeholder="From Date"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) =>
                      updateCustomerOrdersPageState({ dateTo: e.target.value })
                    }
                    className="menubox-input text-sm"
                    placeholder="To Date"
                  />
                </div>
              </div>

              {/* Desktop: Original layout */}
              <div className="hidden md:block">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) =>
                        updateCustomerOrdersPageState({
                          selectedState: e.target.value,
                        })
                      }
                      className="menubox-input w-full"
                    >
                      <option value="">All States</option>
                      {ORDER_STATES.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <select
                      value={selectedProvince}
                      onChange={(e) =>
                        updateCustomerOrdersPageState({
                          selectedProvince: e.target.value,
                        })
                      }
                      className="menubox-input w-full"
                    >
                      <option value="">All Locations</option>
                      <option value="Phnom Penh">Phnom Penh</option>
                      <option value="Province">Province</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver
                    </label>
                    <select
                      value={selectedDriver}
                      onChange={(e) =>
                        updateCustomerOrdersPageState({
                          selectedDriver: e.target.value,
                        })
                      }
                      className="menubox-input w-full"
                    >
                      <option value="">All Drivers</option>
                      <option value="unassigned">Unassigned</option>
                      {drivers.map((driver: any) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Items per page
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) =>
                        updateCustomerOrdersPageState({
                          itemsPerPage: parseInt(e.target.value),
                          currentPage: 1,
                        })
                      }
                      className="menubox-input w-full"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Date Range - Desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) =>
                        updateCustomerOrdersPageState({
                          dateFrom: e.target.value,
                        })
                      }
                      className="menubox-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) =>
                        updateCustomerOrdersPageState({
                          dateTo: e.target.value,
                        })
                      }
                      className="menubox-input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-700">
                  Total: {filteredOrders.length} orders
                </span>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>
                    Page {currentPage} of{" "}
                    {Math.ceil(filteredOrders.length / itemsPerPage)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="menubox-table">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="menubox-table-header">
                  <tr>
                    <th className="sticky left-0 z-20 px-2 sm:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                      <input
                        type="checkbox"
                        checked={
                          filteredOrders.slice(
                            (currentPage - 1) * itemsPerPage,
                            currentPage * itemsPerPage
                          ).length > 0 &&
                          filteredOrders
                            .slice(
                              (currentPage - 1) * itemsPerPage,
                              currentPage * itemsPerPage
                            )
                            .every((order) => selectedOrders.includes(order.id))
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th
                      className="lg:sticky left-10 z-20 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50 border-r border-gray-200 min-w-[140px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
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
                      className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Pricing
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Payment Proof
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    )
                    .map((order: Order) => {
                      const stateInfo = getStateInfo(order.state);
                      return (
                        <tr
                          key={order.id}
                          className="table-row group hover:bg-gray-50"
                        >
                          {/* Checkbox - Sticky Column */}
                          <td className="sticky left-0 z-10 px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleSelectOrder(order.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>

                          {/* Order ID - Sticky Column */}
                          <td className="lg:sticky left-10 z-10 px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50 border-r border-gray-200 min-w-[150px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                            <PrintStatusCell
                              orderId={order.id}
                              isPrinted={order.isPrinted}
                              onPrintStatusChange={refreshOrders}
                              canResetPrintStatus={canEditOrders()}
                            />
                          </td>

                          {/* Order Date */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(order.orderAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(order.orderAt).toLocaleTimeString()}
                            </div>
                          </td>

                          {/* Customer Info */}
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {order.customerName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <a
                                href={`tg://resolve?phone=${order.customerPhone.replace(
                                  /[^0-9+]/g,
                                  ""
                                )}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                                title="Open in Telegram"
                              >
                                {order.customerPhone}
                              </a>
                              {blacklistSet.has(
                                normalizePhone(order.customerPhone)
                              ) && (
                                <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                  Blacklisted
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">
                              {order.province}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-32">
                              {order.customerLocation}
                            </div>
                          </td>

                          {/* Products */}
                          <td className="px-4 py-6 whitespace-nowrap">
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

                                    {/* Show option details if available */}
                                    {renderOptionDetails(item.optionDetails)}
                                  </div>
                                </div>
                              ))}
                              {/* {order.orderItems.length > 3 && (
                                <div className="text-xs text-gray-400 text-center py-2 bg-gray-50 rounded-lg">
                                  +{order.orderItems.length - 3} more items...
                                </div>
                              )} */}
                            </div>
                          </td>

                          {/* Pricing */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              Total: ${order.totalPrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Subtotal: ${order.subtotalPrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Delivery: ${order.deliveryPrice.toFixed(2)}
                            </div>
                            <div className="mt-1">
                              <span
                                className={`${
                                  order.isPaid
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-700"
                                } inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium`}
                              >
                                {order.isPaid ? "Paid" : "Unpaid"}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <select
                              value={order.state}
                              onChange={(e) =>
                                handleStateUpdate(order.id, e.target.value)
                              }
                              className={`table-dropdown text-xs font-medium px-2 py-1 border-0 ${stateInfo.color}`}
                            >
                              {ORDER_STATES.map((state) => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Driver */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            {order.deletedDriverName && (
                              <div className="text-xs text-red-600 italic mb-1">
                                Deleted Driver: {order.deletedDriverName}
                              </div>
                            )}
                            {/* {order.driver && !order.driver.isActive && (
                              <div className="text-xs text-orange-600 italic mb-1">
                                ⚠️ {order.driver.name} (Inactive)
                              </div>
                            )} */}
                            <select
                              value={order.driver?.id || ""}
                              onChange={(e) =>
                                handleDriverAssignment(order.id, e.target.value)
                              }
                              className="text-xs font-medium px-2 py-1 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Unassigned</option>
                              {/* Active Drivers */}
                              {activeDrivers.map((driver: any) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.name}
                                </option>
                              ))}
                              {/* Inactive Drivers */}
                              {drivers
                                .filter((d: any) => !d.isActive)
                                .map((driver: any) => (
                                  <option key={driver.id} value={driver.id}>
                                    {driver.name} (Inactive)
                                  </option>
                                ))}
                            </select>
                            {order.driver?.phone && (
                              <div className="text-xs text-gray-500 mt-1">
                                {order.driver.phone}
                              </div>
                            )}
                          </td>

                          {/* Payment Proof */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {order.paymentProofUrl ? (
                                <a
                                  href={order.paymentProofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-900 text-xs"
                                >
                                  View Proof
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs">
                                  No proof
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setSelectedOrderForView(order)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setSelectedOrderForEdit(order)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Edit Order"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete Order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {Math.ceil(filteredOrders.length / itemsPerPage) > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() =>
                      updateCustomerOrdersPageState({
                        currentPage: currentPage - 1,
                      })
                    }
                    disabled={currentPage <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      updateCustomerOrdersPageState({
                        currentPage: currentPage + 1,
                      })
                    }
                    disabled={
                      currentPage >=
                      Math.ceil(filteredOrders.length / itemsPerPage)
                    }
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {(currentPage - 1) * itemsPerPage + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(
                          currentPage * itemsPerPage,
                          filteredOrders.length
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">
                        {filteredOrders.length}
                      </span>{" "}
                      results
                    </p>
                    <p className="text-sm text-gray-500">
                      Page{" "}
                      <span className="font-medium text-gray-700">
                        {currentPage}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-gray-700">
                        {Math.ceil(filteredOrders.length / itemsPerPage)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() =>
                          updateCustomerOrdersPageState({
                            currentPage: currentPage - 1,
                          })
                        }
                        disabled={currentPage <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          updateCustomerOrdersPageState({
                            currentPage: currentPage + 1,
                          })
                        }
                        disabled={
                          currentPage >=
                          Math.ceil(filteredOrders.length / itemsPerPage)
                        }
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order View Modal */}
          {selectedOrderForView && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Order Details - {selectedOrderForView.id}
                    </h3>
                    <button
                      onClick={() => setSelectedOrderForView(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Customer Information
                        </h4>
                        <p className="text-sm text-gray-600">
                          Name: {selectedOrderForView.customerName}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <span>
                            Phone:
                            <a
                              href={`tg://resolve?phone=${selectedOrderForView.customerPhone.replace(
                                /[^0-9+]/g,
                                ""
                              )}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                              title="Open in Telegram"
                            >
                              {selectedOrderForView.customerPhone}
                            </a>
                          </span>
                          {blacklistSet.has(
                            normalizePhone(selectedOrderForView.customerPhone)
                          ) && (
                            <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded">
                              Blacklisted
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          Location: {selectedOrderForView.customerLocation}
                        </p>
                        <p className="text-sm text-gray-600">
                          Province: {selectedOrderForView.province}
                        </p>
                        {selectedOrderForView.remark && (
                          <p className="text-sm text-gray-600">
                            Remarks: {selectedOrderForView.remark}
                          </p>
                        )}
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900">
                          Order Information
                        </h4>
                        <p className="text-sm text-gray-600">
                          Status:{" "}
                          {getStateInfo(selectedOrderForView.state).label}
                        </p>
                        <p className="text-sm text-gray-600">
                          Total: ${selectedOrderForView.totalPrice.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Order Date:{" "}
                          {new Date(
                            selectedOrderForView.orderAt
                          ).toLocaleString()}
                        </p>
                        {selectedOrderForView.paymentProofUrl && (
                          <a
                            href={selectedOrderForView.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:text-indigo-900"
                          >
                            View Payment Proof
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Order Items
                      </h4>
                      <div className="space-y-2">
                        {selectedOrderForView.orderItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center">
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                className="w-10 h-10 object-cover rounded mr-3"
                              />
                              <div>
                                <p className="text-sm font-medium">
                                  {item.product.name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Qty: {item.quantity}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Order Edit Modal */}
          {selectedOrderForEdit && (
            <CustomerOrderModal
              isOpen={!!selectedOrderForEdit}
              onClose={() => setSelectedOrderForEdit(null)}
              onSuccess={() => {
                setSelectedOrderForEdit(null);
                fetchOrders();
              }}
              order={selectedOrderForEdit}
            />
          )}

          {/* Duplicate Phone Numbers Modal */}
          {showDuplicates && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Duplicate Phone Numbers ({duplicatePhones?.length || 0})
                    </h3>
                    <button
                      onClick={() => setShowDuplicates(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  {duplicatePhones && duplicatePhones.length > 0 ? (
                    <div className="space-y-6">
                      {duplicatePhones.map((duplicate) => (
                        <div
                          key={duplicate.phone}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">
                              Phone: {duplicate.phone}
                            </h4>
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                              {duplicate.count} orders
                            </span>
                          </div>
                          <div className="space-y-2">
                            {duplicate.orders.map((order: any) => (
                              <div
                                key={order.id}
                                className="bg-gray-50 rounded p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          order.id,
                                          `Order ID ${order.id} copied!`
                                        )
                                      }
                                      className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      {formatOrderIdForDisplay(order.id)}
                                    </button>
                                    <span className="font-medium">
                                      {order.customerName}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {order.customerLocation}
                                    </span>
                                    {order.paymentProofUrl && (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                        Payment Proof
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold">
                                      ${order.totalPrice}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {new Date(
                                        order.orderAt
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No duplicate phone numbers found.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Function Results Modal */}
          {quickFunctionResult && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {quickFunctionResult?.title} (
                      {quickFunctionResult?.data?.length || 0} results)
                    </h3>
                    <button
                      onClick={() => setQuickFunctionResult(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  {quickFunctionResult?.data &&
                  quickFunctionResult.data.length > 0 ? (
                    <div className="space-y-3">
                      {quickFunctionResult.type === "customers"
                        ? // Render customer data
                          quickFunctionResult.data.map((customer: any) => (
                            <div
                              key={`${customer.name}-${customer.phone}`}
                              className="border rounded-lg p-4 hover:bg-gray-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-4">
                                    <span className="font-medium text-gray-900">
                                      {customer.name}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {customer.phone}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600">
                                    {customer.orderCount} orders
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    ${customer.totalSpent.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Total spent
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        : // Render order data
                          quickFunctionResult.data.map((order: any) => (
                            <div
                              key={order.id}
                              className="border rounded-lg p-4 hover:bg-gray-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-4">
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          order.id,
                                          `Order ID ${order.id} copied!`
                                        )
                                      }
                                      className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      {formatOrderIdForDisplay(order.id)}
                                    </button>
                                    <span className="font-medium text-gray-900">
                                      {order.customerName}
                                    </span>
                                    <span className="text-sm text-gray-600 flex items-center gap-2">
                                      <span>{order.customerPhone}</span>
                                      {blacklistSet.has(
                                        normalizePhone(order.customerPhone)
                                      ) && (
                                        <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                          Blacklisted
                                        </span>
                                      )}
                                    </span>
                                    {order.paymentProofUrl && (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                        Payment Proof
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600">
                                    {order.customerLocation}, {order.province}
                                  </div>
                                  <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                                    <span>
                                      {new Date(
                                        order.orderAt
                                      ).toLocaleDateString()}
                                    </span>
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        order.state === "COMPLETED"
                                          ? "bg-green-100 text-green-800"
                                          : order.state === "DELIVERING"
                                          ? "bg-blue-100 text-blue-800"
                                          : order.state === "RETURNED"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {order.state}
                                    </span>
                                    <span className="text-purple-600">
                                      {order.orderSource}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    ${order.totalPrice}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {order.orderItems?.length || 0} items
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No results found matching your criteria.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
