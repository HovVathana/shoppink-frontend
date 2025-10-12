"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Crop } from "lucide-react";
import { validateImageFile } from "@/lib/cloudinary";
import ImageCropper from "./ImageCropper";
import toast from "react-hot-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (file: File | null, previewUrl?: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  disabled = false,
  className = "",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(value || "");
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep internal preview in sync with external value prop
  // This ensures clearing the image resets the preview when switching from edit -> create
  useEffect(() => {
    setPreview(value || "");
    if (!value) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [value]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Create preview and show cropper
    const previewUrl = URL.createObjectURL(file);
    setOriginalImage(previewUrl);
    setShowCropper(true);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedBlob], "cropped-image.jpg", {
      type: "image/jpeg",
    });

    // Create preview URL
    const previewUrl = URL.createObjectURL(croppedBlob);
    setPreview(previewUrl);
    setSelectedFile(croppedFile);
    setShowCropper(false);

    // Pass file to parent (not uploaded yet)
    onChange(croppedFile, previewUrl);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImage("");
  };

  const handleRemove = () => {
    setPreview("");
    setSelectedFile(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Product Image
      </label>

      {/* Upload Area */}
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            preview
              ? "border-gray-300"
              : "border-gray-300 hover:border-gray-400"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Product preview"
              className="w-full h-auto max-h-48 mx-auto rounded-lg object-cover"
              style={{ width: "100%", height: "auto" }}
            />
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <ImageIcon className="h-full w-full" />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-primary-600">
                Click to upload
              </span>{" "}
              or drag and drop
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, WebP up to 5MB (will be cropped to square)
            </p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />

      {/* Current URL display (for debugging/manual entry) */}
      {value && (
        <div className="text-xs text-gray-500 break-all">
          Current URL: {value}
        </div>
      )}

      {/* Image Cropper Modal */}
      {showCropper && (
        <ImageCropper
          imageSrc={originalImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
