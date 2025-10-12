"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Shield, User, Mail, UserCog } from "lucide-react";

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
}

interface StaffFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  isActive: boolean;
  permissions: string[];
}

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: Staff | null;
  availablePermissions: Permission[];
  onSave: (data: StaffFormData) => void;
}

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
];

const ROLE_PERMISSIONS = {
  ADMIN: [
    "view_dashboard",
    "view_products",
    "create_products",
    "edit_products",
    "delete_products",
    "view_orders",
    "create_orders",
    "edit_orders",
    "delete_orders",
    "view_categories",
    "create_categories",
    "edit_categories",
    "delete_categories",
    "view_drivers",
    "create_drivers",
    "edit_drivers",
    "delete_drivers",
    "view_staff",
    "create_staff",
    "edit_staff",
    "delete_staff",
  ],
  MANAGER: [
    "view_dashboard",
    "view_products",
    "create_products",
    "edit_products",
    "view_orders",
    "create_orders",
    "edit_orders",
    "view_categories",
    "create_categories",
    "edit_categories",
    "view_drivers",
    "create_drivers",
    "edit_drivers",
  ],
  STAFF: ["view_products", "view_orders", "view_categories", "view_drivers"],
};

export default function StaffModal({
  isOpen,
  onClose,
  staff,
  availablePermissions,
  onSave,
}: StaffModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const isEditing = !!staff;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<StaffFormData>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "STAFF",
      isActive: true,
      permissions: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (staff) {
        setValue("name", staff.name);
        setValue("email", staff.email);
        setValue("role", staff.role);
        setValue("isActive", staff.isActive);
        setSelectedPermissions(staff.permissions);
      } else {
        reset();
        setSelectedPermissions([]);
      }
    }
  }, [isOpen, staff, setValue, reset]);

  // Watch for role changes and auto-fill permissions
  const watchedRole = watch("role");
  useEffect(() => {
    if (
      watchedRole &&
      ROLE_PERMISSIONS[watchedRole as keyof typeof ROLE_PERMISSIONS]
    ) {
      setSelectedPermissions(
        ROLE_PERMISSIONS[watchedRole as keyof typeof ROLE_PERMISSIONS]
      );
    }
  }, [watchedRole]);

  const onSubmit = async (data: StaffFormData) => {
    try {
      setIsLoading(true);

      const staffData = {
        ...data,
        permissions: selectedPermissions,
      };

      // Remove password field if editing and password is empty
      if (isEditing && !data.password) {
        delete staffData.password;
      }

      onSave(staffData);
    } catch (error) {
      console.error("Error saving staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAllPermissions = () => {
    if (selectedPermissions.length === availablePermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(availablePermissions.map((p) => p.id));
    }
  };

  const getPermissionsByCategory = () => {
    const categories = {
      dashboard: availablePermissions.filter((p) => p.id.includes("dashboard")),
      products: availablePermissions.filter((p) => p.id.includes("product")),
      orders: availablePermissions.filter((p) => p.id.includes("order")),
      categories: availablePermissions.filter((p) =>
        p.id.includes("categories")
      ),
      drivers: availablePermissions.filter((p) => p.id.includes("driver")),
      staff: availablePermissions.filter((p) => p.id.includes("staff")),
    };
    return categories;
  };

  if (!isOpen) return null;

  const categories = getPermissionsByCategory();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom menubox-card text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Edit Staff Member" : "Add New Staff Member"}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register("name", { required: "Name is required" })}
                      type="text"
                      className="menubox-input pl-10 w-full"
                      placeholder="Enter full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                      type="email"
                      className="menubox-input pl-10 w-full"
                      placeholder="Enter email address"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {isEditing
                      ? "New Password (leave blank to keep current)"
                      : "Password *"}
                  </label>
                  <input
                    {...register("password", {
                      required: !isEditing ? "Password is required" : false,
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    type="password"
                    className="menubox-input w-full"
                    placeholder={
                      isEditing ? "Enter new password" : "Enter password"
                    }
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role *
                  </label>
                  <div className="relative">
                    <UserCog className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      {...register("role", { required: "Role is required" })}
                      className="menubox-input pl-10 w-full"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.role && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.role.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                <input
                  {...register("isActive")}
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="block text-sm font-medium text-gray-900">
                  Active Account
                </label>
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-indigo-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      Permissions
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllPermissions}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {selectedPermissions.length === availablePermissions.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Dashboard Permissions */}
                  {categories.dashboard.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Dashboard Access
                      </h5>
                      <div className="grid grid-cols-1 gap-3">
                        {categories.dashboard.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(
                                permission.id
                              )}
                              onChange={() =>
                                handlePermissionToggle(permission.id)
                              }
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Permissions */}
                  {categories.products.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Product Management
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.products.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(
                                permission.id
                              )}
                              onChange={() =>
                                handlePermissionToggle(permission.id)
                              }
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order Permissions */}
                  {categories.orders.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Order Management
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.orders.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(
                                permission.id
                              )}
                              onChange={() =>
                                handlePermissionToggle(permission.id)
                              }
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Permissions */}
                  {categories.categories.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Category Management
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.categories.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(
                                permission.id
                              )}
                              onChange={() =>
                                handlePermissionToggle(permission.id)
                              }
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Driver Permissions */}
                  {categories.drivers.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Driver Management
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.drivers.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(
                                permission.id
                              )}
                              onChange={() =>
                                handlePermissionToggle(permission.id)
                              }
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff Permissions */}
                  {categories.staff.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Staff Management
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.staff.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(
                                permission.id
                              )}
                              onChange={() =>
                                handlePermissionToggle(permission.id)
                              }
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
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
                  className="menubox-button-primary"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEditing ? "Updating..." : "Creating..."}
                    </div>
                  ) : isEditing ? (
                    "Update Staff"
                  ) : (
                    "Create Staff"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
