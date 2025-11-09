"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { ordersAPI, driversAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Users, CheckCircle, Calendar, Clock } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phone: string;
}

export default function AssignOrdersPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [orderIds, setOrderIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [driversLoading, setDriversLoading] = useState(true);
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [assignmentDate, setAssignmentDate] = useState("");
  const [assignmentTime, setAssignmentTime] = useState("");
  const [failedOrders, setFailedOrders] = useState<Array<{ id: string; error: string }>>([]);

  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isAuthenticated) {
      fetchDrivers();
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    // Listen for driver cache updates
    const handleDriverUpdate = () => {
      fetchDrivers(true); // Force refresh
    };

    window.addEventListener("driversUpdated", handleDriverUpdate);

    return () => {
      window.removeEventListener("driversUpdated", handleDriverUpdate);
    };
  }, []);

  const fetchDrivers = async (forceRefresh = false) => {
    try {
      setDriversLoading(true);
      const response = await driversAPI.getAll({ limit: 100 });
      // Filter to only show active drivers
      const allDrivers = response.data.drivers || [];
      const activeDrivers = allDrivers.filter((driver: any) => driver.isActive);
      setDrivers(activeDrivers);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setDriversLoading(false);
    }
  };

  const handleAssignOrders = async () => {
    if (!selectedDriver) {
      toast.error("Please select a driver");
      return;
    }

    if (!orderIds.trim()) {
      toast.error("Please enter order IDs");
      return;
    }

    if (!useCurrentTime && (!assignmentDate || !assignmentTime)) {
      toast.error("Please select both date and time for custom assignment");
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
    const failedOrdersList: Array<{ id: string; error: string }> = [];

    // Prepare the assignment date
    let customAssignedAt: string | undefined = undefined;
    if (!useCurrentTime && assignmentDate && assignmentTime) {
      // Combine date and time into ISO string
      const dateTimeString = `${assignmentDate}T${assignmentTime}`;
      customAssignedAt = new Date(dateTimeString).toISOString();
    }

    try {
      for (const orderId of orderIdList) {
        try {
          await ordersAPI.assignDriver(
            orderId,
            selectedDriver,
            customAssignedAt
          );
          successCount++;
        } catch (error: any) {
          errorCount++;
          const message =
            error.response?.data?.message ||
            `Failed to assign order ${orderId}`;
          failedOrdersList.push({ id: orderId, error: message });
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully assigned ${successCount} order(s) to driver`
        );
      }

      if (errorCount > 0) {
        setFailedOrders(failedOrdersList);
        toast.error(
          `Failed to assign ${errorCount} order(s). See error details below.`
        );
      } else {
        setFailedOrders([]);
      }

      // Clear the form if all assignments were successful
      if (errorCount === 0) {
        setOrderIds("");
        setSelectedDriver("");
        setUseCurrentTime(true);
        setAssignmentDate("");
        setAssignmentTime("");
      } else {
        // Keep only failed order IDs in the textarea for easy retry
        const failedOrderIds = failedOrdersList.map(f => f.id).join("\n");
        setOrderIds(failedOrderIds);
      }
    } catch (error) {
      console.error("Bulk assignment error:", error);
      toast.error("Failed to assign orders");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || driversLoading) {
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
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Assign Orders
              </h1>
              <p className="text-gray-600">
                Bulk assign multiple orders to a driver.
              </p>
            </div>
          </div>

          {/* Assignment Form */}
          <div className="menubox-card p-6">
            <div className="space-y-6">
              {/* Driver Selection */}
              <div>
                <label
                  htmlFor="driver"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Select Driver
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <select
                    id="driver"
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="pl-10 input-field"
                    disabled={loading}
                  >
                    <option value="">Choose a driver...</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} - {driver.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignment Date/Time Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Assignment Date & Time
                </label>

                {/* Current Time Option */}
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="timeOption"
                      checked={useCurrentTime}
                      onChange={() => setUseCurrentTime(true)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      disabled={loading}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Use current date and time (right now)
                    </span>
                  </label>

                  {/* Custom Date/Time Option */}
                  <div>
                    <label className="flex items-center mb-3">
                      <input
                        type="radio"
                        name="timeOption"
                        checked={!useCurrentTime}
                        onChange={() => setUseCurrentTime(false)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Set custom date and time
                      </span>
                    </label>

                    {/* Date and Time Inputs */}
                    {!useCurrentTime && (
                      <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Date
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="date"
                              value={assignmentDate}
                              onChange={(e) =>
                                setAssignmentDate(e.target.value)
                              }
                              className="pl-10 input-field"
                              disabled={loading}
                              required={!useCurrentTime}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Time
                          </label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="time"
                              value={assignmentTime}
                              onChange={(e) =>
                                setAssignmentTime(e.target.value)
                              }
                              className="pl-10 input-field"
                              disabled={loading}
                              required={!useCurrentTime}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                  placeholder="Enter order IDs, one per line:&#10;SP3108251430A1B2C&#10;SP3108251431D4E5F&#10;SP3108251432G7H8I"
                  rows={10}
                  className="input-field resize-none"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter each order ID on a new line (e.g., SP3108251430A1B2C).
                  Empty lines will be ignored.
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleAssignOrders}
                  disabled={
                    loading ||
                    !selectedDriver ||
                    !orderIds.trim() ||
                    (!useCurrentTime && (!assignmentDate || !assignmentTime))
                  }
                  className="menubox-button-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning Orders...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Assign Orders
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Failed Orders Display */}
          {failedOrders.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mt-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-red-600 font-bold text-lg">!</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">
                    Failed to Assign {failedOrders.length} Order(s)
                  </h3>
                  <p className="text-sm text-red-600">
                    The following orders could not be assigned. Review errors and try again.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {failedOrders.map((failedOrder, index) => (
                  <div
                    key={index}
                    className="bg-white border border-red-200 rounded-lg p-4 hover:border-red-400 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-red-700 bg-red-100 px-2 py-1 rounded">
                            {failedOrder.id}
                          </span>
                        </div>
                        <p className="text-sm text-red-600">
                          <span className="font-medium">Error:</span> {failedOrder.error}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-red-100 rounded border border-red-200">
                <p className="text-sm text-red-700">
                  <span className="font-semibold">Tip:</span> The failed order IDs have been kept in the textarea above. Fix any issues and click "Assign Orders" again to retry.
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Instructions:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Select a driver from the dropdown</li>
              <li>
                • Choose assignment time: current time or custom date/time
              </li>
              <li>• Enter order IDs in the text area, one per line</li>
              <li>• Orders will be assigned to the selected driver</li>
              <li>• Order status will automatically change to "DELIVERING"</li>
              <li>• Invalid order IDs will be skipped and reported</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
