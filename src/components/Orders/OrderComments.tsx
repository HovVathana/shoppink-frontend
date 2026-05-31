import React, { useState, useEffect, useCallback } from "react";
import { commentsAPI } from "@/lib/api";
import { MessageCircle, Send, Clock, CheckCircle, XCircle } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  status: "PENDING" | "CONFIRMED" | "DENIED";
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
}

interface OrderCommentsProps {
  orderId: string;
  readonly?: boolean; // If true, only show comments without form
}

export default function OrderComments({
  orderId,
  readonly = false,
}: OrderCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 0,
  });

  const fetchComments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await commentsAPI.getByOrderId(orderId, {
        page,
        limit: pagination.limit,
      });
      setComments(response.data.comments);
      setPagination({
        page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages,
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [orderId, pagination.limit]);

  useEffect(() => {
    if (orderId) {
      fetchComments(1);
    }
  }, [orderId, fetchComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      alert("Please enter a comment");
      return;
    }

    try {
      setSubmitting(true);
      const response = await commentsAPI.create(orderId, newComment);
      
      // Optimistically add the new comment to the list immediately
      const createdComment = response.data;
      const newCommentObject: Comment = {
        id: createdComment.id,
        content: createdComment.content,
        status: createdComment.status || "PENDING",
        createdAt: createdComment.createdAt || new Date().toISOString(),
        updatedAt: createdComment.updatedAt || new Date().toISOString(),
        creator: createdComment.creator,
        approver: createdComment.approver,
      };
      
      // Add to the beginning of the list
      setComments([newCommentObject, ...comments]);
      
      // Update pagination
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1,
      }));
      
      setNewComment("");
    } catch (error) {
      console.error("Error creating comment:", error);
      alert("Failed to create comment");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "CONFIRMED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "DENIED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-green-100 text-green-800",
      DENIED: "bg-red-100 text-red-800",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({pagination.total})
        </h3>
      </div>

      {/* Comment Form - Only show if not readonly */}
      {!readonly && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment about this order..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={submitting}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : "Post Comment"}
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {loading && comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No comments yet</div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(comment.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(comment.status)}
                      <span>{comment.status}</span>
                    </div>
                  </div>
                  {comment.creator && (
                    <span className="text-xs text-gray-600 font-medium">
                      by {comment.creator.name}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString()} at{" "}
                    {new Date(comment.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700">{comment.content}</p>
              {comment.approver && (
                <div className="text-xs text-gray-600 flex items-center space-x-1">
                  <span>Reviewed by:</span>
                  <span className="font-medium">{comment.approver.name}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-4">
          <button
            onClick={() => fetchComments(pagination.page - 1)}
            disabled={pagination.page === 1 || loading}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => fetchComments(pagination.page + 1)}
            disabled={pagination.page === pagination.pages || loading}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
