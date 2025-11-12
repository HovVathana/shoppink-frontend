"use client";

import { useState } from "react";
import { ordersAPI } from "@/lib/api";
import { copyToClipboard, formatOrderIdForDisplay } from "@/utils/clipboard";
import { RefreshCw, Printer } from "lucide-react";
import toast from "react-hot-toast";

interface PrintStatusCellProps {
  orderId: string;
  isPrinted: boolean;
  onPrintStatusChange?: (orderId: string, newStatus: boolean) => void;
  canResetPrintStatus?: boolean;
}

export default function PrintStatusCell({ 
  orderId, 
  isPrinted, 
  onPrintStatusChange,
  canResetPrintStatus = true // Default to true for backward compatibility
}: PrintStatusCellProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleResetPrintStatus = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering copy to clipboard
    if (!confirm("Are you sure you want to reset the print status for this order?")) {
      return;
    }

    setIsResetting(true);
    try {
      await ordersAPI.resetPrintStatus(orderId);
      toast.success("Print status reset successfully");
      if (onPrintStatusChange) {
        onPrintStatusChange(orderId, false); // false because we're resetting to not printed
      }
    } catch (error) {
      console.error("Failed to reset print status:", error);
      toast.error("Failed to reset print status");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() =>
          copyToClipboard(
            orderId,
            `Order ID ${orderId} copied!`
          )
        }
        className="text-left hover:bg-blue-50 rounded px-2 py-1 transition-colors duration-200 flex-1"
        title="Click to copy order ID"
      >
        <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
          {formatOrderIdForDisplay(orderId)}
        </div>
        <div className="text-xs text-gray-500">
          Click to copy
        </div>
        {/* Print Status Indicator - New line */}
        <div className="flex items-center space-x-1 mt-1">
          {isPrinted ? (
            <>
              <Printer className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Printed</span>
            </>
          ) : (
            <>
              <Printer className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-400">Not printed</span>
            </>
          )}
        </div>
      </button>
      
      {/* Reset Button - Only show if order is printed and user has permission */}
      {isPrinted && canResetPrintStatus && (
        <button
          onClick={handleResetPrintStatus}
          disabled={isResetting}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors duration-200"
          title="Reset print status"
        >
          <RefreshCw className={`h-3 w-3 ${isResetting ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}