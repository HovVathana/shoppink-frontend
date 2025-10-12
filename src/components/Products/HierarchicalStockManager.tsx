"use client";

import { useState, useEffect } from "react";
import { Package, AlertTriangle, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface ProductOption {
  id: string;
  name: string;
  description?: string;
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
  selectionType: string;
  isRequired: boolean;
  sortOrder: number;
  parentGroupId?: string;
  isParent: boolean;
  stock: number;
  totalStock?: number;
  options: ProductOption[];
  childGroups?: ProductOptionGroup[];
}

interface HierarchicalStockManagerProps {
  productId: string;
  optionGroups: ProductOptionGroup[];
  onUpdate: () => void;
}

export default function HierarchicalStockManager({
  productId,
  optionGroups,
  onUpdate,
}: HierarchicalStockManagerProps) {
  const [parentGroups, setParentGroups] = useState<ProductOptionGroup[]>([]);
  const [childGroups, setChildGroups] = useState<ProductOptionGroup[]>([]);

  useEffect(() => {
    // Separate parent and child groups
    const parents = optionGroups.filter((group) => group.isParent);
    const children = optionGroups.filter((group) => !group.isParent);

    setParentGroups(parents);
    setChildGroups(children);
  }, [optionGroups]);

  const getChildGroupsForParent = (parentGroupId: string) => {
    return childGroups.filter((group) => group.parentGroupId === parentGroupId);
  };

  const getParentOptionTotalStock = (
    parentGroup: ProductOptionGroup,
    parentOption: ProductOption
  ) => {
    // Calculate total stock allocated to child groups for this parent option
    const childGroupsForParent = getChildGroupsForParent(parentGroup.id);
    let totalAllocated = 0;

    childGroupsForParent.forEach((childGroup) => {
      // Use the group's stock instead of summing individual options
      totalAllocated += childGroup.stock;
    });

    return totalAllocated;
  };

  const getChildGroupTotalStock = (childGroup: ProductOptionGroup) => {
    // Calculate total stock allocated to individual options within this child group
    return childGroup.options.reduce(
      (total, option) => total + option.stock,
      0
    );
  };

  const getStockStatusColor = (stock: number, maxStock?: number) => {
    if (stock === 0) return "text-red-600";
    if (maxStock && stock > maxStock) return "text-red-600"; // Over-allocated
    if (stock <= 5) return "text-red-600";
    if (stock <= 10) return "text-yellow-600";
    return "text-green-600";
  };

  const getStockStatusBadge = (stock: number, maxStock?: number) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Out of Stock
        </span>
      );
    }

    if (maxStock && stock > maxStock) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Over-allocated
        </span>
      );
    }

    if (stock <= 5) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Critical
        </span>
      );
    }

    if (stock <= 10) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Low Stock
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        In Stock
      </span>
    );
  };

  if (optionGroups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>
          No option groups defined. Add option groups first to manage
          hierarchical stock.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Hierarchical Stock Management
          </h3>
          <p className="text-sm text-gray-500">
            Manage stock at parent level (e.g., Size) and allocate to child
            options (e.g., Colors)
          </p>
        </div>
      </div>

      {/* Parent Groups */}
      {parentGroups.map((parentGroup) => (
        <div
          key={parentGroup.id}
          className="border border-gray-200 rounded-lg p-6 bg-gray-50"
        >
          <div className="mb-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {parentGroup.name} (Parent Group)
            </h4>
            <p className="text-sm text-gray-600">{parentGroup.description}</p>
          </div>

          {/* Parent Options */}
          <div className="space-y-4">
            {parentGroup.options.map((parentOption) => {
              const childGroupsForParent = getChildGroupsForParent(
                parentGroup.id
              );
              const totalAllocated = getParentOptionTotalStock(
                parentGroup,
                parentOption
              );
              const available = parentOption.stock - totalAllocated;

              return (
                <div
                  key={parentOption.id}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  {/* Parent Option Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h5 className="font-medium text-gray-900">
                        {parentGroup.name}: {parentOption.name}
                      </h5>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">
                          Total Stock:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={parentOption.stock}
                          onChange={(e) => {
                            // Handle parent stock update
                            console.log(
                              `Update ${parentOption.name} stock to:`,
                              e.target.value
                            );
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        Allocated:{" "}
                        <span
                          className={getStockStatusColor(
                            totalAllocated,
                            parentOption.stock
                          )}
                        >
                          {totalAllocated}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Available:{" "}
                        <span className={getStockStatusColor(available)}>
                          {available}
                        </span>
                      </div>
                      {getStockStatusBadge(parentOption.stock)}
                    </div>
                  </div>

                  {/* Child Groups for this Parent Option */}
                  {childGroupsForParent.map((childGroup) => {
                    const childGroupAllocated = getChildGroupTotalStock(childGroup);
                    const childGroupAvailable = childGroup.stock - childGroupAllocated;

                    return (
                      <div
                        key={childGroup.id}
                        className="ml-6 border-l-2 border-blue-200 pl-4 mb-4"
                      >
                        {/* Child Group Header with Stock */}
                        <div className="flex items-center justify-between mb-3 p-2 bg-blue-50 rounded">
                          <h6 className="font-medium text-gray-800">
                            {childGroup.name} Group:
                          </h6>

                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">Group Stock:</label>
                              <input
                                type="number"
                                min="0"
                                max={available + childGroup.stock} // Can't exceed parent available + current allocation
                                value={childGroup.stock}
                                onChange={(e) => {
                                  // Handle child group stock update
                                  console.log(`Update ${childGroup.name} group stock to:`, e.target.value);
                                }}
                                className={`w-20 px-2 py-1 border rounded text-sm ${
                                  childGroup.stock > parentOption.stock ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                              />
                            </div>

                            <div className="text-sm text-gray-600">
                              Allocated: <span className={getStockStatusColor(childGroupAllocated, childGroup.stock)}>{childGroupAllocated}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Available: <span className={getStockStatusColor(childGroupAvailable)}>{childGroupAvailable}</span>
                            </div>
                            {getStockStatusBadge(childGroup.stock)}
                          </div>
                        </div>

                        <h6 className="font-medium text-gray-700 mb-2 text-sm">
                          Individual {childGroup.name} Options:
                        </h6>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {childGroup.options.map((childOption) => (
                          <div
                            key={childOption.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">
                                {childOption.name}:
                              </span>
                              <input
                                type="number"
                                min="0"
                                max={childGroupAvailable + childOption.stock} // Can't exceed child group available + current allocation
                                value={childOption.stock}
                                onChange={(e) => {
                                  // Handle child stock update
                                  console.log(
                                    `Update ${childOption.name} stock to:`,
                                    e.target.value
                                  );
                                }}
                                className={`w-16 px-2 py-1 border rounded text-sm ${
                                  childOption.stock > childGroup.stock
                                    ? "border-red-300 bg-red-50"
                                    : "border-gray-300"
                                }`}
                              />
                            </div>

                            <div className="text-xs">
                              {getStockStatusBadge(
                                childOption.stock,
                                parentOption.stock
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Validation Messages */}
                      {childGroupAllocated > childGroup.stock && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          Warning: Individual options total ({childGroupAllocated}) exceeds {childGroup.name} group stock ({childGroup.stock})
                        </div>
                      )}

                      {childGroup.stock > parentOption.stock && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          Warning: {childGroup.name} group stock ({childGroup.stock}) exceeds parent {parentGroup.name} stock ({parentOption.stock})
                        </div>
                      )}
                    </div>
                  )}
                  ))}

                  {/* No Child Groups Message */}
                  {childGroupsForParent.length === 0 && (
                    <div className="ml-6 text-sm text-gray-500 italic">
                      No child option groups defined for this parent.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Standalone Child Groups (no parent) */}
      {childGroups
        .filter((group) => !group.parentGroupId)
        .map((childGroup) => (
          <div
            key={childGroup.id}
            className="border border-gray-200 rounded-lg p-6"
          >
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {childGroup.name} (Standalone Group)
              </h4>
              <p className="text-sm text-gray-600">{childGroup.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {childGroup.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-700">
                      {option.name}:
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={option.stock}
                      onChange={(e) => {
                        // Handle standalone option stock update
                        console.log(
                          `Update ${option.name} stock to:`,
                          e.target.value
                        );
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>

                  <div>{getStockStatusBadge(option.stock)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* No Parent Groups Message */}
      {parentGroups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>
            No parent groups defined. Create option groups and mark them as
            parent groups to use hierarchical stock.
          </p>
        </div>
      )}
    </div>
  );
}
