"use client";

import { useState } from "react";
import { X, User as UserIcon, Loader2, Key, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/lib/api";
import { uploadProfilePictureToCloudinary } from "@/lib/cloudinary";
import ImageUpload from "@/components/UI/ImageUpload";
import toast from "react-hot-toast";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
}: EditProfileModalProps) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null
  );
  const [profilePicturePreview, setProfilePicturePreview] = useState(
    user?.profilePicture || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (file: File | null, previewUrl?: string) => {
    setProfilePictureFile(file);
    if (previewUrl) {
      setProfilePicturePreview(previewUrl);
    } else if (file === null) {
      // User removed the image
      setProfilePicturePreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Validate password fields if user wants to change password
    if (changePassword) {
      if (!currentPassword.trim()) {
        toast.error("Current password is required");
        return;
      }
      if (!newPassword.trim()) {
        toast.error("New password is required");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters long");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match");
        return;
      }
      if (currentPassword === newPassword) {
        toast.error("New password must be different from current password");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let profilePictureUrl = user?.profilePicture;
      let profilePictureChanged = false;

      // Upload new profile picture if selected
      if (profilePictureFile) {
        toast.loading("Uploading profile picture...", { id: "upload" });
        profilePictureUrl = await uploadProfilePictureToCloudinary(
          profilePictureFile
        );
        toast.success("Profile picture uploaded!", { id: "upload" });
        profilePictureChanged = true;
      } else if (profilePicturePreview === "" && user?.profilePicture) {
        // User removed existing profile picture
        profilePictureUrl = "";
        profilePictureChanged = true;
      }

      // Update profile
      const profileData: { name: string; profilePicture?: string } = {
        name: name.trim(),
      };
      
      // Include profilePicture if it changed (including removal)
      if (profilePictureChanged) {
        profileData.profilePicture = profilePictureUrl || "";
      }
      
      await authAPI.updateProfile(profileData);

      // Change password if requested
      if (changePassword) {
        await authAPI.changePassword({
          currentPassword,
          newPassword,
        });
        toast.success("Password changed successfully!");
      }

      // Refresh user data
      await refreshUser();

      toast.success(
        changePassword
          ? "Profile and password updated successfully!"
          : "Profile updated successfully!"
      );
      onClose();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className="relative w-full max-w-md max-h-[85vh] bg-white rounded-lg shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-black" />
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Profile
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <form
            id="edit-profile-form"
            onSubmit={handleSubmit}
            className="p-6 space-y-6"
          >
            {/* Profile Picture Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                {/* Current Profile Picture */}
                <div className="flex-shrink-0">
                  {profilePicturePreview ? (
                    <img
                      src={profilePicturePreview}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Upload Component */}
                <div className="flex-1">
                  <ImageUpload
                    value={profilePicturePreview}
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                    className=""
                  />
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black disabled:opacity-50 disabled:bg-gray-50"
                placeholder="Enter your name"
                required
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed
              </p>
            </div>

            {/* Password Change Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Change Password
                  </h3>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={changePassword}
                    onChange={(e) => {
                      setChangePassword(e.target.checked);
                      if (!e.target.checked) {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }
                    }}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <div className="relative">
                    <div
                      className={`block w-10 h-6 rounded-full transition-colors duration-200 ${
                        changePassword ? "bg-black" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                          changePassword ? "transform translate-x-4" : ""
                        }`}
                      />
                    </div>
                  </div>
                </label>
              </div>

              {changePassword && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* Current Password */}
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black disabled:opacity-50 disabled:bg-gray-50"
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        disabled={isSubmitting}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black disabled:opacity-50 disabled:bg-gray-50"
                        placeholder="Enter new password (min. 6 characters)"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        disabled={isSubmitting}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-black focus:border-black disabled:opacity-50 disabled:bg-gray-50 ${
                          confirmPassword && newPassword !== confirmPassword
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={isSubmitting}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">
                        Passwords do not match
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-4">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-profile-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
