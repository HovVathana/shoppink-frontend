import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { PageStateProvider } from "@/contexts/PageStateContext";
import { CartProvider } from "@/contexts/CartContext";
import { BlacklistProvider } from "@/contexts/BlacklistContext";
import { DriversProvider } from "@/contexts/DriversContext";
import { Toaster } from "react-hot-toast";

const dm_sans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShopPink - Admin Dashboard",
  description: "Online shopping product management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={dm_sans.className}>
        <AuthProvider>
          <PermissionProvider>
            <PageStateProvider>
              <BlacklistProvider>
                <DriversProvider>
                  <CartProvider>{children}</CartProvider>
                </DriversProvider>
              </BlacklistProvider>
            </PageStateProvider>
          </PermissionProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
