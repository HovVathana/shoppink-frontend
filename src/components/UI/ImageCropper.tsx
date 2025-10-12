"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Check } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const [cropArea, setCropArea] = useState<CropArea>({
    x: 50,
    y: 50,
    width: 200,
    height: 200,
  });

  // Initialize crop area when image loads
  useEffect(() => {
    if (imageLoaded && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height) * 0.6;
      setCropArea({
        x: (rect.width - size) / 2,
        y: (rect.height - size) / 2,
        width: size,
        height: size,
      });
    }
  }, [imageLoaded]);

  const getRelativePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageRef.current) return { x: 0, y: 0 };
      const rect = imageRef.current.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const handleStart = useCallback(
    (clientX: number, clientY: number, action: "drag" | "resize") => {
      const pos = getRelativePosition(clientX, clientY);
      setDragStart(pos);

      if (action === "drag") {
        setIsDragging(true);
      } else {
        setIsResizing(true);
      }
    },
    [getRelativePosition]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, action: "drag" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      handleStart(e.clientX, e.clientY, action);
    },
    [handleStart]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, action: "drag" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, action);
    },
    [handleStart]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageRef.current) return;

      const rect = imageRef.current.getBoundingClientRect();
      const pos = getRelativePosition(clientX, clientY);

      if (isDragging) {
        const deltaX = pos.x - dragStart.x;
        const deltaY = pos.y - dragStart.y;

        setCropArea((prev) => {
          const newX = Math.max(
            0,
            Math.min(rect.width - prev.width, prev.x + deltaX)
          );
          const newY = Math.max(
            0,
            Math.min(rect.height - prev.height, prev.y + deltaY)
          );
          return { ...prev, x: newX, y: newY };
        });

        setDragStart(pos);
      } else if (isResizing) {
        const deltaX = pos.x - dragStart.x;
        const deltaY = pos.y - dragStart.y;
        const delta = Math.max(deltaX, deltaY); // Use the larger delta for square ratio

        setCropArea((prev) => {
          const newSize = Math.max(
            50,
            Math.min(
              Math.min(rect.width - prev.x, rect.height - prev.y),
              prev.width + delta
            )
          );
          return { ...prev, width: newSize, height: newSize };
        });

        setDragStart(pos);
      }
    },
    [isDragging, isResizing, dragStart, getRelativePosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    },
    [handleMove]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = imageRef.current;
    const rect = image.getBoundingClientRect();

    // Calculate scale factors
    const scaleX = image.naturalWidth / rect.width;
    const scaleY = image.naturalHeight / rect.height;

    // Set canvas size to square
    const outputSize = 400; // Output square size
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calculate crop coordinates in original image
    const cropX = cropArea.x * scaleX;
    const cropY = cropArea.y * scaleY;
    const cropWidth = cropArea.width * scaleX;
    const cropHeight = cropArea.height * scaleY;

    // Draw cropped image
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputSize,
      outputSize
    );

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      "image/jpeg",
      0.9
    );
  }, [cropArea, onCropComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Crop Image</h3>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="text-gray-400 hover:text-gray-600 p-2 -mr-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            <span className="hidden sm:inline">Drag the square to position your crop area. Drag the corner to resize.</span>
            <span className="sm:hidden">Touch and drag to position. Use corner to resize.</span>
            {" "}The image will be cropped to a square.
          </p>

          <div
            ref={containerRef}
            className="relative inline-block select-none touch-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="max-w-full max-h-[60vh] sm:max-h-96 object-contain"
              style={{ width: "100%", height: "auto", touchAction: "none" }}
              onLoad={() => setImageLoaded(true)}
              draggable={false}
            />

            {imageLoaded && (
              <>
                {/* Crop overlay */}
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 cursor-move touch-none"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "drag")}
                  onTouchStart={(e) => handleTouchStart(e, "drag")}
                >
                  <div className="absolute inset-0 border border-white border-dashed"></div>

                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 border-2 border-white cursor-se-resize touch-none"
                    style={{ transform: "translate(50%, 50%)" }}
                    onMouseDown={(e) => handleMouseDown(e, "resize")}
                    onTouchStart={(e) => handleTouchStart(e, "resize")}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3 mt-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="px-4 py-2.5 text-sm sm:text-base text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCrop();
            }}
            className="px-4 py-2.5 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            disabled={!imageLoaded}
          >
            <Check className="h-4 w-4" />
            <span>Apply Crop</span>
          </button>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
