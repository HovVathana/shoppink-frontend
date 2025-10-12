import { Cloudinary } from "@cloudinary/url-gen/index";

// Initialize Cloudinary
export const cloudinary = new Cloudinary({
  cloud: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwk0mwboj",
  },
});

// Convert blob to File
export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: blob.type });
};

// Upload image to Cloudinary
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "itf2fg8g");
  formData.append("folder", "shoppink/products");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dzudzufru/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary error:", errorData);

      // If upload preset doesn't exist, provide helpful error message
      if (errorData.error?.message?.includes("upload_preset")) {
        throw new Error(
          "Upload preset not configured. Please check CLOUDINARY_SETUP.md for instructions."
        );
      }

      throw new Error(errorData.error?.message || "Failed to upload image");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Upload profile picture to Cloudinary
export const uploadProfilePictureToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "itf2fg8g");
  formData.append("folder", "shoppink/profiles");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dzudzufru/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary error:", errorData);

      // If upload preset doesn't exist, provide helpful error message
      if (errorData.error?.message?.includes("upload_preset")) {
        throw new Error(
          "Upload preset not configured. Please check CLOUDINARY_SETUP.md for instructions."
        );
      }

      throw new Error(errorData.error?.message || "Failed to upload profile picture");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw error;
  }
};

// Validate image file
export const validateImageFile = (file: File): string | null => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    return "Please select a valid image file (JPEG, PNG, or WebP)";
  }

  if (file.size > maxSize) {
    return "Image size must be less than 5MB";
  }

  return null;
};
