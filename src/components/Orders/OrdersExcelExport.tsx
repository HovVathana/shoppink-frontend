"use client";

import React from "react";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  province: string;
  remark?: string;
  state: string;
  subtotalPrice: number;
  companyDeliveryPrice: number;
  deliveryPrice: number;
  totalPrice: number;
  isPaid: boolean;
  isPrinted: boolean;
  driverId?: string;
  createdBy: string;
  orderAt: string;
  assignedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      name: string;
    };
    optionDetails?: any;
  }>;
}

interface OrdersExcelExportProps {
  orders: Order[];
  title?: string;
  disabled?: boolean;
}

// Helper function to format products list
const formatProductsList = (orderItems: any[]): string => {
  if (!orderItems || orderItems.length === 0) return "";
  
  return orderItems
    .map((item) => {
      let productText = `${item.product.name} (x${item.quantity})`;
      
      // Add variant options if available
      if (item.optionDetails) {
        let options = item.optionDetails;
        
        // Handle different data structures
        if (item.optionDetails.selections && Array.isArray(item.optionDetails.selections)) {
          options = item.optionDetails.selections;
        } else if (Array.isArray(item.optionDetails)) {
          options = item.optionDetails;
        }
        
        if (Array.isArray(options) && options.length > 0) {
          const variantInfo = options
            .map((group: any) => {
              if (!group.selectedOptions || !Array.isArray(group.selectedOptions)) {
                return null;
              }
              const selectedOptions = group.selectedOptions
                .map((option: any) => option?.name || "")
                .filter((name: string) => name.trim() !== "")
                .join(", ");
              
              if (selectedOptions) {
                return `${group.groupName || "Option"}: ${selectedOptions}`;
              }
              return null;
            })
            .filter((item: string | null) => item !== null)
            .join(" | ");
          
          if (variantInfo) {
            productText += ` [${variantInfo}]`;
          }
        }
      }
      
      return productText;
    })
    .join("; ");
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Phnom_Penh",
    });
  } catch {
    return dateString;
  }
};

export default function OrdersExcelExport({
  orders,
  title = "Orders",
  disabled = false,
}: OrdersExcelExportProps) {
  const handleExcelExport = () => {
    if (!orders || orders.length === 0) {
      return;
    }

    // Prepare data for Excel export
    const excelData = orders.map((order) => ({
      "Order ID": order.id,
      "Order Date": formatDate(order.orderAt),
      "Assigned Date": order.assignedAt ? formatDate(order.assignedAt) : "",
      "Customer Name": order.customerName,
      "Customer Phone": order.customerPhone,
      "Customer Location": `${order.customerLocation}, ${order.province}`,
      "Products": formatProductsList(order.orderItems),
      "Company Delivery Price": `$${order.companyDeliveryPrice.toFixed(2)}`,
      "Total Price": `$${order.totalPrice.toFixed(2)}`,
      "Driver": order.driver?.name || "Unassigned",
      "Status": order.state,
    }));

    // Create a new workbook and add the data
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 20 }, // Order ID
      { wch: 18 }, // Order Date
      { wch: 18 }, // Assigned Date
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Customer Phone
      { wch: 30 }, // Customer Location
      { wch: 50 }, // Products
      { wch: 12 }, // Total Price
      { wch: 18 }, // Company Delivery Price
      { wch: 15 }, // Driver
      { wch: 10 }, // Status
    ];
    ws["!cols"] = colWidths;

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    
    const fileName = `${title.toLowerCase().replace(/\s+/g, "-")}-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    
    saveAs(data, fileName);
  };

  if (orders.length === 0 || disabled) {
    return (
      <button
        disabled
        className="btn-secondary opacity-50 cursor-not-allowed flex items-center"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Export Excel
      </button>
    );
  }

  return (
    <button
      onClick={handleExcelExport}
      className="menubox-button-secondary flex items-center space-x-2 px-4 py-2"
    >
      <FileSpreadsheet className="h-4 w-4" />
      <span>Export Excel</span>
    </button>
  );
}