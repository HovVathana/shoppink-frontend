"use client";

import React, { useState } from "react";
import { Plus, Package } from "lucide-react";
import { productOptionsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import OptionGroupModal from "./OptionGroupModal";
import OptionModal from "./OptionModal";
import HierarchicalStockTree from "./HierarchicalStockTree";

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

interface ProductOptionGroup {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  selectionType: string;
  isRequired: boolean;
  sortOrder: number;
  parentGroupId?: string;
  isParent: boolean;
  level: number; // 1=Parent, 2=Child, 3=Grandchild, etc. - Flexible naming!
  options: ProductOption[];
  childGroups?: ProductOptionGroup[];
}

interface ProductOptionsManagerProps {
  productId: string;
  optionGroups: ProductOptionGroup[];
  onUpdate: () => void;
}

export default function ProductOptionsManager({
  productId,
  optionGroups,
  onUpdate,
}: ProductOptionsManagerProps) {
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductOptionGroup | null>(
    null
  );
  const [editingOption, setEditingOption] = useState<ProductOption | null>(
    null
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: ProductOptionGroup) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this option group? This will also delete all its options."
      )
    ) {
      return;
    }

    try {
      await productOptionsAPI.deleteOptionGroup(groupId);
      toast.success("Option group deleted successfully");
      onUpdate();
    } catch (error) {
      console.error("Delete group error:", error);
      toast.error("Failed to delete option group");
    }
  };

  const handleCreateOption = (groupId: string) => {
    setSelectedGroupId(groupId);
    setEditingOption(null);
    setIsOptionModalOpen(true);
  };

  const handleEditOption = (option: ProductOption, groupId: string) => {
    setSelectedGroupId(groupId);
    setEditingOption(option);
    setIsOptionModalOpen(true);
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm("Are you sure you want to delete this option?")) {
      return;
    }

    try {
      await productOptionsAPI.deleteOption(optionId);
      toast.success("Option deleted successfully");
      onUpdate();
    } catch (error) {
      console.error("Delete option error:", error);
      toast.error("Failed to delete option");
    }
  };

  const handleCreateProperStructure = async () => {
    try {
      // Find Size and Color groups
      const sizeGroup = optionGroups.find((g) => g.name === "Size");
      const colorGroup = optionGroups.find((g) => g.name === "Color");

      if (!sizeGroup) {
        toast.error("Size group must exist first");
        return;
      }

      // Delete existing Color group if it exists (we'll recreate it properly)
      if (colorGroup) {
        await productOptionsAPI.deleteOptionGroup(colorGroup.id);
      }

      // Delete existing Size options if they exist (we'll convert them to sub-groups)
      for (const option of sizeGroup.options) {
        await productOptionsAPI.deleteOption(option.id);
      }

      // Create proper nested structure: Size -> [Small, Medium] -> Color -> [White, Black]
      const sizeOptions = ["Small", "Medium"];

      for (const sizeName of sizeOptions) {
        // Create a sub-group for each size
        const sizeSubGroup = await productOptionsAPI.createOptionGroup({
          name: sizeName,
          description: `${sizeName} size variants`,
          selectionType: "single",
          isRequired: true,
          sortOrder: sizeOptions.indexOf(sizeName),
          parentGroupId: sizeGroup.id,
          isParent: false,
          level: 2,
          productId: productId,
        });

        // Create a Color group under each size
        const colorSubGroup = await productOptionsAPI.createOptionGroup({
          name: "Color",
          description: `Color options for ${sizeName}`,
          selectionType: "single",
          isRequired: true,
          sortOrder: 0,
          parentGroupId: sizeSubGroup.id,
          isParent: false,
          level: 3,
          productId: productId,
        });

        // Create color options for this size
        const colorOptions = ["White", "Black"];
        for (const colorName of colorOptions) {
          await productOptionsAPI.createOption({
            name: colorName,
            description: `${colorName} ${sizeName}`,
            priceType: "fixed",
            priceValue: 0,
            isDefault: false,
            isAvailable: true,
            stock: 0,
            sortOrder: colorOptions.indexOf(colorName),
            groupId: colorSubGroup.id,
          });
        }
      }

      toast.success(
        "Perfect nested structure created! Each size now has its own color options."
      );
      onUpdate();
    } catch (error) {
      console.error("Create structure error:", error);
      toast.error("Failed to create structure");
    }
  };

  // Calculate hierarchical total stock - sum only the outer 2 levels (parent level)
  const getTotalStock = () => {
    // Find parent groups (level 1 or no parent)
    const parentGroups = optionGroups.filter((group) => !group.parentGroupId);

    if (parentGroups.length > 0) {
      // Sum only parent group options to avoid double counting
      return parentGroups.reduce((total, group) => {
        return (
          total +
          group.options.reduce(
            (groupTotal, option) => groupTotal + option.stock,
            0
          )
        );
      }, 0);
    }

    // Fallback: sum all options if no clear hierarchy
    return optionGroups.reduce((total, group) => {
      return (
        total +
        group.options.reduce(
          (groupTotal, option) => groupTotal + option.stock,
          0
        )
      );
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Product Options
          </h3>
          <p className="text-sm text-gray-600">
            Create flexible hierarchical options with any naming you want. Drag
            groups to reorder or move them under other groups.
            <br />
            Examples: Brand → Model → Color, Category → Type → Material, Size →
            Color → Wheels, etc.
          </p>
        </div>
        <button
          onClick={handleCreateGroup}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Group</span>
        </button>
      </div>

      {/* Stock Overview */}
      {optionGroups.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-gray-600">Total Groups:</span>
              <span className="font-semibold text-gray-800">
                {optionGroups.length}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-gray-600">Total Options:</span>
              <span className="font-semibold text-blue-600">
                {optionGroups.reduce(
                  (total, group) => total + group.options.length,
                  0
                )}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-gray-600">Total Stock:</span>
              <span className="font-semibold text-green-600">
                {getTotalStock()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Tree View */}
      {optionGroups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Option Groups Yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create hierarchical option groups to organize your product variants
            with flexible naming.
            <br />
            Examples: Brand → Model → Color, Category → Type → Material, Size →
            Color → Wheels, etc.
          </p>
          <button
            onClick={handleCreateGroup}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Group</span>
          </button>
        </div>
      ) : (
        /* Hierarchical Tree View */
        <HierarchicalStockTree
          productId={productId}
          optionGroups={optionGroups}
          onUpdate={onUpdate}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
          onCreateOption={handleCreateOption}
          onEditOption={handleEditOption}
          onDeleteOption={handleDeleteOption}
        />
      )}

      {/* Modals */}
      <OptionGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        productId={productId}
        optionGroup={editingGroup}
        optionGroups={optionGroups}
        onSaved={() => {
          setIsGroupModalOpen(false);
          onUpdate();
        }}
      />

      <OptionModal
        isOpen={isOptionModalOpen}
        onClose={() => setIsOptionModalOpen(false)}
        groupId={selectedGroupId}
        option={editingOption}
        onSaved={() => {
          setIsOptionModalOpen(false);
          onUpdate();
        }}
      />
    </div>
  );
}
