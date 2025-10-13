"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { ordersAPI, productsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useBlacklist } from "@/contexts/BlacklistContext";
import { useDrivers } from "@/contexts/DriversContext";
import toast from "react-hot-toast";
import { X, Plus, Trash2, ShieldAlert, Search, Minus } from "lucide-react";
import hierarchicalStockAPI from "../../services/hierarchicalStockAPI";

interface OrderForm {
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  province: string;
  remark: string;
  driverId: string;
  deliveryPrice: number;
  companyDeliveryPrice: number;
  totalPrice: number;
  isPaid: boolean;
  products: Array<{
    productId: string;
    quantity: number;
    price: number;
    optionDetails?: Array<{
      groupId: string;
      groupName: string;
      selectionType: string;
      selectedOptions: Array<{
        id: string;
        name: string;
        priceType: string;
        priceValue?: number;
      }>;
    }>;
  }>;
}

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (order?: any) => void;
  order?: any;
  isEditing?: boolean;
}

export default function OrderModal({
  isOpen,
  onClose,
  onSaved,
  order,
  isEditing = false,
}: OrderModalProps) {
  const { user } = useAuth();
  const { blacklistSet, normalizePhone } = useBlacklist();
  const { activeDrivers: drivers } = useDrivers();
  const isAdmin = user?.role === "ADMIN";
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const [selectedOptions, setSelectedOptions] = useState<{
    [productIndex: number]: { [groupId: string]: string[] };
  }>({});
  const [productSearchTerms, setProductSearchTerms] = useState<{
    [productIndex: number]: string;
  }>({});
  const [productSearchFocused, setProductSearchFocused] = useState<{
    [productIndex: number]: boolean;
  }>({});

  // Cache variants per product to determine option availability from variant stock
  const [variantsByProduct, setVariantsByProduct] = useState<
    Record<string, any[]>
  >({});

  // Helper function to calculate price with options, handling BASE price correctly
  // This is used ONLY when variants are not available or no exact variant match is found
  const calculatePriceWithOptions = (
    product: any,
    productOptions: { [groupId: string]: string[] }
  ) => {
    let calculatedPrice = 0; // Start with 0, not product base price
    let hasBasePrice = false;

    if (product.optionGroups) {
      product.optionGroups.forEach((group: any) => {
        const selectedOptionIds = productOptions[group.id] || [];
        selectedOptionIds.forEach((selectedOptionId: string) => {
          const option = group.options.find(
            (opt: any) => opt.id === selectedOptionId
          );
          if (option) {
            switch (option.priceType) {
              case "BASE":
                // BASE price is the final price for this option - don't add to anything
                if (!hasBasePrice) {
                  calculatedPrice = option.priceValue || 0;
                  hasBasePrice = true;
                } else {
                  // If we already have a base price, add this base price
                  calculatedPrice += option.priceValue || 0;
                }
                break;
              case "FIXED":
                // FIXED is added to current calculated price
                calculatedPrice += option.priceValue || 0;
                break;
              case "PERCENTAGE":
                // PERCENTAGE is added as percentage of current calculated price
                calculatedPrice +=
                  (calculatedPrice * (option.priceValue || 0)) / 100;
                break;
              case "FREE":
              default:
                // No price change for FREE options
                break;
            }
          }
        });
      });
    }

    // If no BASE price was set, fall back to product base price
    if (!hasBasePrice) {
      calculatedPrice = product.price || 0;
    }

    return calculatedPrice;
  };

  const loadVariantsForProduct = async (productId: string) => {
    if (!productId || variantsByProduct[productId]) return;
    try {
      const res = await hierarchicalStockAPI.getHierarchicalStock(productId);
      const variants = res?.variants || res?.data?.variants || [];
      setVariantsByProduct((prev) => ({ ...prev, [productId]: variants }));
    } catch (e) {
      // Non-blocking: if variants fail to load, UI falls back to option.stock
      console.warn("Failed to load variants for product", productId, e);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<OrderForm>({
    defaultValues: {
      deliveryPrice: 0.0,
      companyDeliveryPrice: 1.2,
      totalPrice: 0,
      isPaid: false,
      products: [{ productId: "", quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
  });

  const watchedProducts = watch("products");
  const watchedProvince = watch("province");

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Separate effect to populate form data after products are loaded
  useEffect(() => {
    if (isOpen && products.length > 0) {
      if (isEditing && order) {
        console.log("Loading order for editing:", order); // Debug log

        // Populate form with existing order data
        const orderProducts = order.orderItems?.map((item: any) => ({
          productId: item.product?.id || item.productId,
          quantity: item.quantity,
          price: item.price,
        })) || [{ productId: "", quantity: 1, price: 0 }];

        const formData = {
          customerName: order.customerName || "",
          customerPhone: order.customerPhone || "",
          customerLocation: order.customerLocation || "",
          province: order.province || "Phnom Penh",
          remark: order.remark || "",
          driverId: order.driverId || order.driver?.id || "",
          deliveryPrice: Number(order.deliveryPrice) || 0.0,
          companyDeliveryPrice: Number(order.companyDeliveryPrice) || 1.2,
          totalPrice: Number(order.totalPrice) || 0,
          isPaid: !!order.isPaid,
          products: orderProducts,
        };

        console.log("Form data being set:", formData); // Debug log
        reset(formData);

        // Set search terms for existing products
        const searchTerms: { [key: number]: string } = {};
        const existingOptions: {
          [productIndex: number]: { [groupId: string]: string[] };
        } = {};

        order.orderItems?.forEach((item: any, index: number) => {
          const productName = item.product?.name || item.productName;
          if (productName) {
            searchTerms[index] = productName;
          }

          // Load variants for all products with options early
          const productId = item.product?.id || item.productId;
          if (productId) {
            const product = products.find((p) => p.id === productId);
            if (product?.hasOptions) {
              loadVariantsForProduct(productId);
            }
          }

          // Restore product options if they exist
          console.log(
            `Processing options for product ${index}:`,
            item.optionDetails
          ); // Debug log
          if (item.optionDetails) {
            const productOptions: { [groupId: string]: string[] } = {};

            // Handle both array format and object format with selections property
            let optionSelections = [];
            if (Array.isArray(item.optionDetails)) {
              optionSelections = item.optionDetails;
            } else if (
              item.optionDetails.selections &&
              Array.isArray(item.optionDetails.selections)
            ) {
              optionSelections = item.optionDetails.selections;
            }

            optionSelections.forEach((optionDetail: any) => {
              if (
                optionDetail.groupId &&
                optionDetail.selectedOptions &&
                Array.isArray(optionDetail.selectedOptions)
              ) {
                productOptions[optionDetail.groupId] =
                  optionDetail.selectedOptions.map((opt: any) => opt.id);
              }
            });

            if (Object.keys(productOptions).length > 0) {
              existingOptions[index] = productOptions;
              console.log(
                `Restored options for product ${index}:`,
                productOptions
              ); // Debug log
            }
          }
        });

        console.log("All existing options being set:", existingOptions); // Debug log
        setProductSearchTerms(searchTerms);
        setSelectedOptions(existingOptions);
        setProductSearchFocused({});
      } else {
        // Always reset form for new orders or when not editing
        console.log("Resetting form for new order"); // Debug log

        const cleanFormData = {
          customerName: "",
          customerPhone: "",
          customerLocation: "",
          province: "Phnom Penh",
          remark: "",
          driverId: "",
          deliveryPrice: 0.0,
          companyDeliveryPrice: 1.2,
          totalPrice: 0,
          isPaid: false,
          products: [{ productId: "", quantity: 1, price: 0 }],
        };

        reset(cleanFormData);

        // Clear all state for new orders
        setProductSearchTerms({});
        setSelectedOptions({});
        setProductSearchFocused({});
        setVariantsByProduct({}); // Clear variants cache
      }
    }
  }, [isOpen, isEditing, order, products.length, drivers.length, reset]);

  // Additional effect to restore options when products are loaded and form is ready
  useEffect(() => {
    if (
      isEditing &&
      order &&
      isOpen &&
      products.length > 0 &&
      watchedProducts.length > 0
    ) {
      // Wait a moment for the form to be fully set, then restore options
      const timer = setTimeout(() => {
        const existingOptions: {
          [productIndex: number]: { [groupId: string]: string[] };
        } = {};

        order.orderItems?.forEach((item: any, index: number) => {
          if (item.optionDetails) {
            const productOptions: { [groupId: string]: string[] } = {};

            // Handle both array format and object format with selections property
            let optionSelections = [];
            if (Array.isArray(item.optionDetails)) {
              optionSelections = item.optionDetails;
            } else if (
              item.optionDetails.selections &&
              Array.isArray(item.optionDetails.selections)
            ) {
              optionSelections = item.optionDetails.selections;
            }

            optionSelections.forEach((optionDetail: any) => {
              if (
                optionDetail.groupId &&
                optionDetail.selectedOptions &&
                Array.isArray(optionDetail.selectedOptions)
              ) {
                productOptions[optionDetail.groupId] =
                  optionDetail.selectedOptions.map((opt: any) => opt.id);
              }
            });

            if (Object.keys(productOptions).length > 0) {
              existingOptions[index] = productOptions;
              console.log(
                `Re-restoring options for product ${index}:`,
                productOptions
              ); // Debug log
            }
          }
        });

        if (Object.keys(existingOptions).length > 0) {
          console.log("Re-setting selected options:", existingOptions); // Debug log
          setSelectedOptions((prevOptions) => ({
            ...prevOptions,
            ...existingOptions,
          }));
        }
      }, 500); // Small delay to ensure form is ready

      return () => clearTimeout(timer);
    }
  }, [isEditing, order, isOpen, products.length, watchedProducts.length]);

  // Force recalculation of company delivery price when editing an order
  useEffect(() => {
    if (
      isEditing &&
      order &&
      isOpen &&
      products.length > 0 &&
      watchedProducts.length > 0
    ) {
      // Small delay to ensure form is populated, then force recalculation
      const timer = setTimeout(() => {
        const totals = calculateTotals();
        console.log(
          "Force recalculating company delivery price for edit mode:",
          {
            calculated: totals.calculatedCompanyDeliveryPrice,
            current: watch("companyDeliveryPrice"),
            totalWeight: totals.totalWeight,
            province: watch("province"),
          }
        ); // Debug log

        if (totals.calculatedCompanyDeliveryPrice !== undefined) {
          setValue(
            "companyDeliveryPrice",
            totals.calculatedCompanyDeliveryPrice
          );
        }
      }, 600); // Slightly longer delay than option restoration

      return () => clearTimeout(timer);
    }
  }, [
    isEditing,
    order,
    isOpen,
    products.length,
    watchedProducts.length,
    watch,
    setValue,
  ]);

  // Reset form completely when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log("Modal closed - resetting all state"); // Debug log

      // Reset form to default values
      reset({
        customerName: "",
        customerPhone: "",
        customerLocation: "",
        province: "Phnom Penh",
        remark: "",
        driverId: "",
        deliveryPrice: 0.0,
        companyDeliveryPrice: 1.2,
        totalPrice: 0,
        isPaid: false,
        products: [{ productId: "", quantity: 1, price: 0 }],
      });

      // Clear all component state
      setProductSearchTerms({});
      setSelectedOptions({});
      setProductSearchFocused({});
      setVariantsByProduct({});
    }
  }, [isOpen, reset]);

  // Auto-update company delivery price when province or products change
  useEffect(() => {
    if (
      isOpen &&
      products.length > 0 &&
      watchedProvince &&
      watchedProducts.length > 0
    ) {
      const totals = calculateTotals();
      if (totals.calculatedCompanyDeliveryPrice !== undefined) {
        // Always update the company delivery price to ensure it's calculated correctly
        // This is especially important for edit mode where we want to recalculate based on current weight
        console.log("Auto-calculating company delivery price:", {
          calculated: totals.calculatedCompanyDeliveryPrice,
          current: watch("companyDeliveryPrice"),
          totalWeight: totals.totalWeight,
          province: watchedProvince,
        }); // Debug log

        setValue("companyDeliveryPrice", totals.calculatedCompanyDeliveryPrice);
      }
    }
  }, [
    watchedProvince,
    JSON.stringify(watchedProducts),
    products.length,
    isOpen,
    setValue,
  ]);

  // Auto-update total price when subtotal, delivery price, or company delivery price changes
  useEffect(() => {
    if (isOpen && products.length > 0) {
      const totals = calculateTotals();
      const currentTotalPrice = watch("totalPrice");

      // Only update if the calculated total is different from current total
      if (Math.abs(currentTotalPrice - totals.calculatedTotal) > 0.01) {
        setValue("totalPrice", totals.calculatedTotal);
      }
    }
  }, [
    JSON.stringify(watchedProducts),
    watch("deliveryPrice"),
    watch("companyDeliveryPrice"),
    products.length,
    isOpen,
    setValue,
  ]);

  // When products change (including when editing opens), ensure we have variants for accurate stock display
  useEffect(() => {
    watchedProducts.forEach((item) => {
      if (item?.productId) {
        loadVariantsForProduct(item.productId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedProducts.map((p) => p.productId))]);

  // When variants load after selecting a product, recompute prices using variant adjustments
  useEffect(() => {
    if (!isOpen) return;

    try {
      const currentProducts = [...watchedProducts];
      let changed = false;

      currentProducts.forEach((item, index) => {
        const productId = item?.productId;
        if (!productId) return;
        const product = products.find((p) => p.id === productId);
        if (!product) return;

        const vlist = variantsByProduct[productId] || [];
        if (vlist.length === 0) return;

        const productOptions = selectedOptions[index] || {};
        const selectedIdsAll: string[] = Object.values(productOptions).flat();
        if (selectedIdsAll.length === 0) return;

        const desired = new Set(selectedIdsAll);
        const exact = vlist.find((v: any) => {
          const voSet = new Set(
            (v.variantOptions || []).map(
              (vo: any) => vo.optionId || vo.option?.id
            )
          );
          if (voSet.size !== desired.size) return false;
          for (const id of Array.from(desired)) {
            if (!voSet.has(id)) return false;
          }
          return true;
        });

        if (exact) {
          // Check if any of the variant's options have BASE price type
          const hasBaseOption = exact.variantOptions?.some(
            (vo: any) => vo.option?.priceType === "BASE"
          );

          let variantPrice;
          if (hasBaseOption) {
            // If variant contains BASE price options, use priceAdjustment as final price
            variantPrice = exact.priceAdjustment || 0;
          } else {
            // Otherwise, use base price + variant adjustment
            variantPrice = (product.price || 0) + (exact.priceAdjustment || 0);
          }

          const existingPrice = Number(currentProducts[index]?.price || 0);
          if (Math.abs(existingPrice - variantPrice) > 0.01) {
            currentProducts[index] = {
              ...currentProducts[index],
              price: variantPrice,
            };
            changed = true;
          }
        }
      });

      if (changed) {
        reset({
          ...watch(),
          products: currentProducts,
        });
      }
    } catch {}
  }, [
    isOpen,
    variantsByProduct,
    JSON.stringify(selectedOptions),
    JSON.stringify(watchedProducts.map((p) => p.productId)),
  ]);

  const loadData = async () => {
    try {
      const productsResponse = await productsAPI.getAll({
        limit: 100,
        isActive: true,
        includeOptions: true,
      });
      setProducts(productsResponse.data.products);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      // Clear search term when product is selected
      setProductSearchTerms((prev) => ({
        ...prev,
        [index]: product.name,
      }));
      setProductSearchFocused((prev) => ({
        ...prev,
        [index]: false,
      }));

      // Proactively load variants for accurate stock availability
      loadVariantsForProduct(productId);

      // Initialize default options for this product
      const defaultOptions: { [groupId: string]: string[] } = {};
      let calculatedPrice = product.price;

      if (product.optionGroups) {
        product.optionGroups.forEach((group: any) => {
          const defaultOption = group.options.find(
            (option: any) => option.isDefault && option.isAvailable
          );
          if (defaultOption) {
            defaultOptions[group.id] = [defaultOption.id];
          } else if (group.isRequired) {
            // If required but no default, select first available option
            const firstAvailable = group.options.find(
              (option: any) => option.isAvailable
            );
            if (firstAvailable) {
              defaultOptions[group.id] = [firstAvailable.id];
            }
          }
        });

        // Calculate price with all default options
        calculatedPrice = calculatePriceWithOptions(product, defaultOptions);
      }

      // Prefer variant-based pricing when exact variant can be resolved from defaults
      try {
        const vlist = variantsByProduct[productId] || [];
        const selectedIds = Object.values(defaultOptions).flat();
        if (vlist.length > 0 && selectedIds.length > 0) {
          const desired = new Set(selectedIds);
          const exact = vlist.find((v: any) => {
            const voSet = new Set(
              (v.variantOptions || []).map(
                (vo: any) => vo.optionId || vo.option?.id
              )
            );
            if (voSet.size !== desired.size) return false;
            for (const id of Array.from(desired)) {
              if (!voSet.has(id)) return false;
            }
            return true;
          });
          if (exact) {
            // Check if any of the variant's options have BASE price type
            const hasBaseOption = exact.variantOptions?.some(
              (vo: any) => vo.option?.priceType === "BASE"
            );

            if (hasBaseOption) {
              // If variant contains BASE price options, use priceAdjustment as final price
              calculatedPrice = exact.priceAdjustment || 0;
            } else {
              // Otherwise, use base price + variant adjustment
              calculatedPrice =
                (product.price || 0) + (exact.priceAdjustment || 0);
            }
          }
        }
      } catch {}

      // Update selected options for this product index
      setSelectedOptions((prev) => ({
        ...prev,
        [index]: defaultOptions,
      }));

      const updatedProducts = [...watchedProducts];
      updatedProducts[index] = {
        ...updatedProducts[index],
        productId,
        price: calculatedPrice,
      };

      // Update the form values
      reset({
        ...watch(),
        products: updatedProducts,
      });
    }
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm.trim()) return products;

    const term = searchTerm.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.category?.name.toLowerCase().includes(term)
    );
  };

  const handleProductSearchChange = (index: number, searchTerm: string) => {
    setProductSearchTerms((prev) => ({
      ...prev,
      [index]: searchTerm,
    }));
  };

  const handleProductSearchFocus = (index: number) => {
    setProductSearchFocused((prev) => ({
      ...prev,
      [index]: true,
    }));
  };

  const handleProductSearchBlur = (index: number) => {
    // Small delay to allow item click (mousedown) to register before hiding
    setTimeout(() => {
      setProductSearchFocused((prev) => ({
        ...prev,
        [index]: false,
      }));
    }, 150);
  };

  const handleOptionSelect = (
    productIndex: number,
    groupId: string,
    optionId: string,
    selectionType: string
  ) => {
    const product = products.find(
      (p) => p.id === watchedProducts[productIndex]?.productId
    );
    if (!product) return;

    setSelectedOptions((prev) => {
      const newOptions = { ...prev };
      const productOptions = { ...newOptions[productIndex] } || {};

      if (selectionType === "SINGLE") {
        // Single selection - replace existing selection
        productOptions[groupId] = [optionId];
      } else {
        // Multiple selection - toggle option
        const currentSelections = productOptions[groupId] || [];
        if (currentSelections.includes(optionId)) {
          productOptions[groupId] = currentSelections.filter(
            (id) => id !== optionId
          );
        } else {
          productOptions[groupId] = [...currentSelections, optionId];
        }
      }

      newOptions[productIndex] = productOptions;

      // Recalculate price for this product (prefer variant-based pricing)
      let calculatedPrice = product.price;

      try {
        const vlist = variantsByProduct[product.id] || [];
        const selectedIdsAll: string[] = Object.values(productOptions).flat();
        if (vlist.length > 0 && selectedIdsAll.length > 0) {
          const desired = new Set(selectedIdsAll);
          const exact = vlist.find((v: any) => {
            const voSet = new Set(
              (v.variantOptions || []).map(
                (vo: any) => vo.optionId || vo.option?.id
              )
            );
            if (voSet.size !== desired.size) return false;
            for (const id of Array.from(desired)) {
              if (!voSet.has(id)) return false;
            }
            return true;
          });
          if (exact) {
            // Check if any of the variant's options have BASE price type
            const hasBaseOption = exact.variantOptions?.some(
              (vo: any) => vo.option?.priceType === "BASE"
            );

            if (hasBaseOption) {
              // If variant contains BASE price options, use priceAdjustment as final price
              calculatedPrice = exact.priceAdjustment || 0;
            } else {
              // Otherwise, use base price + variant adjustment
              calculatedPrice =
                (product.price || 0) + (exact.priceAdjustment || 0);
            }
          } else {
            // Fallback to option-based adjustments when exact variant not found
            calculatedPrice = calculatePriceWithOptions(
              product,
              productOptions
            );
          }
        } else if (product.optionGroups) {
          // No variants loaded yet; fallback
          calculatedPrice = calculatePriceWithOptions(product, productOptions);
        }
      } catch {}

      // Update the form price
      const updatedProducts = [...watchedProducts];
      updatedProducts[productIndex] = {
        ...updatedProducts[productIndex],
        price: calculatedPrice,
      };

      reset({
        ...watch(),
        products: updatedProducts,
      });

      return newOptions;
    });
  };

  // Compute available stock for an option based on variants and current selections
  const getOptionAvailableStock = (
    selectedProduct: any,
    productIndex: number,
    groupId: string,
    option: any
  ) => {
    const variants = variantsByProduct[selectedProduct.id] || [];

    if (variants.length > 0) {
      const currentSelections = selectedOptions[productIndex] || {};
      const requiredOptionIds: string[] = Object.entries(currentSelections)
        .filter(([gid]) => gid !== groupId)
        .flatMap(([, ids]) => (Array.isArray(ids) ? ids : []));

      const idsToMatch = Array.from(new Set([...requiredOptionIds, option.id]));

      const total = variants
        .filter((v: any) =>
          idsToMatch.every((rid) =>
            (v.variantOptions || []).some(
              (vo: any) => (vo.optionId || vo.option?.id) === rid
            )
          )
        )
        .reduce((sum: number, v: any) => sum + (v.stock || 0), 0);

      return total;
    }

    // Fallback to option-level stock when variants are not present
    return option?.stock ?? 0;
  };

  const calculateTotals = () => {
    const formValues = watch();
    const subtotal = watchedProducts.reduce((sum, item) => {
      return sum + item.quantity * item.price;
    }, 0);

    // Calculate total weight
    const totalWeight = watchedProducts.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product?.weight || 0) * item.quantity;
    }, 0);

    // Calculate company delivery price based on province and weight
    let calculatedCompanyDeliveryPrice = 0;
    const province = formValues.province;

    if (province === "Phnom Penh") {
      if (totalWeight <= 19) calculatedCompanyDeliveryPrice = 1.2;
      else if (totalWeight <= 39) calculatedCompanyDeliveryPrice = 2;
      else calculatedCompanyDeliveryPrice = 2.8;
    } else {
      if (totalWeight <= 20) calculatedCompanyDeliveryPrice = 1.2;
      else if (totalWeight <= 39) calculatedCompanyDeliveryPrice = 2;
      else calculatedCompanyDeliveryPrice = 2.7; // All orders over 40kg for province delivery
    }

    // Use form value if manually edited, otherwise use calculated value
    const companyDeliveryPrice =
      formValues.companyDeliveryPrice !== undefined &&
      formValues.companyDeliveryPrice !== null &&
      !isNaN(formValues.companyDeliveryPrice)
        ? Number(formValues.companyDeliveryPrice)
        : calculatedCompanyDeliveryPrice || 0;

    const deliveryPrice =
      formValues.deliveryPrice !== undefined &&
      formValues.deliveryPrice !== null &&
      !isNaN(formValues.deliveryPrice)
        ? Number(formValues.deliveryPrice)
        : 0;

    const calculatedTotal = subtotal + deliveryPrice;
    const totalPrice =
      formValues.totalPrice !== undefined &&
      formValues.totalPrice !== null &&
      !isNaN(formValues.totalPrice)
        ? Number(formValues.totalPrice)
        : calculatedTotal;

    return {
      subtotal,
      totalWeight,
      companyDeliveryPrice,
      calculatedCompanyDeliveryPrice,
      deliveryPrice,
      totalPrice,
      calculatedTotal,
    };
  };

  const onSubmit = async (data: OrderForm) => {
    setIsLoading(true);
    try {
      const totals = calculateTotals();

      const orderData = {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerLocation: data.customerLocation,
        province: data.province,
        remark: data.remark,
        state: "PLACED",
        subtotalPrice: totals.subtotal,
        companyDeliveryPrice:
          data.companyDeliveryPrice || totals.companyDeliveryPrice,
        deliveryPrice: data.deliveryPrice || 0.0,
        totalPrice: data.totalPrice || totals.totalPrice,
        isPaid: !!data.isPaid,
        driverId: data.driverId || null,
        products: data.products.map((item, index) => {
          const product = products.find((p) => p.id === item.productId);
          const productOptions = selectedOptions[index] || {};

          // Create option details for this product
          const optionDetails =
            product?.optionGroups
              ?.map((group: any) => {
                const selectedIds = productOptions[group.id] || [];
                const selectedOptionDetails = selectedIds
                  .map((optionId: string) => {
                    const option = group.options.find(
                      (opt: any) => opt.id === optionId
                    );
                    return option
                      ? {
                          id: option.id,
                          name: option.name,
                          priceType: option.priceType,
                          priceValue: option.priceValue,
                        }
                      : null;
                  })
                  .filter(Boolean);

                return selectedOptionDetails.length > 0
                  ? {
                      groupId: group.id,
                      groupName: group.name,
                      selectionType: group.selectionType,
                      selectedOptions: selectedOptionDetails,
                    }
                  : null;
              })
              .filter(Boolean) || [];

          return {
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            weight: product?.weight || 0,
            optionDetails: optionDetails.length > 0 ? optionDetails : null,
          };
        }),
      };

      if (isEditing && order) {
        const res = await ordersAPI.update(order.id, orderData);
        const updatedOrder = res?.data?.order ||
          res?.data || { ...order, ...orderData };
        // Success toast is handled by the parent component
        onSaved(updatedOrder);
      } else {
        const res = await ordersAPI.create(orderData);
        const createdOrder = res?.data?.order || res?.data;
        // Success toast is handled by the parent component
        onSaved(createdOrder);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to save order";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto mobile-compact">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom menubox-card text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="w-[90vw] sm:w-auto bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🛒</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Edit Order" : "Create New Order"}
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
              {/* Customer Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Customer Name *
                    </label>
                    <input
                      {...register("customerName", {
                        required: "Customer name is required",
                      })}
                      type="text"
                      className="input-field mt-1"
                      placeholder="Enter customer name"
                    />
                    {errors.customerName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.customerName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Customer Phone *
                      </label>
                      {watch("customerPhone") &&
                        blacklistSet.has(
                          normalizePhone(watch("customerPhone"))
                        ) && (
                          <p className="mt-1 text-xs text-yellow-700 flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3 text-yellow-600" />
                            Blacklist phone number
                          </p>
                        )}
                    </div>

                    <input
                      {...register("customerPhone", {
                        required: "Customer phone is required",
                      })}
                      type="tel"
                      className={`input-field mt-1 ${
                        watch("customerPhone") &&
                        blacklistSet.has(normalizePhone(watch("customerPhone")))
                          ? "border-yellow-500 ring-1 ring-yellow-500 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50"
                          : ""
                      }`}
                      placeholder="Enter customer phone"
                    />
                    {errors.customerPhone && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.customerPhone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Customer Location *
                    </label>
                    <input
                      {...register("customerLocation", {
                        required: "Customer location is required",
                      })}
                      type="text"
                      className="input-field mt-1"
                      placeholder="Enter customer address"
                    />
                    {errors.customerLocation && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.customerLocation.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Province *
                    </label>
                    <select
                      {...register("province", {
                        required: "Province is required",
                      })}
                      className="input-field mt-1"
                    >
                      <option value="Phnom Penh">Phnom Penh</option>
                      <option value="Province">Province</option>
                    </select>
                    {errors.province && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.province.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Remarks
                  </label>
                  <textarea
                    {...register("remark")}
                    rows={2}
                    className="input-field mt-1"
                    placeholder="Enter any remarks or special instructions"
                  />
                </div>

                {isEditing && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Assign Driver (Optional)
                    </label>
                    <select
                      {...register("driverId")}
                      className="input-field mt-1"
                    >
                      <option value="">Select a driver (optional)</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} - {driver.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Products */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-medium text-gray-900">
                      Products
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        append({ productId: "", quantity: 1, price: 0 })
                      }
                      className="btn-secondary flex items-center text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Product
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const selectedProduct = products.find(
                        (p) => p.id === watchedProducts[index]?.productId
                      );
                      const productOptions = selectedOptions[index] || {};

                      return (
                        <div
                          key={field.id}
                          className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          {/* Mobile-Friendly Product Selection */}
                          <div className="space-y-4">
                            {/* Product Search Section */}
                            <div className="w-full">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search for a product..."
                                  value={productSearchTerms[index] || ""}
                                  onChange={(e) =>
                                    handleProductSearchChange(
                                      index,
                                      e.target.value
                                    )
                                  }
                                  className="input-field pr-10 w-full"
                                  onFocus={() => {
                                    handleProductSearchFocus(index);
                                    // Clear current product selection when focusing to search
                                    if (watchedProducts[index]?.productId) {
                                      const updatedProducts = [
                                        ...watchedProducts,
                                      ];
                                      updatedProducts[index] = {
                                        ...updatedProducts[index],
                                        productId: "",
                                        price: 0,
                                      };
                                      reset({
                                        ...watch(),
                                        products: updatedProducts,
                                      });
                                      setSelectedOptions((prev) => {
                                        const newOptions = { ...prev };
                                        delete newOptions[index];
                                        return newOptions;
                                      });
                                    }
                                  }}
                                  onBlur={() => handleProductSearchBlur(index)}
                                />
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

                                {/* Mobile-Optimized Dropdown */}
                                {productSearchFocused[index] &&
                                  !watchedProducts[index]?.productId && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-72 sm:max-h-60 overflow-y-auto">
                                      {getFilteredProducts(
                                        productSearchTerms[index] || ""
                                      ).length > 0 ? (
                                        getFilteredProducts(
                                          productSearchTerms[index] || ""
                                        ).map((product) => (
                                          <div
                                            key={product.id}
                                            className="px-4 py-4 sm:px-3 sm:py-2 hover:bg-blue-50 active:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleProductChange(
                                                index,
                                                product.id
                                              );
                                            }}
                                          >
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 text-base sm:text-sm leading-tight">
                                                  {product.name}
                                                </p>
                                                <div className="mt-1 text-sm sm:text-xs text-gray-500">
                                                  {product.sku && (
                                                    <span className="inline-block mr-3">
                                                      SKU: {product.sku}
                                                    </span>
                                                  )}
                                                  {product.category?.name && (
                                                    <span className="inline-block">
                                                      {product.category.name}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="text-left sm:text-right flex-shrink-0">
                                                <p className="font-bold text-gray-900 text-lg sm:text-base">
                                                  ${product.price.toFixed(2)}
                                                </p>
                                                {product.hasOptions && (
                                                  <p className="text-xs text-blue-600 font-medium">
                                                    Customizable
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="px-4 py-6 text-gray-500 text-sm text-center">
                                          No products found matching "
                                          {productSearchTerms[index] || ""}"
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>

                              {/* Hidden select for form validation */}
                              <select
                                {...register(`products.${index}.productId`, {
                                  required: "Product is required",
                                })}
                                className="hidden"
                                value={watchedProducts[index]?.productId || ""}
                              >
                                <option value="">Select a product</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity and Price Controls */}
                            <div className="flex items-center flex-col lg:flex-row justify-center lg:justify-between bg-white rounded-lg p-3 border border-gray-200">
                              {/* Quantity Section */}
                              <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                  Quantity:
                                </span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentQty =
                                        watchedProducts[index]?.quantity || 1;
                                      if (currentQty > 1) {
                                        setValue(
                                          `products.${index}.quantity`,
                                          currentQty - 1
                                        );
                                      }
                                    }}
                                    disabled={
                                      (watchedProducts[index]?.quantity || 1) <=
                                      1
                                    }
                                    className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors touch-manipulation"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>

                                  <div className="w-5 lg:w-16 text-center">
                                    <span className="text-sm lg:text-lg font-semibold text-gray-900">
                                      {watchedProducts[index]?.quantity || 1}
                                    </span>
                                    <input
                                      {...register(
                                        `products.${index}.quantity`,
                                        {
                                          required: "Quantity is required",
                                          min: {
                                            value: 1,
                                            message: "Minimum quantity is 1",
                                          },
                                        }
                                      )}
                                      type="hidden"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentQty =
                                        watchedProducts[index]?.quantity || 1;
                                      setValue(
                                        `products.${index}.quantity`,
                                        currentQty + 1
                                      );
                                    }}
                                    className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Price Section */}
                              <div className="flex">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                    Price:
                                  </span>
                                  <span className="text-lg font-bold text-green-600">
                                    $
                                    {(
                                      watchedProducts[index]?.price || 0
                                    ).toFixed(2)}
                                  </span>
                                  <input
                                    {...register(`products.${index}.price`)}
                                    type="hidden"
                                  />
                                </div>
                                {/* Remove Button */}
                                {fields.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="flex items-center justify-center w-9 h-9 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors touch-manipulation ml-2"
                                    title="Remove Product"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Product Options */}
                          {selectedProduct &&
                            selectedProduct.optionGroups &&
                            selectedProduct.optionGroups.length > 0 && (
                              <div className="border-t border-gray-200 pt-4">
                                <h5 className="text-sm font-medium text-gray-900 mb-3">
                                  Customize Product Options
                                </h5>

                                <div className="space-y-4">
                                  {selectedProduct.optionGroups.map(
                                    (group: any, groupIndex: number) => (
                                      <div key={group.id} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <h6 className="text-sm font-medium text-gray-800">
                                            {group.name}
                                          </h6>
                                          {group.isRequired && (
                                            <span className="text-red-500 text-xs">
                                              *
                                            </span>
                                          )}
                                        </div>

                                        {group.description && (
                                          <p className="text-xs text-gray-600">
                                            {group.description}
                                          </p>
                                        )}

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                          {group.options
                                            .filter(
                                              (option: any) =>
                                                option.isAvailable
                                            )
                                            .map((option: any) => {
                                              const isSelected = (
                                                productOptions[group.id] || []
                                              ).includes(option.id);
                                              const availableStock =
                                                getOptionAvailableStock(
                                                  selectedProduct,
                                                  index,
                                                  group.id,
                                                  option
                                                );
                                              const isOutOfStock =
                                                availableStock <= 0;

                                              const levels = (
                                                selectedProduct.optionGroups ||
                                                []
                                              ).map((g: any) => g.level || 1);
                                              const maxLevel = levels.length
                                                ? Math.max(...levels)
                                                : 1;
                                              const isLastGroup =
                                                (group.level || 1) ===
                                                  maxLevel ||
                                                groupIndex ===
                                                  selectedProduct.optionGroups
                                                    .length -
                                                    1;

                                              return (
                                                <div
                                                  key={option.id}
                                                  className={`border rounded-lg p-2 cursor-pointer transition-colors text-xs ${
                                                    isSelected
                                                      ? "border-blue-500 bg-blue-50"
                                                      : isOutOfStock
                                                      ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                                                      : "border-gray-200 hover:border-gray-300"
                                                  }`}
                                                  onClick={() => {
                                                    if (!isOutOfStock) {
                                                      handleOptionSelect(
                                                        index,
                                                        group.id,
                                                        option.id,
                                                        group.selectionType
                                                      );
                                                    }
                                                  }}
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                      <div className="flex items-center">
                                                        {group.selectionType ===
                                                        "SINGLE" ? (
                                                          <div
                                                            className={`w-3 h-3 rounded-full border ${
                                                              isSelected
                                                                ? "border-blue-500 bg-blue-500"
                                                                : "border-gray-300"
                                                            }`}
                                                          >
                                                            {isSelected && (
                                                              <div className="w-1 h-1 bg-white rounded-full mx-auto mt-0.5" />
                                                            )}
                                                          </div>
                                                        ) : (
                                                          <div
                                                            className={`w-3 h-3 rounded border ${
                                                              isSelected
                                                                ? "border-blue-500 bg-blue-500"
                                                                : "border-gray-300"
                                                            }`}
                                                          >
                                                            {isSelected && (
                                                              <svg
                                                                className="w-2 h-2 text-white"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                              >
                                                                <path
                                                                  fillRule="evenodd"
                                                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                  clipRule="evenodd"
                                                                />
                                                              </svg>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>

                                                      <div>
                                                        <p className="font-medium text-gray-900 flex items-center space-x-1">
                                                          <span>
                                                            {option.name}
                                                          </span>
                                                          {isLastGroup && (
                                                            <span
                                                              className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                                availableStock ===
                                                                0
                                                                  ? "bg-red-100 text-red-800"
                                                                  : availableStock <=
                                                                    10
                                                                  ? "bg-yellow-100 text-yellow-800"
                                                                  : "bg-green-100 text-green-800"
                                                              }`}
                                                            >
                                                              {availableStock}
                                                            </span>
                                                          )}
                                                        </p>
                                                        {isOutOfStock && (
                                                          <p className="text-red-600">
                                                            Out of stock
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>

                                                    <div className="text-right">
                                                      {option.priceType ===
                                                        "FREE" && (
                                                        <span className="text-green-600 font-medium">
                                                          Free
                                                        </span>
                                                      )}
                                                      {option.priceType ===
                                                        "BASE" &&
                                                        option.priceValue && (
                                                          <span className="font-medium">
                                                            $
                                                            {option.priceValue.toFixed(
                                                              2
                                                            )}
                                                          </span>
                                                        )}
                                                      {option.priceType ===
                                                        "FIXED" &&
                                                        option.priceValue && (
                                                          <span className="font-medium">
                                                            +$
                                                            {option.priceValue.toFixed(
                                                              2
                                                            )}
                                                          </span>
                                                        )}
                                                      {option.priceType ===
                                                        "PERCENTAGE" &&
                                                        option.priceValue && (
                                                          <span className="font-medium">
                                                            +{option.priceValue}
                                                            %
                                                          </span>
                                                        )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Pricing Details
                  </h4>
                  <div
                    className={`grid grid-cols-1 ${
                      isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
                    } gap-4`}
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Delivery Price
                      </label>
                      <input
                        {...register("deliveryPrice")}
                        type="number"
                        step="0.01"
                        className="input-field mt-1"
                        placeholder="0.00"
                      />
                    </div>

                    {/* {isAdmin && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Company Delivery Price (Auto-calculated)
                        </label>
                        <input
                          {...register("companyDeliveryPrice")}
                          type="number"
                          step="0.01"
                          className="input-field mt-1"
                          placeholder="Auto-calculated"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Based on province and total weight
                        </p>
                      </div>
                    )} */}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Total Price (Editable)
                      </label>
                      <input
                        {...register("totalPrice")}
                        type="number"
                        step="0.01"
                        className="input-field mt-1"
                        placeholder="Auto-calculated"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Subtotal + Delivery Price
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Order Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>

                    {/* Payment */}
                    <div className="mt-4">
                      <label className="inline-flex items-center space-x-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          {...register("isPaid")}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Paid</span>
                      </label>
                    </div>

                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Weight:</span>
                    <span>{totals.totalWeight.toFixed(2)} kg</span>
                  </div>
                  {isAdmin && (
                    <div className="flex justify-between">
                      <span>Company Delivery Fee:</span>
                      <span>${totals.companyDeliveryPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Price:</span>
                    <span>${totals.deliveryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>${totals.totalPrice.toFixed(2)}</span>
                  </div>
                  {isAdmin &&
                    totals.calculatedCompanyDeliveryPrice !==
                      totals.companyDeliveryPrice && (
                      <div className="text-xs text-blue-600 mt-2">
                        * Company delivery price has been manually adjusted
                      </div>
                    )}
                </div>
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
                      {isEditing ? "Updating Order..." : "Creating Order..."}
                    </div>
                  ) : isEditing ? (
                    "Update Order"
                  ) : (
                    "Create Order"
                  )}
                </button>
              </div>

              {watch("customerPhone") &&
                blacklistSet.has(normalizePhone(watch("customerPhone"))) && (
                  <p className="mt-2 text-xs text-yellow-700 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-yellow-600" />
                    Warning: This phone number is blacklisted. You can still
                    create the order.
                  </p>
                )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
