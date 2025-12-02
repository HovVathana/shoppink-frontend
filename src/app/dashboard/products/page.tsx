"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import ProductModal from "@/components/Products/ProductModal";
import { productsAPI, categoriesAPI } from "@/lib/api";
import hierarchicalStockAPI from "@/services/hierarchicalStockAPI";
import toast from "react-hot-toast";
import { Plus, Search, Edit, Trash2, Package, RotateCcw } from "lucide-react";

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
  category?: {
    id: string;
    name: string;
  };
  imageUrl?: string;
  sku?: string;
  isActive: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
  hasOptions?: boolean;
  optionGroups?: ProductOptionGroup[];
}

// Component for displaying hierarchical stock tree in product table
const ProductStockTree: React.FC<{ productId: string }> = ({ productId }) => {
  const [hierarchicalData, setHierarchicalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHierarchicalData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hierarchicalStockAPI.getHierarchicalStock(productId);
        setHierarchicalData(data);
      } catch (error) {
        console.error("Failed to fetch hierarchical data:", error);
        setError("Failed to load stock data");
        setHierarchicalData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchicalData();
  }, [productId]);

  const renderTreeFromHierarchicalData = (
    nodes: any[],
    level: number = 0,
    parentPath: string = ""
  ): JSX.Element[] => {
    if (!nodes || nodes.length === 0) return [];

    const lines: JSX.Element[] = [];

    nodes.forEach((node, index) => {
      // console.log(`DEBUG: Processing node at level ${level}:`, {
      //   id: node.id,
      //   name: node.name,
      //   type: node.type,
      //   stock: node.stock,
      // });

      const currentPath = parentPath
        ? `${parentPath}-${node.id}-${index}`
        : `${node.id}-${index}`;

      // Only display options, skip option groups
      if (node.type === "option") {
        const bullet = "• ";

        lines.push(
          <div
            key={`node-${currentPath}-${level}`}
            className="text-gray-800"
            style={{ marginLeft: `${level * 16}px` }}
          >
            {bullet}
            {node.name}:{" "}
            <span
              className={`font-semibold ${
                node.stock <= 2
                  ? "text-red-600"
                  : node.stock <= 10
                  ? "text-yellow-600"
                  : "text-green-600"
              }`}
            >
              {node.stock}
            </span>
          </div>
        );
      }

      // Always process children regardless of node type
      if (node.children && node.children.length > 0) {
        const childLines = renderTreeFromHierarchicalData(
          node.children,
          node.type === "option-group" ? level : level + 1, // Don't increase level for option-groups since we're not displaying them
          currentPath
        );
        lines.push(...childLines);
      }
    });

    return lines;
  };

  if (loading) {
    return <div className="text-gray-500 text-xs">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-xs">{error}</div>;
  }

  if (
    !hierarchicalData ||
    !hierarchicalData.tree ||
    hierarchicalData.tree.length === 0
  ) {
    return <div className="text-gray-500 text-xs">No stock data available</div>;
  }

  const treeLines = renderTreeFromHierarchicalData(hierarchicalData.tree);

  if (treeLines.length === 0) {
    console.log(
      "DEBUG: No tree lines generated. Tree data:",
      hierarchicalData.tree
    );
    console.log("DEBUG: First tree node:", hierarchicalData.tree?.[0]);
    return (
      <div className="text-gray-500 text-xs">No stock data to display</div>
    );
  }

  // Calculate total stock from the root node
  const totalStock =
    hierarchicalData.product?.totalStock ||
    hierarchicalData.tree?.[0]?.stock ||
    0;

  return (
    <div className="font-mono text-xs leading-relaxed space-y-0.5">
      <div className="text-gray-800 font-semibold">
        Total:{" "}
        <span
          className={`${
            totalStock <= 2
              ? "text-red-600"
              : totalStock <= 10
              ? "text-yellow-600"
              : "text-green-600"
          }`}
        >
          {totalStock}
        </span>
      </div>
      {treeLines}
    </div>
  );
};

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  // Cache of total variant stock for products with options (keyed by productId)
  const [variantTotals, setVariantTotals] = useState<Record<string, number>>(
    {}
  );

  const { isAuthenticated, loading: authLoading } = useAuth();
  const { canCreateProducts, canEditProducts, canDeleteProducts } =
    usePermissions();
  const router = useRouter();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isAuthenticated) {
      fetchProducts();
      loadCategories();
    }
  }, [
    isAuthenticated,
    authLoading,
    router,
    debouncedSearchTerm,
    selectedCategory,
    showActiveOnly,
  ]);

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAllActive();
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const fetchProducts = useCallback(
    async (page = 1, bustCache = false) => {
      try {
        setLoading(true);
        const params: any = {
          page,
          limit: 10,
          ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
          ...(selectedCategory && { category: selectedCategory }),
          ...(showActiveOnly && { isActive: true }),
        };

        const response = await productsAPI.getAll(params, bustCache);
        setProducts(response.data.products);
        setPagination(response.data.pagination);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearchTerm, selectedCategory, showActiveOnly]
  );

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      await productsAPI.delete(product.id);
      toast.success("Product deleted successfully");
      fetchProducts(pagination.currentPage);
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to delete product";
      toast.error(message);
    }
  };

  const handleNoteClick = (product: Product) => {
    if (!canEditProducts()) return;
    setEditingNoteId(product.id);
    setEditingNoteValue(product.note || "");
  };

  const handleNoteSave = async (productId: string) => {
    try {
      await productsAPI.updateNote(productId, editingNoteValue);
      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, note: editingNoteValue } : p
        )
      );
      setEditingNoteId(null);
      toast.success("Note updated successfully");
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update note";
      toast.error(message);
    }
  };

  const handleNoteCancel = () => {
    setEditingNoteId(null);
    setEditingNoteValue("");
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleNoteSave(productId);
    } else if (e.key === "Escape") {
      handleNoteCancel();
    }
  };

  const handleProductSaved = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    fetchProducts(pagination.currentPage);
  };

  // Load variant total stocks for displayed products with options whenever products list updates
  useEffect(() => {
    const loadVariantTotals = async () => {
      try {
        const withOptions = products.filter((p) => p.hasOptions);
        if (withOptions.length === 0) {
          setVariantTotals({});
          return;
        }
        const entries = await Promise.allSettled(
          withOptions.map(async (p) => {
            const summary = await hierarchicalStockAPI.getStockSummary(p.id);
            return [p.id, summary.totalStock] as [string, number];
          })
        );
        const totals: Record<string, number> = {};
        entries.forEach((res) => {
          if (res.status === "fulfilled") {
            const [id, total] = res.value;
            totals[id] = total;
          }
        });
        setVariantTotals(totals);
      } catch (e) {
        // Non-fatal; leave as empty to avoid incorrect low stock indicators
        console.error("Failed to load variant totals", e);
      }
    };
    loadVariantTotals();
  }, [products]);

  const getTotalStock = (product: Product) => {
    if (product.hasOptions) {
      // Prefer backend authoritative total via stock summary to avoid double-counting
      const total = variantTotals[product.id];
      if (typeof total === "number") return total;
      // If not yet loaded, fallback to 0 to avoid misleading low-stock from option-level sums
      return 0;
    }
    return product.quantity;
  };

  const getStatusBadge = (product: Product) => {
    if (!product.isActive) {
      return <span className="badge badge-gray">Inactive</span>;
    }

    const totalStock = getTotalStock(product);

    // If product has options but total not loaded yet, show neutral loading state
    if (product.hasOptions && !(product.id in variantTotals)) {
      return <span className="badge">Loading…</span>;
    }

    if (totalStock <= 10) {
      return <span className="badge badge-warning">Low Stock</span>;
    }
    return <span className="badge badge-success">Active</span>;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute permission="view_products">
      <DashboardLayout>
        <div className="bg-gray-50 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* MenuBox-inspired Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                  <p className="text-gray-600">Manage your product inventory</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => fetchProducts(pagination.currentPage, true)}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#070B34] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  title="Refresh products"
                >
                  <RotateCcw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Refresh
                  </span>
                </button>
                {canCreateProducts() && (
                  <button
                    onClick={handleCreateProduct}
                    className="menubox-button-primary flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Product</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="menubox-card p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="menubox-input pl-10 w-full"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="menubox-input"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {/* <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activeOnly"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="activeOnly"
                    className="ml-2 text-sm text-gray-700 font-medium"
                  >
                    Active only
                  </label>
                </div> */}
                <div className="text-sm text-gray-500 flex items-center">
                  Total: {pagination.totalCount} products
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="menubox-table">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="menubox-table-header">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Price
                      </th>
                      {user?.role.toUpperCase() == "ADMIN" && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Stock
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Weight
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Delivery (PP/Province)
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Note
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="table-row">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {product.imageUrl ? (
                                <img
                                  className="h-10 w-10 rounded-lg object-cover"
                                  src={product.imageUrl}
                                  alt={product.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.sku && `ID: ${product.sku}`}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.category &&
                                  ` • ${product.category.name}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${product.price.toFixed(2)}
                        </td>
                        {user?.role.toUpperCase() == "ADMIN" && (
                          <td className="px-6 py-4 whitespace-nowrap  text-sm text-gray-900">
                            {product.hasOptions && product.optionGroups ? (
                              <ProductStockTree productId={product.id} />
                            ) : (
                              <div className="flex items-center justify-center">
                                <div
                                  className={`font-bold text-lg px-4 py-2 rounded-lg ${
                                    product.quantity <= 5
                                      ? "bg-red-100 text-red-700 border border-red-200"
                                      : product.quantity <= 10
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                      : "bg-green-100 text-green-700 border border-green-200"
                                  }`}
                                >
                                  {product.quantity}
                                </div>
                              </div>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.weight}kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${product.delivery_price_for_pp.toFixed(2)} / $
                          {product.delivery_price_for_province.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(product)}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          {editingNoteId === product.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingNoteValue}
                                onChange={(e) =>
                                  setEditingNoteValue(e.target.value)
                                }
                                onKeyDown={(e) =>
                                  handleNoteKeyDown(e, product.id)
                                }
                                onBlur={() => handleNoteSave(product.id)}
                                autoFocus
                                className="input-field text-sm py-1 px-2 w-full"
                                placeholder="Enter note..."
                              />
                            </div>
                          ) : (
                            <div
                              className={`text-sm text-gray-600 truncate cursor-pointer hover:bg-gray-100 rounded px-2 py-1 ${
                                canEditProducts() ? "" : "cursor-default"
                              }`}
                              title={product.note || "Click to edit"}
                              onClick={() => handleNoteClick(product)}
                            >
                              {product.note || "-"}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {canEditProducts() && (
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteProducts() && (
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => fetchProducts(pagination.currentPage - 1)}
                      disabled={pagination.currentPage <= 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchProducts(pagination.currentPage + 1)}
                      disabled={pagination.currentPage >= pagination.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Page{" "}
                        <span className="font-medium">
                          {pagination.currentPage}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {pagination.totalPages}
                        </span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() =>
                            fetchProducts(pagination.currentPage - 1)
                          }
                          disabled={pagination.currentPage <= 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            fetchProducts(pagination.currentPage + 1)
                          }
                          disabled={
                            pagination.currentPage >= pagination.totalPages
                          }
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Modal */}
            <ProductModal
              key={editingProduct ? `edit-${editingProduct.id}` : "create"}
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              product={editingProduct}
              onSaved={handleProductSaved}
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
