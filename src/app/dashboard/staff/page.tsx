"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import StaffModal from "@/components/Staff/StaffModal";
import { staffAPI } from "@/lib/api";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  UserCheck,
  UserX,
  User,
} from "lucide-react";

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  // Dashboard
  {
    id: "view_dashboard",
    name: "View Dashboard",
    description: "Access to dashboard overview and analytics",
  },
  // Products
  {
    id: "view_products",
    name: "View Products",
    description: "View product listings and details",
  },
  {
    id: "create_products",
    name: "Create Products",
    description: "Add new products to the system",
  },
  {
    id: "edit_products",
    name: "Edit Products",
    description: "Modify existing product information",
  },
  {
    id: "delete_products",
    name: "Delete Products",
    description: "Remove products from the system",
  },
  // Orders
  {
    id: "view_orders",
    name: "View Orders",
    description: "View order listings and details",
  },
  {
    id: "create_orders",
    name: "Create Orders",
    description: "Create new orders",
  },
  {
    id: "edit_orders",
    name: "Edit Orders",
    description: "Modify existing orders",
  },
  {
    id: "delete_orders",
    name: "Delete Orders",
    description: "Cancel or remove orders",
  },
  // Categories
  {
    id: "view_categories",
    name: "View Categories",
    description: "View category listings and details",
  },
  {
    id: "create_categories",
    name: "Create Categories",
    description: "Add new categories to the system",
  },
  {
    id: "edit_categories",
    name: "Edit Categories",
    description: "Modify existing category information",
  },
  {
    id: "delete_categories",
    name: "Delete Categories",
    description: "Remove categories from the system",
  },
  // Drivers
  {
    id: "view_drivers",
    name: "View Drivers",
    description: "View driver listings and details",
  },
  {
    id: "create_drivers",
    name: "Create Drivers",
    description: "Add new drivers to the system",
  },
  {
    id: "edit_drivers",
    name: "Edit Drivers",
    description: "Modify existing driver information",
  },
  {
    id: "delete_drivers",
    name: "Delete Drivers",
    description: "Remove drivers from the system",
  },
  // Staff
  {
    id: "view_staff",
    name: "View Staff",
    description: "View staff listings and details",
  },
  {
    id: "create_staff",
    name: "Create Staff",
    description: "Add new staff members to the system",
  },
  {
    id: "edit_staff",
    name: "Edit Staff",
    description: "Modify existing staff information",
  },
  {
    id: "delete_staff",
    name: "Delete Staff",
    description: "Remove staff members from the system",
  },
];

export default function StaffPage() {
  const { admin } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await staffAPI.getAll({ search: searchTerm });
      setStaff(response.data);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = () => {
    setEditingStaff(null);
    setIsStaffModalOpen(true);
  };

  const handleEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setIsStaffModalOpen(true);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      await staffAPI.delete(staffId);
      setStaff(staff.filter((s) => s.id !== staffId));
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("Failed to delete staff member. Please try again.");
    }
  };

  const handleToggleStatus = async (staffId: string) => {
    try {
      const response = await staffAPI.toggleStatus(staffId);
      setStaff(staff.map((s) => (s.id === staffId ? response.data.staff : s)));
    } catch (error) {
      console.error("Error toggling staff status:", error);
      alert("Failed to update staff status. Please try again.");
    }
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPermissionName = (permissionId: string) => {
    const permission = AVAILABLE_PERMISSIONS.find((p) => p.id === permissionId);
    return permission ? permission.name : permissionId;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      ADMIN: "Admin",
      MANAGER: "Manager",
      STAFF: "Staff",
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Staff Management
                </h1>
                <p className="text-gray-600">
                  Manage staff accounts and permissions
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchStaff}
                disabled={loading}
                className="menubox-button-secondary flex items-center space-x-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleCreateStaff}
                className="menubox-button-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Staff</span>
              </button>
            </div>
          </div>

          {/* Search and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="menubox-input pl-10 w-full"
                />
              </div>
            </div>
            <div className="menubox-stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Staff
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {staff.length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div className="menubox-stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Staff
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {staff.filter((s) => s.isActive).length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="menubox-table">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="menubox-table-header">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Role & Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaff.map((staffMember) => (
                    <tr
                      key={staffMember.id}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {staffMember.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {staffMember.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {getRoleLabel(staffMember.role)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              staffMember.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {staffMember.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {staffMember.permissions
                            .slice(0, 3)
                            .map((permission) => (
                              <span
                                key={permission}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {getPermissionName(permission)}
                              </span>
                            ))}
                          {staffMember.permissions.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-600">
                              +{staffMember.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staffMember.lastLogin
                          ? formatDate(staffMember.lastLogin)
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* <button
                            onClick={() => handleToggleStatus(staffMember.id)}
                            className={`p-2 rounded-lg transition-colors duration-200 ${
                              staffMember.isActive
                                ? "text-red-600 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={
                              staffMember.isActive ? "Deactivate" : "Activate"
                            }
                          >
                            {staffMember.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button> */}
                          <button
                            onClick={() => handleEditStaff(staffMember)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staffMember.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete"
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
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No staff found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? "Try adjusting your search terms."
                  : "Get started by adding a new staff member."}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={handleCreateStaff}
                    className="menubox-button-primary flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Staff</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Staff Modal */}
      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staff={editingStaff}
        availablePermissions={AVAILABLE_PERMISSIONS}
        onSave={async (staffData) => {
          try {
            if (editingStaff) {
              const response = await staffAPI.update(
                editingStaff.id,
                staffData
              );
              setStaff(
                staff.map((s) =>
                  s.id === editingStaff.id ? response.data.staff : s
                )
              );
            } else {
              const response = await staffAPI.create(staffData);
              setStaff([...staff, response.data.staff]);
            }
            setIsStaffModalOpen(false);
          } catch (error) {
            console.error("Error saving staff:", error);
            alert("Failed to save staff member. Please try again.");
          }
        }}
      />
    </DashboardLayout>
  );
}
