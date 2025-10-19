"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { productOptionsAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface ProductOption {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceType: string;
  priceValue?: number;
  isDefault: boolean;
  isAvailable: boolean;
  stock: number;
  sortOrder: number;
}

interface OptionForm {
  name: string;
  description?: string;
  priceType: string;
  priceValue?: number;
  isDefault: boolean;
  isAvailable: boolean;
  stock: number;
  sortOrder: number;
}

interface OptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  option?: ProductOption | null;
  onSaved: () => void;
}

export default function OptionModal({
  isOpen,
  onClose,
  groupId,
  option,
  onSaved,
}: OptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const isEditing = !!option;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OptionForm>();

  const priceType = watch("priceType");

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  useEffect(() => {
    if (isOpen) {
      if (option) {
        reset({
          name: option.name,
          description: option.description || "",
          priceType: option.priceType,
          priceValue: option.priceValue || 0,
          isDefault: option.isDefault,
          isAvailable: option.isAvailable,
          stock: option.stock,
          sortOrder: option.sortOrder,
        });
        // Set existing image if available
        setImagePreview(option.imageUrl || "");
        setImageFile(null);
      } else {
        reset({
          name: "",
          description: "",
          priceType: "BASE",
          priceValue: 0,
          isDefault: false,
          isAvailable: true,
          stock: 0,
          sortOrder: 0,
        });
        setImagePreview("");
        setImageFile(null);
      }
    }
  }, [isOpen, option, reset]);

  const onSubmit = async (data: OptionForm) => {
    setIsLoading(true);

    try {
      // Clean up priceValue based on priceType
      const cleanedData = {
        ...data,
        priceValue: ["BASE", "FIXED", "PERCENTAGE"].includes(data.priceType)
          ? data.priceValue
          : null,
      };

      // Remove priceValue from the payload if it's not needed
      if (!["BASE", "FIXED", "PERCENTAGE"].includes(data.priceType)) {
        delete cleanedData.priceValue;
      }

      // Create FormData for file upload
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(cleanedData).forEach((key) => {
        const value = cleanedData[key as keyof typeof cleanedData];
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Add image file if selected
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (isEditing && option) {
        await productOptionsAPI.updateOptionWithImage(option.id, formData);
        toast.success("Option updated successfully");
      } else {
        await productOptionsAPI.createOptionWithImage(groupId, formData);
        toast.success("Option created successfully");
      }
      onSaved();
    } catch (error) {
      console.error("Save option error:", error);
      toast.error("Failed to save option");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🏷️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {isEditing ? "Edit Option" : "Add Option"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Option Name and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Option Name *
                </label>
                <input
                  {...register("name", {
                    required: "Option name is required",
                    maxLength: {
                      value: 100,
                      message: "Option name must not exceed 100 characters",
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Small, Large"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  {...register("description", {
                    maxLength: {
                      value: 500,
                      message: "Description must not exceed 500 characters",
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Option Image (Optional)
              </label>
              <div className="space-y-3">
                {/* Current/Preview Image */}
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Option preview"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                
                {/* File Input */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500">
                  Upload an image for this option (e.g., color swatch, variant photo)
                </p>
              </div>
            </div>

            {/* Price Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Type
              </label>
              <select
                {...register("priceType", {
                  required: "Price type is required",
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="FREE">Free (No charge)</option>
                <option value="BASE">
                  Base Price (e.g., Small $2.50, Large $5.00)
                </option>
                <option value="FIXED">
                  Add Fixed Amount (e.g., +$0.50 for extra shot)
                </option>
                <option value="PERCENTAGE">
                  Add Percentage (e.g., +10% for premium)
                </option>
              </select>
              {errors.priceType && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.priceType.message}
                </p>
              )}
            </div>

            {/* Price Value (for BASE, FIXED and PERCENTAGE) */}
            {["BASE", "FIXED", "PERCENTAGE"].includes(priceType) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {priceType === "BASE"
                    ? "Base Price ($)"
                    : priceType === "FIXED"
                    ? "Additional Amount ($)"
                    : "Percentage (%)"}
                </label>
                <input
                  {...register("priceValue", {
                    required: "Price value is required for this price type",
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: "Price value must be 0 or greater",
                    },
                  })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={
                    priceType === "BASE" || priceType === "FIXED" ? "0.00" : "0"
                  }
                />
                {errors.priceValue && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.priceValue.message}
                  </p>
                )}
              </div>
            )}

            {/* Stock and Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock
                </label>
                <input
                  {...register("stock", {
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: "Stock must be 0 or greater",
                    },
                  })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.stock.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  {...register("sortOrder", {
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: "Sort order must be 0 or greater",
                    },
                  })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                {errors.sortOrder && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.sortOrder.message}
                  </p>
                )}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  {...register("isDefault")}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Default
                </label>
              </div>

              <div className="flex items-center">
                <input
                  {...register("isAvailable")}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Available
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading
                  ? "Saving..."
                  : isEditing
                  ? "Save Option"
                  : "Save Option"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
