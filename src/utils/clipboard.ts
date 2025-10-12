import toast from "react-hot-toast";

/**
 * Copy text to clipboard with user feedback
 * @param text - Text to copy to clipboard
 * @param successMessage - Optional success message (defaults to "Copied to clipboard!")
 */
export const copyToClipboard = async (
  text: string,
  successMessage?: string
) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage || "Copied to clipboard!");
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      toast.success(successMessage || "Copied to clipboard!");
    } catch (fallbackError) {
      console.error("Failed to copy to clipboard:", fallbackError);
      toast.error("Failed to copy to clipboard");
    }
  }
};

/**
 * Format order ID for display (shows full custom format)
 * @param orderId - The order ID (e.g., "SP3108251430A1B2C")
 * @returns Formatted display string
 */
export const formatOrderIdForDisplay = (orderId: string): string => {
  // For custom format SP3108251430A1B2C, show the full ID
  if (orderId.startsWith("SP") && orderId.length === 17) {
    return orderId;
  }
  // For legacy cuid format, show abbreviated
  if (orderId.length > 12) {
    return `${orderId.slice(0, 8)}...${orderId.slice(-4)}`;
  }
  return orderId;
};

/**
 * Parse order ID to extract date and time information
 * @param orderId - The order ID (e.g., "SP3108251430A1B2C")
 * @returns Object with parsed date info or null if invalid format
 */
export const parseOrderId = (
  orderId: string
): {
  day: string;
  month: string;
  year: string;
  hours: string;
  minutes: string;
  randomSuffix: string;
  fullDate: string;
  fullDateTime: string;
} | null => {
  // Check for custom format SP3108251430A1B2C
  if (orderId.startsWith("SP") && orderId.length === 17) {
    const day = orderId.slice(2, 4);
    const month = orderId.slice(4, 6);
    const year = "20" + orderId.slice(6, 8);
    const hours = orderId.slice(8, 10);
    const minutes = orderId.slice(10, 12);
    const randomSuffix = orderId.slice(12, 17);

    return {
      day,
      month,
      year,
      hours,
      minutes,
      randomSuffix,
      fullDate: `${day}/${month}/${year}`,
      fullDateTime: `${day}/${month}/${year} ${hours}:${minutes}`,
    };
  }

  // Legacy cuid format fallback
  if (orderId.length > 20) {
    try {
      const timestampPart = orderId.slice(1, 9);
      const timestamp = parseInt(timestampPart, 36);
      const date = new Date(timestamp);

      return {
        day: String(date.getDate()).padStart(2, "0"),
        month: String(date.getMonth() + 1).padStart(2, "0"),
        year: String(date.getFullYear()),
        hours: String(date.getHours()).padStart(2, "0"),
        minutes: String(date.getMinutes()).padStart(2, "0"),
        randomSuffix: orderId.slice(-5),
        fullDate: date.toLocaleDateString(),
        fullDateTime: date.toLocaleString(),
      };
    } catch (error) {
      return null;
    }
  }

  return null;
};
