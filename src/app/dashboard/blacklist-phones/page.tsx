"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, ShieldAlert, Plus, Search, Phone, RotateCcw } from "lucide-react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { blacklistAPI } from "@/lib/api";

interface BlacklistEntry {
  id: string;
  phone: string; // normalized
  rawPhone: string;
  reason?: string;
  createdAt: string;
  createdBy?: string | null;
}

const normalizePhone = (p?: string) => (p || "").replace(/[^0-9]/g, "");

export default function BlacklistPhonesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const loadEntries = async (bustCache = false) => {
    try {
      setIsLoading(true);
      const res = await blacklistAPI.getAll(bustCache);
      setEntries(res.data?.data?.entries || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load blacklist");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!normalized) return toast.error("Please enter a valid phone number");
    try {
      setIsSubmitting(true);
      await blacklistAPI.create({ phone, reason: reason || undefined });
      toast.success("Added to blacklist");
      setPhone("");
      setReason("");
      await loadEntries();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to add";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await blacklistAPI.delete(id);
      toast.success("Removed");
      await loadEntries();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete");
    }
  };

  const handleAddPhone = () => {
    setShowAddForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    await handleAdd(e);
    setShowAddForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* MenuBox-inspired Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <div className="w-12 h-12 bg-gradient-to-r from-[#070B34] to-[#070B34] rounded-2xl flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Blacklist Phones
                </h1>
                <p className="text-gray-600">
                  Manage blacklisted phone numbers and restrictions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => loadEntries(true)}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#070B34] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Refresh blacklist"
              >
                <RotateCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium text-gray-700">
                  Refresh
                </span>
              </button>
              <button
                onClick={handleAddPhone}
                className="menubox-button-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Phone</span>
              </button>
            </div>
          </div>

          {/* Add Form Modal/Card */}
          {showAddForm && (
            <div className="menubox-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Phone to Blacklist
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={handleFormSubmit}
                className="grid gap-4 md:grid-cols-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="Enter phone number"
                    className="menubox-input w-full"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will be normalized to digits only
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (optional)
                  </label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    type="text"
                    placeholder="Reason for blacklisting"
                    className="menubox-input w-full"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="menubox-button-primary flex-1"
                  >
                    {isSubmitting ? "Adding..." : "Add to Blacklist"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="menubox-button-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Blacklisted Phones Table */}
          <div className="menubox-table">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="menubox-table-header">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td
                        className="px-6 py-4 text-center text-sm text-gray-500"
                        colSpan={4}
                      >
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                          <span className="ml-2">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td
                        className="px-6 py-8 text-center text-sm text-gray-500"
                        colSpan={4}
                      >
                        <ShieldAlert className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <div>No blacklisted phones found</div>
                        <p className="text-xs text-gray-400 mt-1">
                          Add phone numbers to prevent orders from these
                          contacts
                        </p>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                <Phone className="h-5 w-5 text-red-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {entry.rawPhone}
                              </div>
                              <div className="text-sm text-gray-500">
                                Normalized: {entry.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.reason || "No reason specified"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Remove from Blacklist"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
