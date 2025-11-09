"use client";

import React, { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import { Download, AlertTriangle } from "lucide-react";
import { ordersAPI } from "@/lib/api";
import toast from "react-hot-toast";

// Register custom fonts (put .ttf files in /public/fonts/)
Font.register({
  family: "Bayon",
  src: "/Bayon.ttf",
});

Font.register({
  family: "DMSans",
  src: "/DMSans.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontSize: 10,
    fontFamily: "Bayon",
    fontWeight: "bold", // Make everything bold
  },
  englishFont: {
    fontFamily: "DMSans",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 8,
    fontWeight: "bold",
  },
  bigText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  image: {
    width: 30,
    height: 30,
  },
  textBold: {
    fontWeight: "bold",
  },
  billTo: {
    marginTop: 5,
    marginBottom: 5,
    fontWeight: "bold",
  },
  spaceY: {
    marginVertical: 3,
    fontWeight: "bold",
  },
  end: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  table: {
    marginTop: 5,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#000",
  },
  tableHeader: {
    backgroundColor: "#eee",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    flexDirection: "row",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    fontWeight: "bold",
  },
  td: {
    padding: 6,
    color: "#000",
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
  },
  totals: {
    marginTop: 8,
    alignItems: "flex-end",
    fontWeight: "bold",
  },
});

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  province: string;
  orderAt: string;
  assignedAt?: string;
  subtotalPrice: number;
  deliveryPrice: number;
  companyDeliveryPrice: number;
  totalPrice: number;
  isPaid: boolean;
  isPrinted: boolean;
  remark?: string;
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

interface OrdersPDFExportProps {
  orders: Order[];
  title?: string;
  isAssigned?: boolean;
  onPrintStatusChange?: (orderIds: string[], newStatus: boolean) => void;
}

// Format variant options
const formatVariantOptions = (optionDetails: any): string => {
  let options = optionDetails;

  if (optionDetails?.selections && Array.isArray(optionDetails.selections)) {
    options = optionDetails.selections;
  } else if (!Array.isArray(options) || options.length === 0) {
    return "";
  }

  try {
    return options
      .map((group: any) => {
        if (!group?.selectedOptions || !Array.isArray(group.selectedOptions)) {
          return null;
        }
        const selectedOptions = group.selectedOptions
          .map((option: any) => option?.name || "")
          .filter((name: string) => name.trim() !== "")
          .join(", ");

        return selectedOptions
          ? `${group.groupName || "Option"}: ${selectedOptions}`
          : null;
      })
      .filter(Boolean)
      .join(" | ");
  } catch (error) {
    console.warn("Error formatting variant options:", error, optionDetails);
    return "";
  }
};

