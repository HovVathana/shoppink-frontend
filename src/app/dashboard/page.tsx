"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import { useDashboardState } from "@/hooks/useDashboardState";
import { ordersAPI, driversAPI } from "@/lib/api";
import { cache } from "@/utils/simpleCache";
import {
  ShoppingCart,
  Package,
  CheckCircle,
  Truck,
  RotateCcw,
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardStats {
  totalOrders: number;
  placedOrders: number;
  completedOrders: number;
  deliveringOrders: number;
  returnedOrders: number;
  cancelledOrders: number;
  totalRevenue: number; // Excludes returned orders
  totalRevenueWithReturns: number; // Includes returned orders
  totalRevenuePP: number;
  totalRevenueProvince: number;
  totalRevenueCompleted: number;
  totalRevenuePPCompleted: number;
  totalRevenueProvinceCompleted: number;
  customerDelivery: number;
  companyDelivery: number;
  profitDelivery: number;
  customerDeliveryCompleted: number;
  companyDeliveryCompleted: number;
  profitDeliveryCompleted: number;
}

interface DriverStats {
  id: string;
  name: string;
  total: number; // Total number of orders (all states)
  delivering: number;
  completed: number;
  returned: number;
  delivery: number; // Total delivery fees from COMPLETED orders only
  totalAmount: number; // Total order amount from COMPLETED orders only
}

interface DailyOrderData {
  date: string;
  orders: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

export default function DashboardPage() {
  const { isInitialized } = useDashboardState();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    placedOrders: 0,
    completedOrders: 0,
    deliveringOrders: 0,
    returnedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    totalRevenueWithReturns: 0,
    totalRevenuePP: 0,
    totalRevenueProvince: 0,
    totalRevenueCompleted: 0,
    totalRevenuePPCompleted: 0,
    totalRevenueProvinceCompleted: 0,
    customerDelivery: 0,
    companyDelivery: 0,
    profitDelivery: 0,
    customerDeliveryCompleted: 0,
    companyDeliveryCompleted: 0,
    profitDeliveryCompleted: 0,
  });

  const [driverStats, setDriverStats] = useState<DriverStats[]>([]);
  const [unassignedStats, setUnassignedStats] = useState<DriverStats>({
    id: "unassigned",
    name: "Unassigned",
    total: 0,
    delivering: 0,
    completed: 0,
    returned: 0,
    delivery: 0,
    totalAmount: 0,
  });

  const [dailyOrdersData, setDailyOrdersData] = useState<DailyOrderData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<
    StatusDistribution[]
  >([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  // Separate date filter for monthly sales report, top products, and status distribution
  const [salesReportPeriod, setSalesReportPeriod] = useState("current_day");
  const [previousSalesReportPeriod, setPreviousSalesReportPeriod] =
    useState(null);

  const [loading, setLoading] = useState(true);

  // Add request management to prevent rate limiting
  const salesReportTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoadingSalesData, setIsLoadingSalesData] = useState(false);
  // Set date range to last 30 days for main dashboard stats
  const [dateFrom, setDateFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Function to get date range based on selected period
  // const getSalesReportDateRange = (period: string) => {
  //   const now = new Date();
  //   let startDate: Date;
  //   let endDate: Date;

  //   switch (period) {
  //     case "current_day":
  //       // Use UTC methods to avoid timezone issues
  //       startDate = new Date(now);
  //       startDate.setHours(0, 0, 0, 0);

  //       endDate = new Date(now);
  //       endDate.setHours(23, 59, 59, 999);
  //       break;
  //     case "current_month":
  //       startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  //       // Get the last day of current month and set to end of day
  //       endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  //       endDate.setHours(23, 59, 59, 999);
  //       break;
  //     case "last_month":
  //       startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  //       endDate = new Date(now.getFullYear(), now.getMonth(), 0);
  //       endDate.setHours(23, 59, 59, 999);
  //       break;
  //     case "last_3_months":
  //       startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  //       endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  //       endDate.setHours(23, 59, 59, 999);
  //       break;
  //     case "last_6_months":
  //       startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  //       endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  //       endDate.setHours(23, 59, 59, 999);
  //       break;
  //     case "current_year":
  //       startDate = new Date(now.getFullYear(), 0, 1);
  //       endDate = new Date(now.getFullYear(), 11, 31);
  //       endDate.setHours(23, 59, 59, 999);
  //       break;
  //     default:
  //       // Default to current day if period is unrecognized
  //       startDate = new Date(now);
  //       startDate.setHours(0, 0, 0, 0);

  //       endDate = new Date(now);
  //       endDate.setHours(23, 59, 59, 999);
  //   }

  //   return {
  //     from: startDate.toISOString().split("T")[0],
  //     to: endDate.toISOString().split("T")[0],
  //   };
  // };
  const getSalesReportDateRange = (period: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "current_day":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "last_3_months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "last_6_months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "current_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }

    return {
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
    };
  };

  // Debounced function to fetch sales report data
  const debouncedFetchSalesReportData = useCallback(() => {
    // Clear existing timeout
    if (salesReportTimeoutRef.current) {
      clearTimeout(salesReportTimeoutRef.current);
    }

    // Set new timeout to debounce requests
    salesReportTimeoutRef.current = setTimeout(async () => {
      if (isLoadingSalesData) return; // Prevent multiple simultaneous requests

      setIsLoadingSalesData(true);
      try {
        const dateRange = getSalesReportDateRange(salesReportPeriod);

        // Check cache first - include actual date range in cache key to ensure fresh data when dates change
        const cacheKey = `sales-report-${salesReportPeriod}-${dateRange.from}-${dateRange.to}`;
        const periodChanged =
          previousSalesReportPeriod === null ||
          salesReportPeriod !== previousSalesReportPeriod;
        const cachedData = !periodChanged ? cache.get(cacheKey) : null; // Skip cache if period changed

        if (cachedData) {
          setDailyOrdersData(cachedData.dailyData);
          setTopProducts(cachedData.topProducts);
          setStatusDistribution(cachedData.statusData);
          setIsLoadingSalesData(false);
          return;
        }

        const response = await ordersAPI.getAll({
          limit: 10000,
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
          allSources: true,
        });

        const orders = Array.isArray(response.data.orders)
          ? response.data.orders
          : [];

        // Calculate daily orders data for chart
        const dailyOrdersMap = new Map();
        orders.forEach((order: any) => {
          const orderDate = new Date(order.orderAt).toISOString().split("T")[0];
          dailyOrdersMap.set(
            orderDate,
            (dailyOrdersMap.get(orderDate) || 0) + 1
          );
        });

        // Generate daily data for the selected period
        const startDate = new Date(dateRange.from);
        const endDate = new Date(dateRange.to);
        const dailyData = [];

        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          const dateStr = d.toISOString().split("T")[0];
          dailyData.push({
            date: dateStr,
            orders: dailyOrdersMap.get(dateStr) || 0,
          });
        }

        setDailyOrdersData(dailyData);

        // Calculate top selling products
        const productSalesMap = new Map();
        orders.forEach((order: any) => {
          order.orderItems?.forEach((item: any) => {
            const productId = item.product.id;
            const productName = item.product.name;
            const quantity = item.quantity;

            if (productSalesMap.has(productId)) {
              productSalesMap.set(productId, {
                ...productSalesMap.get(productId),
                quantity: productSalesMap.get(productId).quantity + quantity,
              });
            } else {
              productSalesMap.set(productId, {
                id: productId,
                name: productName,
                quantity: quantity,
              });
            }
          });
        });

        const topProductsData = Array.from(productSalesMap.values()).sort(
          (a, b) => b.quantity - a.quantity
        );

        // Calculate status distribution
        const placedOrders = orders.filter(
          (order: any) => order.state === "PLACED"
        ).length;
        const deliveringOrders = orders.filter(
          (order: any) => order.state === "DELIVERING"
        ).length;
        const completedOrders = orders.filter(
          (order: any) => order.state === "COMPLETED"
        ).length;
        const returnedOrders = orders.filter(
          (order: any) => order.state === "RETURNED"
        ).length;
        const cancelledOrders = orders.filter(
          (order: any) => order.state === "CANCELLED"
        ).length;

        const statusData: StatusDistribution[] = [
          {
            name: "Placed",
            value: placedOrders,
            color: "#3B82F6", // blue
          },
          {
            name: "Delivering",
            value: deliveringOrders,
            color: "#F59E0B", // orange
          },
          {
            name: "Completed",
            value: completedOrders,
            color: "#10B981", // green
          },
          {
            name: "Returned",
            value: returnedOrders,
            color: "#EF4444", // red
          },
          {
            name: "Cancelled",
            value: cancelledOrders,
            color: "#6B7280", // gray
          },
        ].filter((item) => item.value > 0);

        // Cache the results - shorter cache time for current day data
        const cacheData = {
          dailyData: dailyData,
          topProducts: topProductsData,
          statusData: statusData,
        };
        const cacheMinutes = salesReportPeriod === "current_day" ? 1 : 5; // 1 minute for current day, 5 for others
        cache.set(cacheKey, cacheData, cacheMinutes);

        setDailyOrdersData(dailyData);
        setTopProducts(topProductsData);
        setStatusDistribution(statusData);

        // Update previous period to track changes
        setPreviousSalesReportPeriod(salesReportPeriod);
      } catch (error) {
        console.error("Error fetching sales report data:", error);
      } finally {
        setIsLoadingSalesData(false);
      }
    }, 500); // 500ms debounce
  }, [salesReportPeriod, previousSalesReportPeriod, isLoadingSalesData]);

  // Simple wrapper for backward compatibility
  const fetchSalesReportData = () => {
    debouncedFetchSalesReportData();
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isAuthenticated) {
      fetchDashboardData();
      fetchSalesReportData();
    }
  }, [isAuthenticated, authLoading, router, dateFrom, dateTo]);

  // Separate useEffect for sales report data and status distribution
  useEffect(() => {
    if (isAuthenticated) {
      fetchSalesReportData();
    }
  }, [salesReportPeriod, isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Check cache first to reduce API calls
      const cacheKey = `dashboard-${dateFrom}-${dateTo}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        setStats(cachedData.stats);
        setDriverStats(cachedData.driverStats || []);
        setUnassignedStats(
          cachedData.unassignedStats || {
            id: "unassigned",
            name: "Unassigned",
            total: 0,
            delivering: 0,
            completed: 0,
            returned: 0,
            delivery: 0,
            totalAmount: 0,
          }
        );
        setLoading(false);
        return;
      }

      // Fetch orders and drivers - get ALL data for statistics
      const [ordersResponse, driversResponse] = await Promise.all([
        ordersAPI.getAll({
          limit: 10000,
          dateFrom,
          dateTo,
          allSources: true, // Get orders from all sources (ADMIN + CUSTOMER) for dashboard stats
        }), // Get all orders with high limit and date filtering
        driversAPI.getAllActive(), // Get all active drivers without pagination
      ]);

      const orders = Array.isArray(ordersResponse.data.orders)
        ? ordersResponse.data.orders
        : [];
      const drivers = Array.isArray(driversResponse.data.drivers)
        ? driversResponse.data.drivers
        : [];

      // Orders are already filtered by date range on the backend
      const filteredOrders = orders;

      // Calculate main statistics
      const totalOrders = filteredOrders.length;
      const placedOrders = filteredOrders.filter(
        (o: any) => o.state === "PLACED"
      ).length;
      const completedOrders = filteredOrders.filter(
        (o: any) => o.state === "COMPLETED"
      ).length;
      const deliveringOrders = filteredOrders.filter(
        (o: any) => o.state === "DELIVERING"
      ).length;
      const returnedOrders = filteredOrders.filter(
        (o: any) => o.state === "RETURNED"
      ).length;
      const cancelledOrders = filteredOrders.filter(
        (o: any) => o.state === "CANCELLED"
      ).length;

      // Calculate revenue statistics
      // Total revenue with returns - sum of total price of ALL orders (including returned)
      const totalRevenueWithReturns = filteredOrders.reduce(
        (sum: number, order: any) => sum + (order.totalPrice || 0),
        0
      );

      // Total revenue (PP) - sum of total price of orders in Phnom Penh (excluding returned)
      const totalRevenuePP = filteredOrders
        .filter(
          (o: any) => o.province === "Phnom Penh" && o.state !== "RETURNED"
        )
        .reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);

      // Total revenue (Province) - sum of total price of orders in Province (excluding returned)
      const totalRevenueProvince = filteredOrders
        .filter(
          (o: any) => o.province !== "Phnom Penh" && o.state !== "RETURNED"
        )
        .reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);

      // Total revenue - sum of total price of orders excluding returned orders
      const totalRevenue = totalRevenuePP + totalRevenueProvince;

      // Get completed orders only
      const completedOrdersOnly = filteredOrders.filter(
        (o: any) => o.state === "COMPLETED"
      );

      // Total revenue (PP) (Completed) - sum of total price of completed orders in Phnom Penh
      const totalRevenuePPCompleted = completedOrdersOnly
        .filter((o: any) => o.province === "Phnom Penh")
        .reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);

      // Total revenue (Province) (Completed) - sum of total price of completed orders in Province
      const totalRevenueProvinceCompleted = completedOrdersOnly
        .filter((o: any) => o.province !== "Phnom Penh")
        .reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);

      // Total revenue (Completed) - sum of total price of completed orders in both Phnom Penh and Province
      const totalRevenueCompleted =
        totalRevenuePPCompleted + totalRevenueProvinceCompleted;

      // Calculate delivery statistics
      // Customer delivery - sum of delivery price
      const customerDelivery = filteredOrders.reduce(
        (sum: number, order: any) => sum + (order.deliveryPrice || 0),
        0
      );

      // Company delivery - sum of company delivery price
      const companyDelivery = filteredOrders.reduce(
        (sum: number, order: any) => sum + (order.companyDeliveryPrice || 0),
        0
      );

      // Profit delivery - sum of delivery price - sum of company delivery price
      const profitDelivery = customerDelivery - companyDelivery;

      // Customer delivery (completed) - sum of delivery price of completed orders
      const customerDeliveryCompleted = completedOrdersOnly.reduce(
        (sum: number, order: any) => sum + (order.deliveryPrice || 0),
        0
      );

      // Company delivery (completed) - sum of company delivery price of completed orders
      const companyDeliveryCompleted = completedOrdersOnly.reduce(
        (sum: number, order: any) => sum + (order.companyDeliveryPrice || 0),
        0
      );

      // Profit delivery (completed) - sum of delivery price of completed orders - sum of company delivery price of completed orders
      const profitDeliveryCompleted =
        customerDeliveryCompleted - companyDeliveryCompleted;

      setStats({
        totalOrders,
        placedOrders,
        completedOrders,
        deliveringOrders,
        returnedOrders,
        cancelledOrders,
        totalRevenue,
        totalRevenueWithReturns,
        totalRevenuePP,
        totalRevenueProvince,
        totalRevenueCompleted,
        totalRevenuePPCompleted,
        totalRevenueProvinceCompleted,
        customerDelivery,
        companyDelivery,
        profitDelivery,
        customerDeliveryCompleted,
        companyDeliveryCompleted,
        profitDeliveryCompleted,
      });

      // Calculate driver statistics
      const driverStatsMap = new Map();
      let unassignedCount = 0;
      let unassignedDelivering = 0;
      let unassignedCompleted = 0;
      let unassignedReturned = 0;
      let unassignedDelivery = 0;
      let unassignedTotal = 0;

      // Initialize driver stats
      drivers.forEach((driver: any) => {
        driverStatsMap.set(driver.id, {
          id: driver.id,
          name: driver.name,
          total: 0,
          delivering: 0,
          completed: 0,
          returned: 0,
          delivery: 0,
          totalAmount: 0,
        });
      });

      // Calculate stats for each order
      filteredOrders.forEach((order: any) => {
        if (order.driverId && driverStatsMap.has(order.driverId)) {
          const driverStat = driverStatsMap.get(order.driverId);
          driverStat.total++;

          // Only count delivery fee and total amount for COMPLETED orders
          if (order.state === "COMPLETED") {
            driverStat.totalAmount += order.totalPrice || 0;
            driverStat.delivery += order.deliveryPrice || 0;
          }

          if (order.state === "DELIVERING") driverStat.delivering++;
          if (order.state === "COMPLETED") driverStat.completed++;
          if (order.state === "RETURNED") driverStat.returned++;
        } else {
          // Unassigned orders
          unassignedCount++;

          // Only count delivery fee and total amount for COMPLETED unassigned orders
          if (order.state === "COMPLETED") {
            unassignedTotal += order.totalPrice || 0;
            unassignedDelivery += order.deliveryPrice || 0;
          }

          if (order.state === "DELIVERING") unassignedDelivering++;
          if (order.state === "COMPLETED") unassignedCompleted++;
          if (order.state === "RETURNED") unassignedReturned++;
        }
      });

      setDriverStats(Array.from(driverStatsMap.values()));
      setUnassignedStats({
        id: "unassigned",
        name: "Unassigned",
        total: unassignedCount,
        delivering: unassignedDelivering,
        completed: unassignedCompleted,
        returned: unassignedReturned,
        delivery: unassignedDelivery,
        totalAmount: unassignedTotal,
      });
      // Calculate daily orders data for chart
      const dailyOrdersMap = new Map();
      filteredOrders.forEach((order: any) => {
        const orderDate = new Date(order.orderAt).toISOString().split("T")[0];
        dailyOrdersMap.set(orderDate, (dailyOrdersMap.get(orderDate) || 0) + 1);
      });

      const dailyData: DailyOrderData[] = [];
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];
        dailyData.push({
          date: dateStr,
          orders: dailyOrdersMap.get(dateStr) || 0,
        });
      }

      setDailyOrdersData(dailyData);

      // Calculate status distribution for pie chart
      const statusData: StatusDistribution[] = [
        {
          name: "Placed",
          value: placedOrders,
          color: "#3B82F6", // blue
        },
        {
          name: "Delivering",
          value: deliveringOrders,
          color: "#F59E0B", // orange
        },
        {
          name: "Completed",
          value: completedOrders,
          color: "#10B981", // green
        },
        {
          name: "Returned",
          value: returnedOrders,
          color: "#EF4444", // red
        },
        {
          name: "Cancelled",
          value: cancelledOrders,
          color: "#6B7280", // gray
        },
      ].filter((item) => item.value > 0);

      setStatusDistribution(statusData);

      // Cache the dashboard data
      const dashboardCacheData = {
        stats: {
          totalOrders,
          placedOrders,
          completedOrders,
          deliveringOrders,
          returnedOrders,
          cancelledOrders,
          totalRevenue,
          totalRevenueWithReturns,
          totalRevenuePP,
          totalRevenueProvince,
          totalRevenueCompleted,
          totalRevenuePPCompleted,
          totalRevenueProvinceCompleted,
          customerDelivery,
          companyDelivery,
          profitDelivery,
          customerDeliveryCompleted,
          companyDeliveryCompleted,
          profitDeliveryCompleted,
        },
        driverStats: Array.from(driverStatsMap.values()),
        unassignedStats: {
          id: "unassigned",
          name: "Unassigned",
          total: unassignedCount,
          delivering: unassignedDelivering,
          completed: unassignedCompleted,
          returned: unassignedReturned,
          delivery: unassignedDelivery,
          totalAmount: unassignedTotal,
        },
      };
      cache.set(cacheKey, dashboardCacheData, 3); // 3 minutes cache for dashboard
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    variant = "default",
    trend,
  }: {
    title: string;
    value: string | number;
    icon: any;
    variant?: "default" | "primary" | "success" | "warning" | "danger";
    trend?: number;
  }) => {
    const iconVariants = {
      default: "menubox-stat-icon-blue",
      primary: "menubox-stat-icon-blue",
      success: "menubox-stat-icon-green",
      warning: "menubox-stat-icon-orange",
      danger: "menubox-stat-icon-red",
    };

    return (
      <div className="menubox-stat-card">
        <div className="flex items-center justify-between mb-4">
          <div className={`menubox-stat-icon ${iconVariants[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend !== undefined && (
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600 font-medium">
                {trend > 0 ? "+" : ""}
                {trend}%
              </span>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    );
  };

  const DriverSection = ({ driver }: { driver: DriverStats }) => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <Truck className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">{driver.name}</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Orders"
          value={driver.total}
          icon={ShoppingCart}
          variant="primary"
        />
        <StatCard
          title="Delivering"
          value={driver.delivering}
          icon={Truck}
          variant="warning"
        />
        <StatCard
          title="Completed"
          value={driver.completed}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Returned"
          value={driver.returned}
          icon={RotateCcw}
          variant="danger"
        />
        <StatCard
          title="Delivery Fee (Completed)"
          value={formatCurrency(driver.delivery)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Total Amount (Completed)"
          value={formatCurrency(driver.totalAmount)}
          icon={TrendingUp}
          variant="primary"
        />
      </div>
    </div>
  );

  return (
    <ProtectedRoute permission="view_dashboard">
      <DashboardLayout>
        <div className="bg-gray-50 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
            {/* MenuBox-inspired Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Dashboard
                  </h1>
                  <p className="text-gray-600">
                    Monitor your business performance and analytics
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  // Clear all cache to force fresh data fetch
                  cache.clearAll();
                  // Immediately refetch both dashboard and sales report data
                  await Promise.all([
                    fetchDashboardData(),
                    (async () => {
                      // For sales report, use the same dateFrom and dateTo from the date range filter
                      setIsLoadingSalesData(true);
                      try {
                        const response = await ordersAPI.getAll({
                          limit: 5000,
                          dateFrom: dateFrom,
                          dateTo: dateTo,
                          allSources: true,
                        });
                        const orders = Array.isArray(response.data.orders)
                          ? response.data.orders
                          : [];

                        // Calculate daily orders data
                        const dailyOrdersMap = new Map();
                        orders.forEach((order: any) => {
                          const orderDate = new Date(order.orderAt)
                            .toISOString()
                            .split("T")[0];
                          dailyOrdersMap.set(
                            orderDate,
                            (dailyOrdersMap.get(orderDate) || 0) + 1
                          );
                        });

                        const startDate = new Date(dateFrom);
                        const endDate = new Date(dateTo);
                        const dailyData = [];
                        for (
                          let d = new Date(startDate);
                          d <= endDate;
                          d.setDate(d.getDate() + 1)
                        ) {
                          const dateStr = d.toISOString().split("T")[0];
                          dailyData.push({
                            date: dateStr,
                            orders: dailyOrdersMap.get(dateStr) || 0,
                          });
                        }
                        setDailyOrdersData(dailyData);

                        // Calculate top products
                        const productSalesMap = new Map();
                        orders.forEach((order: any) => {
                          order.orderItems?.forEach((item: any) => {
                            const productId = item.product.id;
                            const productName = item.product.name;
                            const quantity = item.quantity;
                            if (productSalesMap.has(productId)) {
                              productSalesMap.set(productId, {
                                ...productSalesMap.get(productId),
                                quantity:
                                  productSalesMap.get(productId).quantity +
                                  quantity,
                              });
                            } else {
                              productSalesMap.set(productId, {
                                id: productId,
                                name: productName,
                                quantity,
                              });
                            }
                          });
                        });
                        const topProductsData = Array.from(
                          productSalesMap.values()
                        )
                          .sort((a, b) => b.quantity - a.quantity)
                          .slice(0, 5);
                        setTopProducts(topProductsData);

                        // Calculate status distribution
                        const placedOrders = orders.filter(
                          (o: any) => o.state === "PLACED"
                        ).length;
                        const deliveringOrders = orders.filter(
                          (o: any) => o.state === "DELIVERING"
                        ).length;
                        const completedOrders = orders.filter(
                          (o: any) => o.state === "COMPLETED"
                        ).length;
                        const returnedOrders = orders.filter(
                          (o: any) => o.state === "RETURNED"
                        ).length;
                        const cancelledOrders = orders.filter(
                          (o: any) => o.state === "CANCELLED"
                        ).length;
                        const statusData: StatusDistribution[] = [
                          {
                            name: "Placed",
                            value: placedOrders,
                            color: "#3B82F6",
                          },
                          {
                            name: "Delivering",
                            value: deliveringOrders,
                            color: "#F59E0B",
                          },
                          {
                            name: "Completed",
                            value: completedOrders,
                            color: "#10B981",
                          },
                          {
                            name: "Returned",
                            value: returnedOrders,
                            color: "#EF4444",
                          },
                          {
                            name: "Cancelled",
                            value: cancelledOrders,
                            color: "#6B7280",
                          },
                        ].filter((item) => item.value > 0);
                        setStatusDistribution(statusData);
                      } catch (error) {
                        console.error("Error refreshing sales report:", error);
                      } finally {
                        setIsLoadingSalesData(false);
                      }
                    })(),
                  ]);
                }}
                disabled={loading || isLoadingSalesData}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#070B34] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Refresh dashboard data"
              >
                <RotateCcw
                  className={`h-4 w-4 mr-2 ${
                    loading || isLoadingSalesData ? "animate-spin" : ""
                  }`}
                />
                <span className="text-sm font-medium text-gray-700">
                  Refresh
                </span>
              </button>
            </div>

            {/* Date Range Filter Card */}
            <div className="menubox-card p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Date Range:
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">
                      From:
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="menubox-input"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">
                      To:
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="menubox-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Statistics */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Today's Orders
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Overview of order status and activity
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
                <StatCard
                  title="Total Orders"
                  value={stats.totalOrders}
                  icon={ShoppingCart}
                  variant="primary"
                />
                <StatCard
                  title="Placed Orders"
                  value={stats.placedOrders}
                  icon={Package}
                  variant="default"
                />
                <StatCard
                  title="Completed Orders"
                  value={stats.completedOrders}
                  icon={CheckCircle}
                  variant="success"
                />
                <StatCard
                  title="Delivering Orders"
                  value={stats.deliveringOrders}
                  icon={Truck}
                  variant="warning"
                />
                <StatCard
                  title="Returned Orders"
                  value={stats.returnedOrders}
                  icon={RotateCcw}
                  variant="danger"
                />
                <StatCard
                  title="Cancelled Orders"
                  value={stats.cancelledOrders}
                  icon={XCircle}
                  variant="default"
                />
              </div>
            </div>

            {/* Revenue Statistics */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Today's Revenue
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Revenue breakdown by location
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatCard
                  title="Revenue (Phnom Penh)"
                  value={formatCurrency(stats.totalRevenuePP)}
                  icon={DollarSign}
                  variant="success"
                />
                <StatCard
                  title="Revenue (Province)"
                  value={formatCurrency(stats.totalRevenueProvince)}
                  icon={DollarSign}
                  variant="success"
                />
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(stats.totalRevenue)}
                  icon={TrendingUp}
                  variant="primary"
                />
                <StatCard
                  title="Total Revenue with Returns"
                  value={formatCurrency(stats.totalRevenueWithReturns)}
                  icon={RotateCcw}
                  variant="warning"
                />
              </div>
            </div>

            {/* Completed Revenue Statistics */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Completed Orders Revenue
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Revenue from successfully completed orders
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <StatCard
                  title="Completed Revenue (PP)"
                  value={formatCurrency(stats.totalRevenuePPCompleted)}
                  icon={CheckCircle}
                  variant="success"
                />
                <StatCard
                  title="Completed Revenue (Province)"
                  value={formatCurrency(stats.totalRevenueProvinceCompleted)}
                  icon={CheckCircle}
                  variant="success"
                />
                <StatCard
                  title="Total Completed Revenue"
                  value={formatCurrency(stats.totalRevenueCompleted)}
                  icon={TrendingUp}
                  variant="primary"
                />
              </div>
            </div>

            {/* Delivery Statistics */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Delivery Analytics
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Delivery fees and profit analysis
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <StatCard
                  title="Customer Delivery Fees"
                  value={formatCurrency(stats.customerDelivery)}
                  icon={Truck}
                  variant="primary"
                />
                <StatCard
                  title="Company Delivery Costs"
                  value={formatCurrency(stats.companyDelivery)}
                  icon={DollarSign}
                  variant="warning"
                />
                <StatCard
                  title="Delivery Profit"
                  value={formatCurrency(stats.profitDelivery)}
                  icon={TrendingUp}
                  variant="success"
                />
              </div>
            </div>

            {/* Completed Delivery Statistics */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Completed Orders Delivery
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Delivery metrics for completed orders only
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <StatCard
                  title="Customer Delivery (Completed)"
                  value={formatCurrency(stats.customerDeliveryCompleted)}
                  icon={CheckCircle}
                  variant="primary"
                />
                <StatCard
                  title="Company Delivery (Completed)"
                  value={formatCurrency(stats.companyDeliveryCompleted)}
                  icon={DollarSign}
                  variant="warning"
                />
                <StatCard
                  title="Delivery Profit (Completed)"
                  value={formatCurrency(stats.profitDeliveryCompleted)}
                  icon={TrendingUp}
                  variant="success"
                />
              </div>
            </div>

            {/* Driver Statistics */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Driver Performance
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Individual driver statistics and metrics (delivery fees and
                    amounts from completed orders only)
                  </p>
                </div>
              </div>
              <div className="space-y-8">
                {driverStats.map((driver) => (
                  <div key={driver.id} className="menubox-card p-6">
                    <DriverSection driver={driver} />
                  </div>
                ))}

                {/* Unassigned Orders - only show if there are unassigned orders */}
                {unassignedStats.total > 0 && (
                  <div className="menubox-card p-6">
                    <DriverSection driver={unassignedStats} />
                  </div>
                )}
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Daily Orders Chart */}
              <div className="menubox-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Monthly Sales Report
                    </h3>
                  </div>
                  <select
                    value={salesReportPeriod}
                    onChange={(e) => setSalesReportPeriod(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="current_day">Current Day</option>
                    <option value="current_month">Current Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="last_3_months">Last 3 Months</option>
                    <option value="last_6_months">Last 6 Months</option>
                    <option value="current_year">Current Year</option>
                  </select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyOrdersData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            timeZone: "Asia/Phnom_Penh",
                          })
                        }
                      />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            timeZone: "Asia/Phnom_Penh",
                          })
                        }
                        contentStyle={{
                          backgroundColor: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#8b5cf6", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Order Status Distribution */}
              <div className="menubox-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-100 to-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order Status Distribution
                    </h3>
                  </div>
                  <select
                    value={salesReportPeriod}
                    onChange={(e) => setSalesReportPeriod(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="current_day">Current Day</option>
                    <option value="current_month">Current Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="last_3_months">Last 3 Months</option>
                    <option value="last_6_months">Last 6 Months</option>
                    <option value="current_year">Current Year</option>
                  </select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, "Orders"]}
                        contentStyle={{
                          backgroundColor: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span style={{ color: "#374151" }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="menubox-card p-6 mt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-100 to-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Top Selling Products
                  </h3>
                </div>
                <select
                  value={salesReportPeriod}
                  onChange={(e) => setSalesReportPeriod(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="current_day">Current Day</option>
                  <option value="current_month">Current Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_3_months">Last 3 Months</option>
                  <option value="last_6_months">Last 6 Months</option>
                  <option value="current_year">Current Year</option>
                </select>
              </div>
              <div className="space-y-3">
                {topProducts.length > 0 ? (
                  topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {product.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {product.quantity} sold
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No sales data available for this period
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
