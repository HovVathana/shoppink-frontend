"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import DriverModal from "@/components/Drivers/DriverModal";
import { driversAPI } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  Phone,
  User,
  MapPin,
  Truck,
  RefreshCw,
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  licenseNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isAuthenticated) {
      fetchDrivers();
    }
  }, [isAuthenticated, authLoading, router, debouncedSearchTerm]);

  const fetchDrivers = async (page = 1, bustCache = false) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 10,
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(sortField && { sortBy: sortField }),
        ...(sortDirection && { sortOrder: sortDirection }),
      };

      const response = await driversAPI.getAll(params, bustCache);
      setDrivers(response.data.drivers);
      setPagination(response.data.pagination);
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to fetch drivers";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    fetchDrivers(1);
  };

  const handleCreateDriver = () => {
    setSelectedDriver(null);
    setIsEditing(false);
    setIsDriverModalOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsEditing(true);
    setIsDriverModalOpen(true);
  };

  const handleToggleActive = async (driver: Driver) => {
    try {
      await driversAPI.update(driver.id, {
        ...driver,
        isActive: !driver.isActive,
      });
      toast.success(
        `Driver ${driver.isActive ? "deactivated" : "activated"} successfully`
      );
      fetchDrivers(pagination.currentPage);
      
      // Dispatch event to notify all components that drivers were updated
      window.dispatchEvent(new CustomEvent("driversUpdated"));
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to update driver status";
      toast.error(message);
    }
  };

  const handleDeleteDriver = async (driver: Driver) => {
    if (!confirm(`Are you sure you want to delete driver ${driver.name}?`)) {
      return;
    }

    try {
      await driversAPI.delete(driver.id);
      toast.success("Driver deleted successfully");
      fetchDrivers(pagination.currentPage);
      
      // Dispatch event to notify all components that drivers were updated
      window.dispatchEvent(new CustomEvent("driversUpdated"));
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to delete driver";
      toast.error(message);
    }
  };

  const handleDriverSaved = () => {
    setIsDriverModalOpen(false);
    fetchDrivers(pagination.currentPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  return (
    <ProtectedRoute permission="view_drivers">
      <DashboardLayout>
        <div className="bg-gray-50 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* MenuBox-inspired Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Drivers</h1>
                  <p className="text-gray-600">
                    Manage delivery drivers and their information
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchDrivers(pagination.currentPage, true)}
                  disabled={loading}
                  className="menubox-button-secondary flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleCreateDriver}
                  className="menubox-button-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Driver</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="menubox-card p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search drivers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="menubox-input pl-10 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drivers Table */}
            <div className="menubox-table">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="menubox-table-header">
                    <tr>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center">
                          Driver
                          {sortField === "name" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("phone")}
                      >
                        <div className="flex items-center">
                          Contact
                          {sortField === "phone" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("licenseNumber")}
                      >
                        <div className="flex items-center">
                          License
                          {sortField === "licenseNumber" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("isActive")}
                      >
                        <div className="flex items-center">
                          Status
                          {sortField === "isActive" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center">
                          Created
                          {sortField === "createdAt" && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {drivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {driver.name}
                              </div>
                              {driver.email && (
                                <div className="text-sm text-gray-500">
                                  {driver.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {driver.phone}
                          </div>
                          {driver.address && (
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                              {driver.address}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {driver.licenseNumber || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(driver)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                              driver.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                            title={`Click to ${driver.isActive ? "deactivate" : "activate"}`}
                          >
                            {driver.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(driver.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEditDriver(driver)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit Driver"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDriver(driver)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Driver"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => fetchDrivers(pagination.currentPage - 1)}
                      disabled={pagination.currentPage <= 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchDrivers(pagination.currentPage + 1)}
                      disabled={pagination.currentPage >= pagination.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">
                          {(pagination.currentPage - 1) *
                            pagination.itemsPerPage +
                            1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(
                            pagination.currentPage * pagination.itemsPerPage,
                            pagination.totalItems
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {pagination.totalItems}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() =>
                            fetchDrivers(pagination.currentPage - 1)
                          }
                          disabled={pagination.currentPage <= 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            fetchDrivers(pagination.currentPage + 1)
                          }
                          disabled={
                            pagination.currentPage >= pagination.totalPages
                          }
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Driver Modal */}
            <DriverModal
              isOpen={isDriverModalOpen}
              onClose={() => setIsDriverModalOpen(false)}
              onSaved={handleDriverSaved}
              driver={selectedDriver}
              isEditing={isEditing}
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
