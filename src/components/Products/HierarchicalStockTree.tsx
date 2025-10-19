"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Package,
  RefreshCw,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import hierarchicalStockAPI from "../../services/hierarchicalStockAPI";
import { productOptionsAPI } from "@/lib/api";
import ImageCropModal from "../ImageCropModal";

interface ProductOption {
  id: string;
  name: string;
  imageUrl?: string;
  stock: number;
  sortOrder: number;
}

interface ProductOptionGroup {
  id: string;
  name: string;
  imageUrl?: string;
  level: number;
  parentGroupId?: string;
  options: ProductOption[];
  childGroups?: ProductOptionGroup[];
}

interface HierarchicalStockTreeProps {
  productId: string;
  optionGroups: ProductOptionGroup[];
  onUpdate: () => void;
  onEditGroup?: (group: ProductOptionGroup) => void;
  onDeleteGroup?: (groupId: string) => void;
  onCreateOption?: (groupId: string) => void;
  onEditOption?: (option: ProductOption, groupId: string) => void;
  onDeleteOption?: (optionId: string) => void;
}

interface TreeNode {
  id: string;
  name: string;
  imageUrl?: string;
  type: "option-group" | "option" | "option-group";
  stock: number;
  level: number;
  children: TreeNode[];
  parentId?: string;
  isExpanded?: boolean;
  variantId?: string; // For linking to product variants
}

