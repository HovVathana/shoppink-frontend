"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface PermissionContextType {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canViewDashboard: () => boolean;
  canViewProducts: () => boolean;
  canCreateProducts: () => boolean;
  canEditProducts: () => boolean;
  canDeleteProducts: () => boolean;
  canAccessProductsForOrders: () => boolean;
  canAccessDriversForOrders: () => boolean;
  canViewOrders: () => boolean;
  canCreateOrders: () => boolean;
  canEditOrders: () => boolean;
  canDeleteOrders: () => boolean;
  canViewCategories: () => boolean;
  canCreateCategories: () => boolean;
  canEditCategories: () => boolean;
  canDeleteCategories: () => boolean;
  canViewDrivers: () => boolean;
  canCreateDrivers: () => boolean;
  canEditDrivers: () => boolean;
  canDeleteDrivers: () => boolean;
  canViewStaff: () => boolean;
  canCreateStaff: () => boolean;
  canEditStaff: () => boolean;
  canDeleteStaff: () => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, admin } = useAuth();

  // Use user if available, fallback to admin for backward compatibility
  const currentUser = user || admin;

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;

    // Admin role bypasses all permission checks
    if (currentUser.role === "ADMIN") return true;

    // Check if user has the specific permission
    return currentUser.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!currentUser) return false;

    // Admin role bypasses all permission checks
    if (currentUser.role === "ADMIN") return true;

    // Check if user has any of the permissions
    return permissions.some((permission) =>
      currentUser.permissions?.includes(permission)
    );
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!currentUser) return false;

    // Admin role bypasses all permission checks
    if (currentUser.role === "ADMIN") return true;

    // Check if user has all of the permissions
    return permissions.every((permission) =>
      currentUser.permissions?.includes(permission)
    );
  };

  // Dashboard permissions
  const canViewDashboard = () => hasPermission("view_dashboard");

  // Product permissions
  const canViewProducts = () => hasPermission("view_products");
  const canCreateProducts = () => hasPermission("create_products");
  const canEditProducts = () => hasPermission("edit_products");
  const canDeleteProducts = () => hasPermission("delete_products");

  // Special permissions for order creation - can access products/drivers if can create/edit orders
  const canAccessProductsForOrders = () =>
    hasAnyPermission(["view_products", "create_orders", "edit_orders"]);
  const canAccessDriversForOrders = () =>
    hasAnyPermission(["view_drivers", "create_orders", "edit_orders"]);

  // Order permissions
  const canViewOrders = () => hasPermission("view_orders");
  const canCreateOrders = () => hasPermission("create_orders");
  const canEditOrders = () => hasPermission("edit_orders");
  const canDeleteOrders = () => hasPermission("delete_orders");

  // Category permissions
  const canViewCategories = () => hasPermission("view_categories");
  const canCreateCategories = () => hasPermission("create_categories");
  const canEditCategories = () => hasPermission("edit_categories");
  const canDeleteCategories = () => hasPermission("delete_categories");

  // Driver permissions
  const canViewDrivers = () => hasPermission("view_drivers");
  const canCreateDrivers = () => hasPermission("create_drivers");
  const canEditDrivers = () => hasPermission("edit_drivers");
  const canDeleteDrivers = () => hasPermission("delete_drivers");

  // Staff permissions
  const canViewStaff = () => hasPermission("view_staff");
  const canCreateStaff = () => hasPermission("create_staff");
  const canEditStaff = () => hasPermission("edit_staff");
  const canDeleteStaff = () => hasPermission("delete_staff");

  const value = {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canViewDashboard,
    canViewProducts,
    canCreateProducts,
    canEditProducts,
    canDeleteProducts,
    canAccessProductsForOrders,
    canAccessDriversForOrders,
    canViewOrders,
    canCreateOrders,
    canEditOrders,
    canDeleteOrders,
    canViewCategories,
    canCreateCategories,
    canEditCategories,
    canDeleteCategories,
    canViewDrivers,
    canCreateDrivers,
    canEditDrivers,
    canDeleteDrivers,
    canViewStaff,
    canCreateStaff,
    canEditStaff,
    canDeleteStaff,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}

// Higher-order component for permission-based rendering
export function withPermission<T extends object>(
  Component: React.ComponentType<T>,
  permission: string | string[],
  fallback?: React.ComponentType<T> | null
) {
  return function PermissionWrappedComponent(props: T) {
    const { hasPermission, hasAnyPermission } = usePermissions();

    const hasRequiredPermission = Array.isArray(permission)
      ? hasAnyPermission(permission)
      : hasPermission(permission);

    if (!hasRequiredPermission) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent {...props} />;
      }
      return null;
    }

    return <Component {...props} />;
  };
}

// Component for conditional rendering based on permissions
export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  let hasRequiredPermission = false;

  if (permission) {
    hasRequiredPermission = hasPermission(permission);
  } else if (permissions) {
    hasRequiredPermission = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  return hasRequiredPermission ? <>{children}</> : <>{fallback}</>;
}
