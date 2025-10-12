import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class HierarchicalStockAPI {
  async getAuthHeaders() {
    const token = Cookies.get("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }
    return response.json();
  }

  // Get hierarchical stock tree for a product
  async getHierarchicalStock(productId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/${productId}/hierarchical-stock`,
        {
          method: "GET",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get hierarchical stock error:", error);
      throw error;
    }
  }

  // Generate variants automatically from option combinations
  async generateVariants(productId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/${productId}/generate-variants`,
        {
          method: "POST",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Generate variants error:", error);
      throw error;
    }
  }

  // Update stock for a specific variant
  async updateVariantStock(variantId, stock) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/variants/${variantId}/stock`,
        {
          method: "PUT",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify({ stock }),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Update variant stock error:", error);
      throw error;
    }
  }

  // Get stock summary for a product
  async getStockSummary(productId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/${productId}/stock-summary`,
        {
          method: "GET",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get stock summary error:", error);
      throw error;
    }
  }

  // Create a new variant manually
  async createVariant(productId, variantData) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${productId}/variants`,
        {
          method: "POST",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify(variantData),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Create variant error:", error);
      throw error;
    }
  }

  // Update variant details
  async updateVariant(variantId, variantData) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/variants/${variantId}`,
        {
          method: "PUT",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify(variantData),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Update variant error:", error);
      throw error;
    }
  }

  // Delete a variant
  async deleteVariant(variantId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/variants/${variantId}`,
        {
          method: "DELETE",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Delete variant error:", error);
      throw error;
    }
  }

  // Get all variants for a product
  async getVariants(productId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${productId}/variants`,
        {
          method: "GET",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get variants error:", error);
      throw error;
    }
  }

  // Bulk update stock for multiple variants
  async bulkUpdateStock(updates) {
    try {
      const promises = updates.map(({ variantId, stock }) =>
        this.updateVariantStock(variantId, stock)
      );

      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return {
        successful,
        failed,
        results,
      };
    } catch (error) {
      console.error("Bulk update stock error:", error);
      throw error;
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(productId, threshold = 10) {
    try {
      const summary = await this.getStockSummary(productId);
      return {
        lowStock: summary.lowStockVariants,
        outOfStock: summary.outOfStockVariants,
        totalAlerts: summary.lowStockCount + summary.outOfStockCount,
      };
    } catch (error) {
      console.error("Get low stock alerts error:", error);
      throw error;
    }
  }

  // Calculate total stock across all variants
  async getTotalStock(productId) {
    try {
      const summary = await this.getStockSummary(productId);
      return summary.totalStock;
    } catch (error) {
      console.error("Get total stock error:", error);
      throw error;
    }
  }

  // Validate stock levels before order processing
  async validateStockForOrder(orderItems) {
    try {
      const validationResults = [];

      for (const item of orderItems) {
        if (item.variantId) {
          const summary = await this.getStockSummary(item.productId);
          const variant = summary.variants?.find(
            (v) => v.id === item.variantId
          );

          validationResults.push({
            productId: item.productId,
            variantId: item.variantId,
            requestedQuantity: item.quantity,
            availableStock: variant?.stock || 0,
            isValid: (variant?.stock || 0) >= item.quantity,
          });
        }
      }

      return {
        isValid: validationResults.every((r) => r.isValid),
        results: validationResults,
      };
    } catch (error) {
      console.error("Validate stock for order error:", error);
      throw error;
    }
  }

  // Reserve stock for an order (decrease stock)
  async reserveStock(orderItems) {
    try {
      const updates = orderItems
        .filter((item) => item.variantId)
        .map((item) => ({
          variantId: item.variantId,
          quantity: -item.quantity, // Negative to decrease stock
        }));

      // This would need to be implemented as a proper stock reservation system
      // For now, we'll just validate that stock is available
      const validation = await this.validateStockForOrder(orderItems);

      if (!validation.isValid) {
        throw new Error("Insufficient stock for one or more items");
      }

      return validation;
    } catch (error) {
      console.error("Reserve stock error:", error);
      throw error;
    }
  }

  // Release reserved stock (increase stock back)
  async releaseStock(orderItems) {
    try {
      const updates = orderItems
        .filter((item) => item.variantId)
        .map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity, // Positive to increase stock back
        }));

      // Implementation would depend on your stock reservation system
      return { success: true, updates };
    } catch (error) {
      console.error("Release stock error:", error);
      throw error;
    }
  }
  // ===== FLEXIBLE OPTION GROUP MANAGEMENT =====

  // Get all option groups for a product with hierarchy
  async getOptionGroups(productId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/${productId}/groups`,
        {
          method: "GET",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get option groups error:", error);
      throw error;
    }
  }

  // Create a new option group
  async createOptionGroup(productId, groupData) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/${productId}/groups`,
        {
          method: "POST",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify(groupData),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Create option group error:", error);
      throw error;
    }
  }

  // Update an existing option group
  async updateOptionGroup(groupId, groupData) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/groups/${groupId}`,
        {
          method: "PUT",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify(groupData),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Update option group error:", error);
      throw error;
    }
  }

  // Delete an option group
  async deleteOptionGroup(groupId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/groups/${groupId}`,
        {
          method: "DELETE",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Delete option group error:", error);
      throw error;
    }
  }

  // ===== OPTION MANAGEMENT =====

  // Create a new option within a group
  async createOption(groupId, optionData) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/groups/${groupId}/options`,
        {
          method: "POST",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify(optionData),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Create option error:", error);
      throw error;
    }
  }

  // Update an existing option
  async updateOption(optionId, optionData) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/options/${optionId}`,
        {
          method: "PUT",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify(optionData),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Update option error:", error);
      throw error;
    }
  }

  // Delete an option
  async deleteOption(optionId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/options/${optionId}`,
        {
          method: "DELETE",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Delete option error:", error);
      throw error;
    }
  }

  // ===== ADVANCED VARIANT MANAGEMENT =====

  // Get all variants with detailed information
  async getVariants(productId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/${productId}/variants`,
        {
          method: "GET",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get variants error:", error);
      throw error;
    }
  }

  // Update multiple variant stocks at once
  async bulkUpdateVariantStocks(updates) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/variants/bulk-update-stock`,
        {
          method: "PUT",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify({ updates }),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Bulk update variant stocks error:", error);
      throw error;
    }
  }

  // Validate option group hierarchy
  async validateHierarchy(productId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/product-options/${productId}/validate-hierarchy`,
        {
          method: "GET",
          headers: await this.getAuthHeaders(),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Validate hierarchy error:", error);
      throw error;
    }
  }
}

export default new HierarchicalStockAPI();
