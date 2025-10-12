"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { productOptionsAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface ProductOptionGroup {
  id: string;
  name: string;
  description?: string;
  selectionType: string;
  isRequired: boolean;
  sortOrder: number;
  parentGroupId?: string;
  isParent: boolean;
  level: number; // 1=Parent (Size), 2=Child (Color), 3=Grandchild (Material)
}

interface OptionGroupForm {
  name: string;
  description?: string;
  selectionType: string;
  isRequired: boolean;
  sortOrder: number;
  parentGroupId?: string;
  isParent: boolean;
  level: number;
}

interface OptionGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  optionGroup?: ProductOptionGroup | null;
  optionGroups: ProductOptionGroup[]; // All existing option groups for parent selection
  onSaved: () => void;
}

export default function OptionGroupModal({
  isOpen,
  onClose,
  productId,
  optionGroup,
  optionGroups,
  onSaved,
}: OptionGroupModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!optionGroup;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OptionGroupForm>();

  useEffect(() => {
    if (isOpen) {
      if (optionGroup) {
        reset({
          name: optionGroup.name,
          description: optionGroup.description || "",
          selectionType: optionGroup.selectionType,
          isRequired: optionGroup.isRequired,
          sortOrder: optionGroup.sortOrder,
          parentGroupId: optionGroup.parentGroupId || "",
          isParent: optionGroup.isParent,
          level: optionGroup.level,
        });
      } else {
        reset({
          name: "",
          description: "",
          selectionType: "SINGLE",
          isRequired: false,
          sortOrder: 0,
          parentGroupId: "",
          isParent: false,
          level: 1,
        });
      }
    }
  }, [isOpen, optionGroup, reset]);

  const onSubmit = async (data: OptionGroupForm) => {
    setIsLoading(true);

    try {
      // Calculate level from selected parent; preserve user's Group Type (isParent)
      const formData: OptionGroupForm = { ...data } as any;
      const parentId = data.parentGroupId || "";
      if (parentId) {
        const parentGroup = optionGroups.find((g) => g.id === parentId);
        formData.level = (parentGroup?.level || 0) + 1;
      } else {
        formData.level = 1;
      }
      // Ensure boolean for isParent regardless of Select returning string
      formData.isParent =
        (data.isParent as any) === true || (data.isParent as any) === "true";

      if (isEditing && optionGroup) {
        await productOptionsAPI.updateOptionGroup(optionGroup.id, formData);
        toast.success("Option group updated successfully");
      } else {
        await productOptionsAPI.createOptionGroup(productId, formData);
        toast.success("Option group created successfully");
      }
      // Notify other components to refresh hierarchical data
      try {
        window.dispatchEvent(
          new CustomEvent("product-options:changed", { detail: { productId } })
        );
      } catch (e) {
        // no-op for SSR
      }
      onSaved();
    } catch (error) {
      console.error("Save option group error:", error);
      toast.error("Failed to save option group");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full overflow-y-auto max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">⚙️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {isEditing ? "Edit Option Group" : "Add Option Group"}
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
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <input
                {...register("name", {
                  required: "Group name is required",
                  maxLength: {
                    value: 100,
                    message: "Group name must not exceed 100 characters",
                  },
                })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Size, Toppings"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register("description", {
                  maxLength: {
                    value: 500,
                    message: "Description must not exceed 500 characters",
                  },
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Selection Type and Requirement */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selection Type
                </label>
                <select
                  {...register("selectionType", {
                    required: "Selection type is required",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="SINGLE">Single Choice</option>
                  <option value="MULTIPLE">Multiple Choice</option>
                </select>
                {errors.selectionType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.selectionType.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirement
                </label>
                <select
                  {...register("isRequired")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="false">Optional</option>
                  <option value="true">Required</option>
                </select>
              </div>
            </div>

            {/* Sort Order */}
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

            {/* Hierarchical Stock Fields */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Stock Management
              </h4>

              {/* Parent Group Selection */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Group
                  </label>
                  <select
                    {...register("parentGroupId")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Parent (Top Level)</option>
                    {optionGroups
                      .filter(
                        (group) =>
                          group.isParent && group.id !== optionGroup?.id
                      )
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select a parent group for hierarchical stock management
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Type
                  </label>
                  <select
                    {...register("isParent")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="false">Child Group</option>
                    <option value="true">Parent Group</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Parent groups can have child groups allocated from them
                  </p>
                </div>
              </div>

              {/* Level Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hierarchy Level
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                  <span className="text-sm text-gray-700">
                    Level{" "}
                    {watch("parentGroupId")
                      ? (optionGroups.find(
                          (g) => g.id === watch("parentGroupId")
                        )?.level || 1) + 1
                      : 1}
                    {watch("parentGroupId")
                      ? " (Child Group)"
                      : " (Parent Group)"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Stock is now tracked only at the individual option level.
                  Group totals are calculated automatically by summing option
                  stocks.
                </p>
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading
                  ? "Saving..."
                  : isEditing
                  ? "Update Group"
                  : "Save Group"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
