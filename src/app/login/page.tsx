"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Mail, Lock, ShoppingBag } from "lucide-react";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard/orders");
    }
  }, [isAuthenticated, loading, router]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="menubox-card p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side – Brand Info */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#C2E8F8] to-[#C2E8F8] text-black flex-col justify-between p-16 relative overflow-hidden">
        {/* Decorative subtle lines */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_30%,white,transparent_40%)]"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]"></div>

        {/* Content */}
        <div className="w-full relative z-10 text-center flex flex-col justify-center h-full">
          <img
            src="/ecommerce_pic.png"
            alt="EzCloud Logo"
            className="w-[70%] mx-auto h-auto mb-8"
          />
          <h1 className="text-3xl font-extrabold leading-tight">EzCloud</h1>
          <p className="text-lg text-slate-800 leading-relaxed">
            Simplify your workflow and manage your business smarter. Automate
            operations, track progress, and save hours of manual work.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-slate-700">
          © 2025 EzCloud. All rights reserved.
        </div>
      </div>

      {/* Right Side – Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-8 sm:px-12">
        <div className="w-full max-w-md space-y-10">
          {/* Logo (Mobile) */}
          <div className="text-center mb-4">
            <img
              src="/ezcloud_logo.png"
              alt="EzCloud Logo"
              className="w-auto h-16 mx-auto mb-2"
            />
          </div>

          {/* Header */}
          <div>
            <h2 className="text-3xl text-center font-bold text-gray-900">
              Welcome Back!
            </h2>
          </div>

          {/* Form */}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="menubox-form-section">
              <div className="menubox-form-group">
                <label htmlFor="email" className="menubox-form-label">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    type="email"
                    autoComplete="email"
                    className="menubox-input pl-12 w-full"
                    placeholder="Enter your email address"
                  />
                </div>
                {errors.email && (
                  <div className="menubox-form-error">
                    <span>{errors.email.message}</span>
                  </div>
                )}
              </div>

              <div className="menubox-form-group">
                <label htmlFor="password" className="menubox-form-label">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="menubox-input pl-12 pr-12 w-full"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div className="menubox-form-error">
                    <span>{errors.password.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="menubox-button-primary w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
