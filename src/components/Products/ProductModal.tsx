"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { productsAPI, categoriesAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { X, Package, Settings } from "lucide-react";
import ImageUpload from "@/components/UI/ImageUpload";
import ProductOptionsManager from "./ProductOptionsManager";

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

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  weight: number;
  delivery_price_for_pp: number;
  delivery_price_for_province: number;
  categoryId?: string;
  imageUrl?: string;
  sku?: string;
  isActive: boolean;
  note?: string;
  bannerText?: string;
  bannerColor?: string;
  bannerType?: string;
  originalPrice?: number;
  hasOptions?: boolean;
  optionGroups?: ProductOptionGroup[];
}

interface ProductForm {
  name: string;
  description: string;
  price: number;
  quantity: number;
  weight: number;
  delivery_price_for_pp: number;
  delivery_price_for_province: number;
  categoryId: string;
  imageUrl: string;
  isActive: boolean;
  note: string;
  bannerText: string;
  bannerColor: string;
  bannerType: string;
  originalPrice?: number;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved: () => void;
}

export default function ProductModal({
  isOpen,
  onClose,
  product,
  onSaved,
}: ProductModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"basic" | "options">("basic");
  const [productData, setProductData] = useState<Product | null>(null);
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<ProductForm>({
    mode: "onSubmit", // Only validate on submit to prevent image upload issues
  });

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      // Reset active tab to basic when opening modal
      setActiveTab("basic");

      if (product) {
        // Set product data for existing product
        setProductData(product);
        reset({
          name: product.name,
          description: product.description || "",
          price: product.price,
          quantity: product.quantity,
          weight: product.weight,
          delivery_price_for_pp: product.delivery_price_for_pp,
          delivery_price_for_province: product.delivery_price_for_province,
          categoryId: product.categoryId || "",
          imageUrl: product.imageUrl || "",
          isActive: product.isActive,
          note: product.note || "",
          bannerText: product.bannerText || "",
          bannerColor: product.bannerColor || "blue",
          bannerType: product.bannerType || "info",
          originalPrice: product.originalPrice || undefined,
        });
        // Reset image state for editing
        setSelectedImageFile(null);
        setImagePreviewUrl("");
      } else {
        // Clear product data for new product
        setProductData(null);
        reset({
          name: "",
          description: "",
          price: 0,
          quantity: 0,
          weight: 0,
          delivery_price_for_pp: 0,
          delivery_price_for_province: 0,
          categoryId: "",
          imageUrl: "",
          isActive: true,
          note: "",
          bannerText: "",
          bannerColor: "blue",
          bannerType: "info",
          originalPrice: undefined,
        });
        // Reset image state for new product
        setSelectedImageFile(null);
        setImagePreviewUrl("");
      }
    } else {
      // Clear state when modal closes
      setProductData(null);
      setActiveTab("basic");
      setSelectedImageFile(null);
      setImagePreviewUrl("");
    }
  }, [isOpen, product, reset]);

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAllActive();
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Failed to load categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const fetchProductData = async (productId: string) => {
    try {
      const response = await productsAPI.getById(productId);
      setProductData(response.data.product);
    } catch (error) {
      console.error("Failed to fetch product data:", error);
    }
  };

  const onSubmit = async (data: ProductForm) => {
    setIsLoading(true);

    try {
      // Trigger validation for all fields to ensure everything is valid
      const isFormValid = await trigger();
      if (!isFormValid) {
        toast.error("Please fix all validation errors before saving.");
        setIsLoading(false);
        return;
      }

      // For new products, require an image file
      if (!isEditing && !selectedImageFile) {
        toast.error("Please select an image for the product.");
        setIsLoading(false);
        return;
      }

      // Prepare form data for multipart upload
      const formData = new FormData();

      // Add all product data to form data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== "imageUrl") {
          formData.append(key, value.toString());
        }
      });

      // Add image file if selected
      if (selectedImageFile) {
        formData.append("image", selectedImageFile);
      }

      // Handle originalPrice - can be null/empty
      if (data.originalPrice && data.originalPrice > 0) {
        formData.set("originalPrice", data.originalPrice.toString());
      } else {
        formData.set("originalPrice", "");
      }

      // Save product to database
      let savedProduct;
      if (isEditing && product) {
        savedProduct = await productsAPI.update(product.id, formData);
        toast.success("Product updated successfully");
        // Refresh product data to get updated options
        await fetchProductData(product.id);
      } else {
        savedProduct = await productsAPI.create(formData);
        toast.success("Product created successfully");
        // Set the newly created product data
        if (savedProduct.data?.product) {
          setProductData(savedProduct.data.product);
          // Switch to options tab for new products
          setActiveTab("options");
        }
      }

      // Reset form state
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      onSaved();

      // Don't close modal immediately for new products so user can add options
      if (isEditing) {
        onClose();
      }
    } catch (error: any) {
      toast.dismiss("image-upload");
      const message = error.response?.data?.message || "Failed to save product";
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

        <div className="inline-block align-bottom menubox-card text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📦</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Edit Product" : "Add New Product"}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "basic"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Basic Info</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("options")}
                disabled={!isEditing && !productData}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "options"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                } ${
                  !isEditing && !productData
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Options</span>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "basic" ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product Name *
                    </label>
                    <input
                      {...register("name", {
                        required: "Product name is required",
                      })}
                      type="text"
                      className="input-field mt-1"
                      placeholder="Enter product name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {isEditing && product?.sku && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Product ID
                      </label>
                      <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700">
                        {product.sku}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price *
                    </label>
                    <input
                      {...register("price", {
                        required: "Price is required",
                        min: { value: 0, message: "Price must be positive" },
                      })}
                      type="number"
                      step="0.01"
                      className="input-field mt-1"
                      placeholder="0.00"
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.price.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity *
                    </label>
                    {productData && productData.hasOptions ? (
                      <div className="mt-1">
                        <input
                          {...register("quantity")}
                          type="number"
                          className="input-field bg-gray-100 cursor-not-allowed"
                          placeholder="Managed by options"
                          disabled
                          readOnly
                        />
                        <p className="mt-1 text-sm text-blue-600">
                          📦 Stock is managed individually for each product
                          option. Set stock levels in the "Options" tab.
                        </p>
                      </div>
                    ) : (
                      <>
                        <input
                          {...register("quantity", {
                            required: "Quantity is required",
                            min: {
                              value: 0,
                              message: "Quantity must be non-negative",
                            },
                          })}
                          type="number"
                          className="input-field mt-1"
                          placeholder="0"
                        />
                        {errors.quantity && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.quantity.message}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Weight (kg) *
                    </label>
                    <input
                      {...register("weight", {
                        required: "Weight is required",
                        min: { value: 0, message: "Weight must be positive" },
                      })}
                      type="number"
                      step="0.01"
                      className="input-field mt-1"
                      placeholder="0.00"
                    />
                    {errors.weight && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.weight.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      {...register("categoryId")}
                      className="input-field mt-1"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Delivery Price (PP) *
                    </label>
                    <input
                      {...register("delivery_price_for_pp", {
                        required: "PP delivery price is required",
                        min: {
                          value: 0,
                          message: "Price must be non-negative",
                        },
                      })}
                      type="number"
                      step="0.01"
                      className="input-field mt-1"
                      placeholder="0.00"
                    />
                    {errors.delivery_price_for_pp && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.delivery_price_for_pp.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Delivery Price (Province) *
                    </label>
                    <input
                      {...register("delivery_price_for_province", {
                        required: "Province delivery price is required",
                        min: {
                          value: 0,
                          message: "Price must be non-negative",
                        },
                      })}
                      type="number"
                      step="0.01"
                      className="input-field mt-1"
                      placeholder="0.00"
                    />
                    {errors.delivery_price_for_province && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.delivery_price_for_province.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    className="input-field mt-1"
                    placeholder="Enter product description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Note
                  </label>
                  <input
                    {...register("note")}
                    type="text"
                    className="input-field mt-1"
                    placeholder="Small note for tracking (optional)"
                  />
                </div>

                <div>
                  <ImageUpload
                    value={imagePreviewUrl || watch("imageUrl")}
                    onChange={(file, previewUrl) => {
                      setSelectedImageFile(file);
                      setImagePreviewUrl(previewUrl || "");
                      if (!file) {
                        setValue("imageUrl", "");
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>

                {/* Banner Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Product Banner (Optional)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Banner Text
                      </label>
                      <input
                        {...register("bannerText")}
                        type="text"
                        className="input-field mt-1"
                        placeholder="e.g., 50% OFF, NEW, HOT"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Banner Shape
                      </label>
                      <select
                        {...register("bannerType")}
                        className="input-field mt-1"
                      >
                        <option value="circle">Circle</option>
                        <option value="square">Square</option>
                        <option value="rectangle">Rectangle</option>
                        <option value="tilted">Tilted</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Banner Color
                      </label>
                      <select
                        {...register("bannerColor")}
                        className="input-field mt-1"
                      >
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="red">Red</option>
                        <option value="yellow">Yellow</option>
                        <option value="purple">Purple</option>
                        <option value="pink">Pink</option>
                        <option value="gray">Gray</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Discount Pricing Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Original Price (Optional)
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Original Price (Crossed Out)
                    </label>
                    <input
                      {...register("originalPrice", {
                        valueAsNumber: true,
                        validate: (value) => {
                          // Original price is optional, but if provided must be positive
                          if (
                            value !== undefined &&
                            value !== null &&
                            value <= 0
                          ) {
                            return "Original price must be positive";
                          }
                          return true;
                        },
                      })}
                      type="number"
                      step="0.01"
                      className="input-field mt-1"
                      placeholder="0.00"
                    />
                    {errors.originalPrice && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.originalPrice.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Optional. If provided, will be shown as crossed-out price.
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    {...register("isActive")}
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Product is active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
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
                      "Update Product"
                    ) : (
                      "Create Product"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Options Tab */
              <div className="space-y-6">
                {productData || product ? (
                  <ProductOptionsManager
                    productId={(productData || product)!.id}
                    optionGroups={(productData || product)!.optionGroups || []}
                    onUpdate={() => {
                      if (productData?.id) {
                        fetchProductData(productData.id);
                      } else if (product?.id) {
                        fetchProductData(product.id);
                      }
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600">
                      Please save the product first to add options.
                    </p>
                    <button
                      onClick={() => setActiveTab("basic")}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Go to Basic Info
                    </button>
                  </div>
                )}

                {/* Close button for options tab */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