const OrdersPDFDocument = ({
  orders,
  title = "Orders",
}: OrdersPDFExportProps) => {
  const MM_TO_PT = 2.83465;
  const width = 100 * MM_TO_PT; // 283.465 pt
  const height = 150 * MM_TO_PT; // 425.1975 pt

  return (
    <Document>
      {orders.map((order, i) => {
        const orderDate = new Date(order.orderAt).toLocaleString();
        const products = order.orderItems || [];

        const totalData = [
          { label: "សរុប", value: `$${order.totalPrice.toFixed(2)}` },
        ];

        return (
          <Page key={i} size={[width, height]} style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, styles.textBold]}>វិក្កយបត្រ</Text>
                <Text style={styles.subtitle}>
                  កាលបរិច្ឆេទ:{" "}
                  <Text style={styles.englishFont}>{orderDate}</Text>
                </Text>
                <Text style={styles.subtitle}>
                  បញ្ជាដោយ:{" "}
                  <Text style={styles.englishFont}>
                    {order.creator?.name || "N/A"}
                  </Text>
                </Text>
              </View>
              <View style={styles.end}>
                <Image src="/logo.JPG" style={styles.image} />
                <Text style={[styles.subtitle, styles.textBold]}>
                  ShoppinkKH
                </Text>
              </View>
            </View>

            {/* Barcode */}
            <View style={{ alignItems: "center", marginTop: 10 }}>
              <Image
                src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${order.id}&scale=2&height=10&includetext`}
                style={{
                  width: 200,
                  height: 30,
                }}
              />
            </View>

            {/* Customer Info */}
            <View style={styles.spaceY}>
              <Text style={styles.textBold}>អតិថិជន:</Text>
              <Text style={styles.textBold}>{order.customerName}</Text>
              <Text style={[styles.englishFont, styles.textBold]}>{order.customerPhone}</Text>
              <Text style={styles.textBold}>
                {order.customerLocation}
                {order.province === "Phnom Penh"
                  ? ", Phnom Penh"
                  : ", Province"}
              </Text>
              {order?.remark && <Text style={styles.textBold}>ចំណាំ: {order.remark}</Text>}
            </View>

            {/* Product Table */}
            <View style={styles.table}>
              <View style={[styles.tableHeader, styles.textBold]}>
                <Text style={[styles.td, styles.textBold]}>ផលិតផល</Text>
                <Text style={[styles.td, styles.textBold]}>ចំនួន</Text>
              </View>
              {products.map((item, index) => {
                const variantInfo = formatVariantOptions(
                  item.optionDetails || []
                );
                return (
                  <View key={index} style={styles.tableRow}>
                    <View style={styles.td}>
                      <Text style={{ fontSize: 10, fontWeight: "bold" }}>{item.product.name}</Text>
                      {variantInfo && (
                        <Text
                          style={{
                            fontSize: 8,
                            color: "#000",
                            fontWeight: "bold",
                            marginTop: 2,
                          }}
                        >
                          {variantInfo}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.td,
                        { alignItems: "center", justifyContent: "center" },
                      ]}
                    >
                      {item.quantity > 1 ? (
                        <View
                          style={{
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 3,
                            borderStyle: "solid",
                            borderColor: "#ff0000",
                            borderRadius: 50,
                            width: 25,
                            height: 25,
                          }}
                        >
                          <Text
                            style={[
                              styles.englishFont,
                              {
                                fontSize: 12,
                                fontWeight: "bold",
                                color: "#000",
                                textAlign: "center",
                              },
                            ]}
                          >
                            {item.quantity}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.englishFont, { fontSize: 12 }]}>
                          {item.quantity}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Totals */}
            <View style={styles.totals}>
              <View
                style={{
                  minWidth: 140,
                  borderWidth: 2,
                  borderStyle: "solid",
                  borderColor: "#000",
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                {totalData.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={[styles.bigText, styles.textBold]}>
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.bigText,
                        styles.textBold,
                        styles.englishFont,
                        order.isPaid && {
                          textDecoration: "line-through",
                          textDecorationColor: "#000",
                        },
                      ]}
                    >
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default function OrdersPDFExport({
  orders,
  title,
  onPrintStatusChange,
}: OrdersPDFExportProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (orders.length === 0) {
    return (
      <button
        disabled
        className="btn-secondary opacity-50 cursor-not-allowed flex items-center"
      >
        <Download className="h-4 w-4 mr-2" />
        Export PDF
      </button>
    );
  }

  const hasAlreadyPrintedOrders = orders.some((o) => o.isPrinted);
  const allOrdersPrinted = orders.every((o) => o.isPrinted);

  const markOrdersAsPrinted = async () => {
    setIsUpdating(true);
    try {
      await Promise.all(orders.map((o) => ordersAPI.markAsPrinted(o.id)));
      toast.success("Orders marked as printed successfully");
      onPrintStatusChange?.(
        orders.map((o) => o.id),
        true
      );
    } catch (error) {
      console.error("Failed to mark orders as printed:", error);
      toast.error("Failed to mark orders as printed");
    } finally {
      setIsUpdating(false);
    }
  };

  if (hasAlreadyPrintedOrders) {
    const printedCount = orders.filter((o) => o.isPrinted).length;
    const unprintedCount = orders.filter((o) => !o.isPrinted).length;

    return (
      <div className="flex flex-col space-y-1">
        <button
          disabled
          className="btn-secondary opacity-50 cursor-not-allowed flex items-center"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {allOrdersPrinted ? "Already Printed" : "Mixed Selection"}
        </button>
        <div className="text-xs text-gray-600 px-2">
          {allOrdersPrinted
            ? `All ${printedCount} orders already printed`
            : `${printedCount} printed, ${unprintedCount} not printed. Reset individual orders to continue.`}
        </div>
      </div>
    );
  }

  const safeTitle = (title || "orders")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (
    <PDFDownloadLink
      document={<OrdersPDFDocument orders={orders} title={title} />}
      fileName={`${safeTitle}-${new Date().toISOString().split("T")[0]}.pdf`}
      className="menubox-button-primary flex items-center"
      onClick={markOrdersAsPrinted}
    >
      {({ loading }) => (
        <>
          <Download className="h-4 w-4 mr-2" />
          {loading
            ? "Generating PDF..."
            : isUpdating
            ? "Marking as Printed..."
            : "Export PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
