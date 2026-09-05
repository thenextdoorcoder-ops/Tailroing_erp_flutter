'use client';

import { useRef, useState } from 'react';
import { compressImage, formatFileSize, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/utils';

export interface AttachmentPreview {
  file: File;
  previewUrl: string;
  id: string;
}

interface OrderAttachmentsProps {
  attachments: AttachmentPreview[];
  onAttachmentsChange: (attachments: AttachmentPreview[]) => void;
  uploading?: boolean;
  uploadProgress?: number;
}

export default function OrderAttachments({
  attachments,
  onAttachmentsChange,
  uploading = false,
  uploadProgress = 0,
}: OrderAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `"${file.name}" is not a valid image. Only JPG, PNG, WEBP allowed.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" exceeds 1MB size limit.`;
    }
    return null;
  };

  const handleFilesAdded = async (files: FileList | null) => {
    if (!files) return;

    const newErrors: string[] = [];
    const newAttachments: AttachmentPreview[] = [];

    for (let i = 0; i < files.length; i++) {
      let file = files[i];

      // Automatically compress if it's an image and over 1MB
      if (file.type.startsWith('image/') && file.size > MAX_FILE_SIZE) {
        try {
          file = await compressImage(file);
        } catch (e) {
          console.error("Image compression failed:", e);
        }
      }

      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        newAttachments.push({
          file,
          previewUrl: URL.createObjectURL(file),
          id: generateId(),
        });
      }
    }

    setErrors(newErrors);

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }
  };

  const handleRemove = (id: string) => {
    const removed = attachments.find((a) => a.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesAdded(e.target.files);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            📎 Attachments
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload design references or capture cloth images
          </p>
        </div>
        {attachments.length > 0 && (
          <span className="text-sm text-gray-500">
            {attachments.length} file{attachments.length > 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-red-600 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </p>
          ))}
        </div>
      )}

      {/* Upload Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload from Gallery */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-3 px-4 py-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="flex flex-col items-center gap-1">
            <svg
              className="w-8 h-8 group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-medium">Upload Images</span>
            <span className="text-xs text-gray-400">JPG, PNG, WEBP • Max 1MB</span>
          </div>
        </button>

        {/* Capture from Camera */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-3 px-4 py-4 border-2 border-dashed border-green-300 rounded-xl text-green-600 hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="flex flex-col items-center gap-1">
            <svg
              className="w-8 h-8 group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm font-medium">Open Camera</span>
            <span className="text-xs text-gray-400">Take photo directly</span>
          </div>
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading attachments...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Image Preview Grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50 aspect-square"
            >
              {/* Image */}
              <img
                src={attachment.previewUrl}
                alt={attachment.file.name}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightboxImage(attachment.previewUrl)}
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setLightboxImage(attachment.previewUrl)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800 rounded-full p-1.5 mr-1"
                  title="Preview"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemove(attachment.id)}
                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-md"
                title="Remove"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* File Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-2 py-1">
                <p className="text-xs truncate">{attachment.file.name}</p>
                <p className="text-xs text-gray-300">
                  {formatFileSize(attachment.file.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">
            No attachments added yet. Upload images or take a photo.
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={lightboxImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}