export default function HierarchicalStockTree({
  productId,
  optionGroups,
  onUpdate,
  onEditGroup,
  onDeleteGroup,
  onCreateOption,
  onEditOption,
  onDeleteOption,
}: HierarchicalStockTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hierarchicalData, setHierarchicalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState<string>("");
  const [lastSyncedSignature, setLastSyncedSignature] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [pendingImageUpload, setPendingImageUpload] = useState<{
    nodeId: string;
    nodeType: 'option' | 'option-group';
    variantId?: string;
  } | null>(null);

  // Load hierarchical stock data
  const loadHierarchicalData = async () => {
    try {
      setLoading(true);
      const data = await hierarchicalStockAPI.getHierarchicalStock(productId);
      setHierarchicalData(data);
    } catch (error) {
      console.error("Load hierarchical data error:", error);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced generate variants with detailed feedback
  const handleGenerateVariants = async () => {
    try {
      setLoading(true);
      const result = await hierarchicalStockAPI.generateVariants(productId);

      // Enhanced success message with detailed results
      const { created = [], updated = [], skipped = [], errors = [] } = result;

      if (created.length > 0 || updated.length > 0) {
        let message = "Variant Generation Complete! ";
        if (created.length > 0) message += `Created: ${created.length} `;
        if (updated.length > 0) message += `Updated: ${updated.length} `;
        if (skipped.length > 0) message += `Skipped: ${skipped.length} `;
        toast.success(message);
      } else if (errors.length > 0) {
        toast.error(`Generation failed: ${errors.length} errors occurred`);
      } else {
        toast.success("No changes needed - all variants are up to date!");
      }

      await loadHierarchicalData();
      // Mark current options state as synced with variants
      setLastSyncedSignature(optionSignature);
      onUpdate();
    } catch (error) {
      console.error("Generate variants error:", error);
      toast.error("Failed to generate variants. Check your option groups.");
    } finally {
      setLoading(false);
    }
  };

  // Update variant stock
  const handleUpdateStock = async (variantId: string, newStock: number) => {
    try {
      await hierarchicalStockAPI.updateVariantStock(variantId, newStock);
      toast.success("Stock updated successfully");
      await loadHierarchicalData();
      onUpdate();
    } catch (error) {
      console.error("Update stock error:", error);
      toast.error("Failed to update stock");
    }
  };

  // Handle stock editing
  const startEditingStock = (nodeId: string, currentStock: number) => {
    setEditingStock(nodeId);
    setStockValue(currentStock.toString());
  };

  const saveStockEdit = async (variantId: string) => {
    const newStock = parseInt(stockValue);
    if (isNaN(newStock) || newStock < 0) {
      toast.error("Please enter a valid stock number");
      return;
    }

    await handleUpdateStock(variantId, newStock);
    setEditingStock(null);
    setStockValue("");
  };

  const cancelStockEdit = () => {
    setEditingStock(null);
    setStockValue("");
  };

  // Handle file selection for cropping
  const handleFileSelection = (nodeId: string, nodeType: 'option' | 'option-group', file: File, clickedNode?: TreeNode) => {
    const nodeData = findNodeById(nodeId);
    console.log('File selected for upload:', {
      nodeId,
      nodeType,
      fileName: file.name,
      clickedNode: clickedNode,
      nodeData: nodeData,
      isCombination: isCombinationNode(nodeId),
      clickedVariantId: clickedNode?.variantId,
      foundVariantId: nodeData?.variantId,
      realOptionId: nodeType === 'option' ? extractRealOptionId(nodeId) : null,
      realGroupId: nodeType === 'option-group' ? extractRealGroupId(nodeId) : null
    });
    setSelectedImageFile(file);
    setPendingImageUpload({ 
      nodeId, 
      nodeType,
      variantId: clickedNode?.variantId // Store the clicked node's variant ID
    });
    setCropModalOpen(true);
  };

  // Handle cropped image upload
  const handleCroppedImageUpload = async (croppedImageBlob: Blob) => {
    if (!pendingImageUpload) {
      console.log('No pending image upload');
      return;
    }
    
    const nodeData = findNodeById(pendingImageUpload.nodeId);
    const isCombination = isCombinationNode(pendingImageUpload.nodeId);
    const realOptionId = pendingImageUpload.nodeType === 'option' ? extractRealOptionId(pendingImageUpload.nodeId) : null;
    const realGroupId = pendingImageUpload.nodeType === 'option-group' ? extractRealGroupId(pendingImageUpload.nodeId) : null;
    
    // Use the stored variant ID from the clicked node, not the found node
    const targetVariantId = pendingImageUpload.variantId || nodeData?.variantId;
    
    console.log('Starting image upload for node:', {
      nodeId: pendingImageUpload.nodeId,
      nodeType: pendingImageUpload.nodeType,
      nodeData: nodeData,
      isCombination,
      storedVariantId: pendingImageUpload.variantId,
      foundVariantId: nodeData?.variantId,
      targetVariantId: targetVariantId,
      realOptionId,
      realGroupId
    });
    
    try {
      setUploadingImage(pendingImageUpload.nodeId);
      
      const formData = new FormData();
      formData.append('image', croppedImageBlob, 'cropped-image.jpg');
      
      if (isCombination) {
        // For combination nodes, we need to find the variant and update its image
        console.log('Upload - Combination node:', {
          nodeId: pendingImageUpload.nodeId,
          nodeData,
          targetVariantId: targetVariantId
        });
        if (targetVariantId) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          
          // Get auth token for request
          const Cookies = (await import('js-cookie')).default;
          const token = Cookies.get('token');
          const headers: HeadersInit = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          
          const response = await fetch(`${apiUrl}/product-options/variants/${targetVariantId}/image`, {
            method: 'PUT',
            headers,
            body: formData
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } else {
          throw new Error(`No variant ID found for combination node ${pendingImageUpload.nodeId}`);
        }
      } else if (pendingImageUpload.nodeType === 'option') {
        console.log('Upload - Option node:', {
          nodeId: pendingImageUpload.nodeId,
          realOptionId
        });
        if (realOptionId) {
          await productOptionsAPI.updateOptionImage(realOptionId, formData);
        } else {
          throw new Error(`Could not extract real option ID from ${pendingImageUpload.nodeId}`);
        }
      } else {
        console.log('Upload - Group node:', {
          nodeId: pendingImageUpload.nodeId,
          realGroupId
        });
        if (realGroupId) {
          await productOptionsAPI.updateOptionGroupImage(realGroupId, formData);
        } else {
          throw new Error(`Could not extract real group ID from ${pendingImageUpload.nodeId}`);
        }
      }
      
      toast.success('Image uploaded successfully');
      await loadHierarchicalData();
      onUpdate();
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(null);
      setPendingImageUpload(null);
      setSelectedImageFile(null);
    }
  };

  // Handle crop modal close
  const handleCropModalClose = () => {
    setCropModalOpen(false);
    setSelectedImageFile(null);
    setPendingImageUpload(null);
  };

  // Handle image removal
  const handleImageRemove = async (nodeId: string, nodeType: 'option' | 'option-group', clickedNode?: TreeNode) => {
    try {
      setUploadingImage(nodeId);
      
      const formData = new FormData();
      formData.append('removeImage', 'true'); // Send flag to remove image
      
      if (isCombinationNode(nodeId)) {
        // For combination nodes, we need to find the variant and remove its image
        const nodeData = findNodeById(nodeId);
        const targetVariantId = clickedNode?.variantId || nodeData?.variantId;
        console.log('Remove - Combination node:', {
          nodeId,
          nodeData,
          clickedVariantId: clickedNode?.variantId,
          foundVariantId: nodeData?.variantId,
          targetVariantId: targetVariantId
        });
        if (targetVariantId) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          
          // Get auth token for request
          const Cookies = (await import('js-cookie')).default;
          const token = Cookies.get('token');
          const headers: HeadersInit = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          
          const response = await fetch(`${apiUrl}/product-options/variants/${targetVariantId}/image`, {
            method: 'PUT',
            headers,
            body: formData
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } else {
          throw new Error(`No variant ID found for combination node ${nodeId}`);
        }
      } else if (nodeType === 'option') {
        const realOptionId = extractRealOptionId(nodeId);
        await productOptionsAPI.updateOptionImage(realOptionId, formData);
      } else {
        const realGroupId = extractRealGroupId(nodeId);
        await productOptionsAPI.updateOptionGroupImage(realGroupId, formData);
      }
      
      toast.success('Image removed successfully');
      await loadHierarchicalData();
      onUpdate();
    } catch (error) {
      console.error('Image remove error:', error);
      toast.error('Failed to remove image');
    } finally {
      setUploadingImage(null);
    }
  };

  // Load data on component mount and when productId changes
  useEffect(() => {
    if (productId) {
      loadHierarchicalData();
    }
  }, [productId]);

  // Compute a lightweight signature of option groups/options to detect changes
  const optionSignature = useMemo(
    () =>
      JSON.stringify(
        optionGroups.map((g) => ({
          id: g.id,
          level: g.level,
          parentGroupId: g.parentGroupId || "",
          opt: g.options?.map((o) => ({ id: o.id, stock: o.stock })) || [],
        }))
      ),
    [optionGroups]
  );

  // On initial mount, assume current variants are in sync with current options
  useEffect(() => {
    setLastSyncedSignature(optionSignature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for global product options change events to refresh automatically
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.productId === productId) {
        loadHierarchicalData();
      }
    };
    window.addEventListener(
      "product-options:changed",
      handler as unknown as EventListener
    );
    return () =>
      window.removeEventListener(
        "product-options:changed",
        handler as unknown as EventListener
      );
  }, [productId]);

  // Also lightly debounce refresh when option groups change
  useEffect(() => {
    const tid = setTimeout(() => loadHierarchicalData(), 300);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionSignature]);

  // Build tree from hierarchical data or fallback to option groups
  const buildTree = (): TreeNode[] => {
    const hasBackendTree =
      Array.isArray(hierarchicalData?.tree) && hierarchicalData.tree.length > 0;
    const hasVariants = (hierarchicalData?.variants?.length || 0) > 0;

    if (hasBackendTree && hasVariants) {
      return hierarchicalData.tree.map((node: any) => convertBackendNode(node));
    }

    // Fallback to building from option groups (legacy)
    const groupMap = new Map<string, ProductOptionGroup>();
    optionGroups.forEach((group) => groupMap.set(group.id, group));

    const buildNode = (group: ProductOptionGroup): TreeNode => {
      const children: TreeNode[] = [];

      // Check for child groups
      const childGroups = optionGroups.filter(
        (g) => g.parentGroupId === group.id
      );

      // Special case: If this group has options AND has a child group with options
      // Create nested structure where each option becomes a group with the child group's options
      if (group.options.length > 0 && childGroups.length > 0) {
        const childGroupWithOptions = childGroups.find(
          (cg) => cg.options.length > 0
        );

        if (childGroupWithOptions) {
          // Create a node for each option in the parent group
          group.options.forEach((option) => {
            const optionChildren: TreeNode[] = [];

            // Create a child group node under this option
            const childGroupNode: TreeNode = {
              id: `${option.id}_${childGroupWithOptions.id}`,
              name: childGroupWithOptions.name,
              imageUrl: childGroupWithOptions.imageUrl,
              type: "option-group",
              stock: childGroupWithOptions.options.reduce(
                (sum, opt) => sum + opt.stock,
                0
              ),
              level: group.level + 2,
              children: childGroupWithOptions.options.map((childOption) => ({
                id: childOption.id,
                name: childOption.name,
                imageUrl: childOption.imageUrl,
                type: "option",
                stock: childOption.stock,
                level: group.level + 3,
                children: [],
                parentId: childGroupWithOptions.id,
              })),
              parentId: option.id,
              isExpanded: expandedNodes.has(
                `${option.id}_${childGroupWithOptions.id}`
              ),
            };

            optionChildren.push(childGroupNode);

              // Create node for this option (now acting as a group)
              children.push({
                id: option.id,
                name: option.name,
                imageUrl: option.imageUrl,
                type: "option-group",
                stock: childGroupNode.stock,
                level: group.level + 1,
                children: optionChildren,
                parentId: group.id,
                isExpanded: expandedNodes.has(option.id),
              });
          });
        } else {
          // Regular child groups without special nesting
          childGroups.forEach((childGroup) => {
            children.push(buildNode(childGroup));
          });

          // Add options as leaf nodes
          group.options.forEach((option) => {
            children.push({
              id: option.id,
              name: option.name,
              imageUrl: option.imageUrl,
              type: "option",
              stock: option.stock,
              level: group.level + 1,
              children: [],
              parentId: group.id,
            });
          });
        }
      } else {
        // Regular structure: add child groups and options normally
        childGroups.forEach((childGroup) => {
          children.push(buildNode(childGroup));
        });

        // Add options as leaf nodes
        group.options.forEach((option) => {
          children.push({
            id: option.id,
            name: option.name,
            imageUrl: option.imageUrl,
            type: "option",
            stock: option.stock,
            level: group.level + 1,
            children: [],
            parentId: group.id,
          });
        });
      }

      // Calculate total stock for this group
      const totalStock = children.reduce((sum, child) => sum + child.stock, 0);

      return {
        id: group.id,
        name: group.name,
        imageUrl: group.imageUrl,
        type: "option-group",
        stock: totalStock,
        level: group.level,
        children,
        parentId: group.parentGroupId,
        isExpanded: expandedNodes.has(group.id),
      };
    };

    // Get root groups (level 1)
    const rootGroups = optionGroups.filter((g) => g.level === 1);
    return rootGroups.map(buildNode);
  };

  // Convert backend node format to frontend TreeNode format
  const convertBackendNode = (backendNode: any): TreeNode => {
    return {
      id: backendNode.id,
      name: backendNode.name,
      imageUrl: backendNode.imageUrl,
      type: backendNode.type,
      stock: backendNode.stock,
      level: backendNode.level,
      variantId: backendNode.variantId,
      children: backendNode.children?.map(convertBackendNode) || [],
      parentId: backendNode.parentId,
      isExpanded: expandedNodes.has(backendNode.id),
    };
  };

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (
    node: TreeNode,
    depth: number = 0
  ): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = depth * 20;

    return (
      <div key={node.id} className="select-none">
        {/* Node Row */}
        <div
          className={`flex items-center py-2 px-2 sm:px-3 hover:bg-gray-50 rounded-lg transition-colors ${
            node.type === "option-group" ? "font-medium" : "text-gray-700"
          }`}
          style={{ paddingLeft: `${Math.max(indent, 4) + 8}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </button>
          )}

          {/* Tree Lines */}
          {!hasChildren && (
            <div className="mr-2 w-6 flex justify-center">
              <div className="w-px h-4 bg-gray-300"></div>
            </div>
          )}

          {/* Node Icon */}
          <div className="mr-3">
            {node.type === "option-group" ? (
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  node.level === 1
                    ? "bg-blue-500"
                    : node.level === 2
                    ? "bg-indigo-500"
                    : node.level === 3
                    ? "bg-purple-500"
                    : "bg-gray-500"
                }`}
              >
                {node.level}
              </div>
            ) : (
              <Package className="h-4 w-4 text-gray-500" />
            )}
          </div>

          {/* Node Name and Stock */}
          <div className="flex-1 flex items-center justify-between min-w-0">
            <span
              className={`truncate mr-2 ${
                node.type === "option-group" ? "font-semibold" : ""
              }`}
              title={node.name}
            >
              {node.name}
            </span>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {/* Image Display/Upload */}
              <div className="flex items-center space-x-2">
                {node.imageUrl ? (
                  <div className="relative group">
                    <img
                      src={node.imageUrl}
                      alt={node.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg border-2 border-gray-300 hover:border-blue-400 transition-colors cursor-pointer shadow-sm"
                      onClick={() => {
                        // Show larger preview on click
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
                        modal.innerHTML = `
                          <div class="relative max-w-md w-full">
                            <img src="${node.imageUrl}" alt="${node.name}" class="w-full rounded-lg shadow-2xl" />
                            <button class="absolute top-2 right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors" onclick="this.closest('.fixed').remove()">
                              ×
                            </button>
                            <div class="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                              ${node.name}
                            </div>
                          </div>
                        `;
                        document.body.appendChild(modal);
                        modal.onclick = (e) => {
                          if (e.target === modal) modal.remove();
                        };
                      }}
                      title="Click to preview"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageRemove(node.id, node.type === 'option' ? 'option' : 'option-group', node);
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-red-600 shadow-lg"
                      title="Remove image"
                      disabled={uploadingImage === node.id}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-gray-400 transition-colors">
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                )}
                <label className={`cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 ${
                  uploadingImage === node.id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log('Image upload clicked for node:', {
                          id: node.id,
                          name: node.name,
                          type: node.type,
                          variantId: node.variantId,
                          level: node.level
                        });
                        handleFileSelection(node.id, node.type === 'option' ? 'option' : 'option-group', file, node);
                      }
                      // Clear the input so the same file can be selected again
                      e.target.value = '';
                    }}
                    className="hidden"
                    disabled={uploadingImage === node.id}
                  />
                  <Upload className={`w-4 h-4 text-gray-500 transition-all duration-200 ${
                    uploadingImage === node.id ? 'animate-spin text-blue-500' : 'hover:text-blue-500'
                  }`} />
                </label>
              </div>

              {/* Stock Display/Edit */}
              {editingStock === node.id ? (
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    value={stockValue}
                    onChange={(e) => setStockValue(e.target.value)}
                    className="w-12 sm:w-16 px-1 sm:px-2 py-1 text-xs sm:text-sm border rounded"
                    min="0"
                    autoFocus
                  />
                  <button
                    onClick={() =>
                      node.variantId && saveStockEdit(node.variantId)
                    }
                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs sm:text-sm"
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    onClick={cancelStockEdit}
                    className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs sm:text-sm"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span
                  className={`px-1 sm:px-2 py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer ${
                    node.stock === 0
                      ? "bg-red-100 text-red-800"
                      : node.stock <= 10
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  } ${node.variantId ? "hover:bg-opacity-80" : ""}`}
                  onClick={() => {
                    console.log("Clicked node:", {
                      id: node.id,
                      name: node.name,
                      type: node.type,
                      variantId: node.variantId,
                      stock: node.stock,
                    });
                    if (node.variantId) {
                      startEditingStock(node.id, node.stock);
                    } else if (node.type === "option-group") {
                      console.log(
                        "Option group clicked - stock is calculated from children"
                      );
                    } else {
                      console.log("No variantId found for this option node");
                    }
                  }}
                  title={
                    node.variantId ? "Click to edit stock" : "Stock (read-only)"
                  }
                >
                  {node.stock}
                </span>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEditNode(node)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={
                    node.type === "option-group" ? "Edit Group" : "Edit Option"
                  }
                >
                  <Edit2 className="h-3 w-3 sm:h-3 sm:w-3 text-gray-500" />
                </button>
                {node.type === "option-group" && (
                  <button
                    onClick={() => handleAddChild(node)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Add Child"
                  >
                    <Plus className="h-3 w-3 sm:h-3 sm:w-3 text-gray-500" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteNode(node)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title={
                    node.type === "option-group"
                      ? "Delete Group"
                      : "Delete Option"
                  }
                >
                  <Trash2 className="h-3 w-3 sm:h-3 sm:w-3 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l border-gray-200">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleEditNode = (node: TreeNode) => {
    if (node.type === "option-group") {
      // Extract real group ID from composite ID
      const realGroupId = extractRealGroupId(node.id);
      const group = optionGroups.find((g) => g.id === realGroupId);
      if (group && onEditGroup) {
        onEditGroup(group);
      }
    } else {
      // Extract real option ID from composite ID
      const realOptionId = extractRealOptionId(node.id);
      let foundOption: ProductOption | null = null;
      let parentGroupId = "";

      for (const group of optionGroups) {
        const option = group.options.find((o) => o.id === realOptionId);
        if (option) {
          foundOption = option;
          parentGroupId = group.id;
          break;
        }
      }

      if (foundOption && onEditOption) {
        onEditOption(foundOption, parentGroupId);
      }
    }
  };

  const handleAddChild = (node: TreeNode) => {
    if (node.type === "option-group" && onCreateOption) {
      // Extract real group ID from composite ID
      const realGroupId = extractRealGroupId(node.id);
      onCreateOption(realGroupId);
    }
  };

  // Helper function to extract real group ID from composite ID
  // Composite ID format: "optionId1_optionId2_groupId" or just "groupId"
  const extractRealGroupId = (compositeId: string): string => {
    const parts = compositeId.split("_");
    // The last part is always the real group ID
    return parts[parts.length - 1];
  };

  // Helper function to extract real option ID from composite ID
  // Composite ID format: "optionId1_optionId2_realOptionId" or just "realOptionId"
  const extractRealOptionId = (compositeId: string): string => {
    const parts = compositeId.split("_");
    // The last part is always the real option ID
    return parts[parts.length - 1];
  };

  // Helper function to detect if a node represents a combination (variant) rather than a pure option/group
  const isCombinationNode = (nodeId: string): boolean => {
    // Find the node in the tree and check if it has a variantId
    const node = findNodeById(nodeId);
    return !!(node?.variantId);
  };

  // Helper function to find a node by ID in the tree
  const findNodeById = (nodeId: string): TreeNode | null => {
    const searchInNodes = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return node;
        }
        const found = searchInNodes(node.children);
        if (found) {
          return found;
        }
      }
      return null;
    };
    return searchInNodes(tree);
  };

  const handleDeleteNode = (node: TreeNode) => {
    if (node.type === "option-group" && onDeleteGroup) {
      // Extract real group ID from composite ID
      const realGroupId = extractRealGroupId(node.id);
      onDeleteGroup(realGroupId);
    } else if (node.type === "option" && onDeleteOption) {
      // Extract real option ID from composite ID
      const realOptionId = extractRealOptionId(node.id);
      onDeleteOption(realOptionId);
    }
  };

  const tree = buildTree();
  

  // UX hints for generation state
  const hasVariants = (hierarchicalData?.variants?.length || 0) > 0;
  const hasAnyOptions = optionGroups.some((g) => (g.options?.length || 0) > 0);
  const needsInitialGeneration = !hasVariants && hasAnyOptions;
  const variantsMayBeOutdated =
    hasVariants && optionSignature !== lastSyncedSignature;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Stock Tree</h3>
          <p className="text-sm text-gray-600 hidden sm:block">
            Hierarchical view of all product variants and their stock levels
          </p>
        </div>
        <div className="flex items-center justify-between w-full sm:w-auto space-x-4">
          {/* Total Stock - Mobile first */}
          <div className="text-left sm:text-right order-2 sm:order-3">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {hierarchicalData?.product?.totalStock || 0}
            </div>
            <div className="text-xs text-gray-500">Total Stock</div>
          </div>
          {/* Action Buttons */}
          <div className="flex space-x-2 order-1 sm:order-2">
            <button
              onClick={loadHierarchicalData}
              disabled={loading}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
              title="Refresh stock data"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleGenerateVariants}
              disabled={loading}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              title="Auto-generate variants from options"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Generate Variants</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generation banners */}
      {needsInitialGeneration && (
        <div className="mb-4 px-3 py-2 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
          Variants have not been generated yet for current options. Generate
          them to enable per-variant stock editing.
        </div>
      )}
      {variantsMayBeOutdated && (
        <div className="mb-4 px-3 py-2 rounded border border-amber-300 bg-amber-50 text-amber-800 text-sm flex items-center justify-between">
          <span>Option changes detected. Variants may be out of date.</span>
          <button
            onClick={handleGenerateVariants}
            className="ml-3 px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs"
          >
            Regenerate Variants
          </button>
        </div>
      )}

      {/* Tree View */}
      <div className="space-y-1 group">
        {tree.length > 0 ? (
          tree.map((node) => renderTreeNode(node))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No option groups created yet</p>
            <p className="text-sm">
              Create your first option group to get started
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-6 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              1
            </div>
            <span>Level 1 Groups</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              2
            </div>
            <span>Level 2 Groups</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              3
            </div>
            <span>Level 3+ Groups</span>
          </div>
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span>Final Options</span>
          </div>
        </div>
      </div>
      
      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={handleCropModalClose}
        onCropComplete={handleCroppedImageUpload}
        imageFile={selectedImageFile}
        title="Crop Option Image"
      />
    </div>
  );
}
