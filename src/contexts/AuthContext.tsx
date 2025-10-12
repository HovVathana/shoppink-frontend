"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { authAPI } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  admin: User | null; // Keep as 'admin' for backward compatibility
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;
  // Keep admin for backward compatibility
  const admin = user;

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authAPI.getMe();
      setUser(response.data.user);
    } catch (error) {
      console.error("Auth check failed:", error);
      // Only remove token and redirect if it's a 401 error
      if (error.response?.status === 401) {
        Cookies.remove("token");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password);
      const { user: userData, token } = response.data;

      // Store token in cookie
      Cookies.set("token", token, { expires: 1 }); // 1 day

      setUser(userData);
      toast.success("Login successful!");
      router.push("/dashboard");
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return false;
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    try {
      const response = await authAPI.signup(email, password, name);
      const { user: userData, token } = response.data;

      // Store token in cookie
      Cookies.set("token", token, { expires: 1 }); // 1 day

      setUser(userData);
      toast.success("Account created successfully!");
      router.push("/dashboard");
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || "Signup failed";
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    Cookies.remove("token");
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const value = {
    admin, // Keep for backward compatibility
    user,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
