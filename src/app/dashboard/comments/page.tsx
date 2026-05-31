"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import { commentsAPI } from "@/lib/api";
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
  };
}

interface CommentWithOrder {
  id: string;
  content: string;
  status: "PENDING" | "CONFIRMED" | "DENIED";
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerLocation: string;
    totalPrice: number;
    orderAt: string;
    state: string;
    orderItems?: OrderItem[];
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function CommentsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<CommentWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [updating, setUpdating] = useState<string | null>(null);

  const toggleExpandRow = (commentId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const fetchComments = async (page: number, filter: string) => {
    try {
      setLoading(true);
      const response = await commentsAPI.getAll({
        status: filter === "ALL" ? undefined : filter,
        page,
        limit: pagination.limit,
      });
      console.log("API Response:", response.data.comments);
      setComments(response.data.comments);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching comments:", error);
      alert("Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchComments(1, statusFilter);
    }
    // Remove isAuthenticated and statusFilter from dependencies to avoid double fetch
    // The function will still work correctly
  }, []);

  const handleStatusChange = async (commentId: string, newStatus: "CONFIRMED" | "DENIED") => {
    try {
      setUpdating(commentId);
      await commentsAPI.updateStatus(commentId, newStatus);
      fetchComments(pagination.page, statusFilter);
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Failed to update comment");
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      setUpdating(commentId);
      await commentsAPI.delete(commentId);
      fetchComments(pagination.page, statusFilter);
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "CONFIRMED":
        return <CheckCircle className="h-4 w-4" />;
      case "DENIED":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "CONFIRMED":
        return "bg-green-100 text-green-800 border-green-300";
      case "DENIED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute permission="manage_orders">
      <DashboardLayout>
        <div className="bg-gray-50 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8 max-w-full">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      Order Comments
                    </h1>
                    <p className="text-gray-600">
                      Manage and review customer order comments
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => fetchComments(1, statusFilter)}
                  disabled={loading}
                  className="p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  title="Refresh comments"
                >
                  <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6 flex gap-2 flex-wrap">
              {["ALL", "PENDING", "CONFIRMED", "DENIED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Comments Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {comments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No comments found
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Main Row */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          {/* Order ID with Copy */}
                          <div className="md:col-span-2">
                            <div className="text-sm text-gray-600 mb-1">
                              Order ID
                            </div>
                            <div className="flex items-center space-x-2">
                              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                                {comment.order.id}
                              </code>
                              <button
                                onClick={() =>
                                  copyToClipboard(comment.order.id, "Order ID")
                                }
                                className="p-2 hover:bg-blue-50 rounded text-blue-600 flex-shrink-0"
                                title="Copy Order ID"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Customer Info */}
                          <div className="md:col-span-2">
                            <div className="text-sm text-gray-600 mb-1">
                              Customer
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {comment.order.customerName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {comment.order.customerPhone}
                            </div>
                          </div>

                          {/* Status and Actions */}
                          <div className="md:col-span-2 flex items-end justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm text-gray-600 mb-1">
                                Status
                              </div>
                              <span
                                className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full border text-xs font-medium ${getStatusStyles(
                                  comment.status
                                )}`}
                              >
                                {getStatusIcon(comment.status)}
                                <span>{comment.status}</span>
                              </span>
                            </div>
                            <button
                              onClick={() => toggleExpandRow(comment.id)}
                              className="p-2 hover:bg-gray-200 rounded text-gray-600"
                              title="View Details"
                            >
                              {expandedRows.has(comment.id) ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedRows.has(comment.id) && (
                        <div className="bg-gray-50 border-t border-gray-200 p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                              {/* Location */}
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">
                                  Location
                                </div>
                                <div className="text-sm text-gray-700">
                                  {comment.order.customerLocation ||
                                    "Not specified"}
                                </div>
                              </div>

                              {/* Order Status */}
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">
                                  Order Status
                                </div>
                                <div className="text-sm font-medium text-gray-700">
                                  {comment.order.state || "Unknown"}
                                </div>
                              </div>

                              {/* Order Date */}
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">
                                  Order Date
                                </div>
                                <div className="text-sm text-gray-700">
                                  {new Date(
                                    comment.order.orderAt
                                  ).toLocaleString()}
                                </div>
                              </div>

                              {/* Comment By */}
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">
                                  Comment By
                                </div>
                                <div className="text-sm text-gray-700">
                                  {comment.creator.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {comment.creator.email}
                                </div>
                              </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                              {/* Pricing */}
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">
                                  Pricing
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total:</span>
                                    <span className="font-medium text-gray-900">
                                      ${comment.order.totalPrice.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Approver Info */}
                              {comment.approver && (
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 mb-2">
                                    Approved By
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {comment.approver.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {comment.approver.email}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Products */}
                          {comment.order.orderItems &&
                            comment.order.orderItems.length > 0 && (
                              <div className="mb-6">
                                <div className="text-sm font-semibold text-gray-900 mb-3">
                                  Products
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg divide-y">
                                  {comment.order.orderItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-3 flex justify-between items-center"
                                    >
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {item.product.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Qty: {item.quantity}
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-gray-900">
                                        ${(item.price * item.quantity).toFixed(
                                          2
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Comment Content */}
                          <div className="mb-6">
                            <div className="text-sm font-semibold text-gray-900 mb-2">
                              Comment
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                              {comment.content}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                            {comment.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleStatusChange(comment.id, "CONFIRMED")
                                  }
                                  disabled={updating === comment.id}
                                  className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg disabled:opacity-50 transition-colors"
                                  title="Confirm"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Confirm
                                  </span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(comment.id, "DENIED")
                                  }
                                  disabled={updating === comment.id}
                                  className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg disabled:opacity-50 transition-colors"
                                  title="Deny"
                                >
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-sm font-medium">Deny</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(comment.id)}
                              disabled={updating === comment.id}
                              className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg disabled:opacity-50 transition-colors ml-auto"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="text-sm font-medium">Delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} comments
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchComments(pagination.page - 1, statusFilter)}
                      disabled={pagination.page === 1 || loading}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                      onClick={() => fetchComments(pagination.page + 1, statusFilter)}
                      disabled={pagination.page === pagination.pages || loading}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
