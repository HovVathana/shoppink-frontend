"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { driversAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { cache } from "@/utils/simpleCache";

interface DriverForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  licenseNumber: string;
  isActive: boolean;
}

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  driver?: any;
  isEditing: boolean;
}

export default function DriverModal({
  isOpen,
  onClose,
  onSaved,
  driver,
  isEditing,
}: DriverModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DriverForm>();

  useEffect(() => {
    if (isOpen) {
      if (isEditing && driver) {
        reset({
          name: driver.name || "",
          phone: driver.phone || "",
          email: driver.email || "",
          address: driver.address || "",
          licenseNumber: driver.licenseNumber || "",
          isActive: driver.isActive !== undefined ? driver.isActive : true,
        });
      } else {
        reset({
          name: "",
          phone: "",
          email: "",
          address: "",
          licenseNumber: "",
          isActive: true,
        });
      }
    }
  }, [isOpen, isEditing, driver, reset]);

  const onSubmit = async (data: DriverForm) => {
    setIsLoading(true);
    try {
      if (isEditing && driver) {
        await driversAPI.update(driver.id, data);
        toast.success("Driver updated successfully");
      } else {
        await driversAPI.create(data);
        toast.success("Driver created successfully");
      }

      // Clear the drivers cache so it gets refreshed everywhere

      cache.clear("drivers");

      // Dispatch event to notify all components that drivers were updated
      window.dispatchEvent(new CustomEvent("driversUpdated"));

      onSaved();
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        `Failed to ${isEditing ? "update" : "create"} driver`;
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom menubox-card text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🚚</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Edit Driver" : "Add New Driver"}
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  {...register("name", { required: "Name is required" })}
                  type="text"
                  className="menubox-input w-full"
                  placeholder="Enter driver name"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  {...register("phone", { required: "Phone is required" })}
                  type="tel"
                  className="menubox-input w-full"
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  {...register("email", {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                  type="email"
                  className="input-field mt-1"
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  {...register("address")}
                  rows={2}
                  className="input-field mt-1"
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  License Number
                </label>
                <input
                  {...register("licenseNumber")}
                  type="text"
                  className="input-field mt-1"
                  placeholder="Enter license number"
                />
              </div>

              <div className="flex items-center">
                <input
                  {...register("isActive")}
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Active Driver
                </label>
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
                    "Update Driver"
                  ) : (
                    "Create Driver"
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
