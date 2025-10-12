"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { categoriesAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface CategoryForm {
  name: string;
  description: string;
  isActive: boolean;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSaved: () => void;
}

export default function CategoryModal({
  isOpen,
  onClose,
  category,
  onSaved,
}: CategoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryForm>();

  useEffect(() => {
    if (isOpen) {
      if (category) {
        reset({
          name: category.name,
          description: category.description || "",
          isActive: category.isActive,
        });
      } else {
        reset({
          name: "",
          description: "",
          isActive: true,
        });
      }
    }
  }, [isOpen, category, reset]);

  const onSubmit = async (data: CategoryForm) => {
    setIsLoading(true);
    try {
      if (isEditing && category) {
        await categoriesAPI.update(category.id, data);
        toast.success("Category updated successfully");
      } else {
        await categoriesAPI.create(data);
        toast.success("Category created successfully");
      }
      onSaved();
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to save category";
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
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📁</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Edit Category" : "Add New Category"}
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
                  Category Name *
                </label>
                <input
                  {...register("name", {
                    required: "Category name is required",
                  })}
                  type="text"
                  className="menubox-input w-full"
                  placeholder="Enter category name"
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
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="menubox-input w-full resize-none"
                  placeholder="Enter category description (optional)"
                />
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                <input
                  {...register("isActive")}
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="block text-sm font-medium text-gray-900">
                  Category is active
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
                    "Update Category"
                  ) : (
                    "Create Category"
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
