"use client";

import { useState, ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import EditProfileModal from "@/components/Profile/EditProfileModal";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Search,
  ShieldAlert,
  Menu,
  LogOut,
  User,
  ShoppingBag,
  Folder,
  Truck,
  ClipboardList,
  Users,
  RefreshCw,
  UserPlus,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const allNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    shortName: "Home",
    permission: "view_dashboard",
  },
  {
    name: "Categories",
    href: "/dashboard/categories",
    icon: Folder,
    shortName: "Categories",
    permission: "view_categories",
  },
  {
    name: "Products",
    href: "/dashboard/products",
    icon: Package,
    shortName: "Products",
    permission: "view_products",
  },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    shortName: "Orders",
    permission: "view_orders",
  },
  {
    name: "Assigned Orders",
    href: "/dashboard/assigned",
    icon: ClipboardList,
    shortName: "Assigned",
    permission: "view_orders",
  },
  {
    name: "Customer Orders",
    href: "/dashboard/customer-orders",
    icon: Users,
    shortName: "Customer",
    permission: "view_orders",
  },
  {
    name: "Assign Orders",
    href: "/dashboard/assign-orders",
    icon: UserPlus,
    shortName: "Assign",
    permission: "edit_orders",
  },
  {
    name: "Change Status",
    href: "/dashboard/change-status",
    icon: RefreshCw,
    shortName: "Status",
    permission: "edit_orders",
  },
  {
    name: "Batch Search",
    href: "/dashboard/batch-search",
    icon: Search,
    shortName: "Search",
    permission: "view_orders",
  },
  {
    name: "Blacklist Phones",
    href: "/dashboard/blacklist-phones",
    icon: ShieldAlert,
    shortName: "Blacklist",
    permission: "view_orders",
  },
  {
    name: "Drivers",
    href: "/dashboard/drivers",
    icon: Truck,
    shortName: "Drivers",
    permission: "view_drivers",
  },
  {
    name: "Staff",
    href: "/dashboard/staff",
    icon: Users,
    shortName: "Staff",
    permission: "view_staff",
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { admin, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const pathname = usePathname();

  // Filter navigation items based on user permissions
  const navigation = allNavigation.filter((item) =>
    hasPermission(item.permission)
  );

  // Save current page to localStorage for state persistence
  useEffect(() => {
    if (pathname) {
      localStorage.setItem("dashboard-current-page", pathname);
    }
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Desktop sidebar */}
      <div
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 menubox-sidebar">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            <div
              className={`flex items-center flex-shrink-0 mb-8 transition-all duration-300 ${
                sidebarCollapsed
                  ? "px-4 justify-center"
                  : "px-6 justify-between"
              }`}
            >
              {!sidebarCollapsed && (
                <div className="flex items-center">
                  <img
                    src="/ezcloud_notext_logo.png"
                    className="w-[30px]"
                    alt=""
                  />

                  <span className="ml-3 text-xl font-bold text-white">
                    Shoppink
                  </span>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-xl bg-slate-600 hover:bg-slate-500 text-white hover:text-slate-200 transition-all duration-200"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? "menubox-sidebar-item-active"
                        : "menubox-sidebar-item"
                    } group flex items-center ${
                      sidebarCollapsed
                        ? "px-3 py-3 justify-center"
                        : "px-4 py-3"
                    } text-sm font-medium rounded-xl transition-all duration-200`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={`${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-white"
                      } ${
                        sidebarCollapsed ? "" : "mr-3"
                      } flex-shrink-0 h-5 w-5 transition-colors duration-200`}
                    />
                    {!sidebarCollapsed && item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div
            className={`flex-shrink-0 border-t border-black p-4 ${
              sidebarCollapsed ? "flex justify-center" : ""
            }`}
          >
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className={`flex items-center w-full p-2 rounded-xl hover:bg-slate-800 transition-all duration-200 cursor-pointer ${
                sidebarCollapsed ? "flex-col space-y-2" : ""
              }`}
              title="Edit Profile"
            >
              <div className="flex-shrink-0">
                {admin?.profilePicture ? (
                  <img
                    src={admin.profilePicture}
                    alt={admin.name}
                    className="h-10 w-10 rounded-2xl object-cover border-2 border-slate-600"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="ml-3 text-left">
                  <p className="text-sm font-semibold text-white">
                    {admin?.name}
                  </p>
                  <p className="text-xs text-slate-400">{admin?.role}</p>
                  {/* <p className="text-xs text-slate-400">{admin?.email}</p> */}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Desktop Top bar */}
        <div className="sticky top-0 z-10 hidden lg:flex flex-shrink-0 h-16 menubox-desktop-header">
          <div className="flex-1 px-6 flex justify-end items-center">
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto min-h-0">
          <div className="py-6 lg:py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
          <div className="mb-5 flex items-center justify-center">
            <h1 className="pt-1 font-thin text-gray-600">Powered by</h1>
            <img src="/ezcloud_logo.png" className="w-[100px]" alt="" />
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-tr from-[#070B34] to-[#070B34] border-t border-gray-200 z-50 safe-area-inset-bottom shadow-lg">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex justify-center px-2 py-2 min-w-max">
            {/* Profile Picture Button - First Item */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex flex-col items-center justify-center px-3 py-2 min-w-[70px] rounded-xl transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <div className="mb-1">
                {admin?.profilePicture ? (
                  <img
                    src={admin.profilePicture}
                    alt={admin.name}
                    className="h-8 w-8 rounded-full object-cover border-2 border-slate-600"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-slate-700 to-slate-800 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-center leading-tight transition-colors duration-200 whitespace-nowrap">
                Profile
              </span>
            </button>

            {/* Navigation Items */}
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center px-3 py-2 min-w-[70px] rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-slate-800 to-slate-700 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl mb-1 transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-slate-800 to-slate-700"
                        : "bg-transparent"
                    }`}
                  >
                    <item.icon
                      className={`h-4 w-4 transition-colors duration-200 ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium text-center leading-tight transition-colors duration-200 whitespace-nowrap ${
                      isActive ? "text-white" : "text-slate-400"
                    }`}
                  >
                    {(item as any).shortName || item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
