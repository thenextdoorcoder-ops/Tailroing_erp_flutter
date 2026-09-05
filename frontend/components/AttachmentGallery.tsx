'use client';

import { useState } from 'react';

interface Attachment {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface AttachmentGalleryProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void;
  canDelete?: boolean;
}

export default function AttachmentGallery({
  attachments,
  onDelete,
  canDelete = false,
}: AttachmentGalleryProps) {
  const [lightboxImage, setLightboxImage] = useState<Attachment | null>(null);

  const getFullUrl = (fileUrl: string): string => {
    if (fileUrl.startsWith('http')) return fileUrl;
    const base =
      process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
      (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
    return `${base}${fileUrl}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = getFullUrl(attachment.fileUrl);
    link.download = attachment.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📎</div>
        <p className="text-gray-500 text-sm">No attachments for this order</p>
      </div>
    );
  }

  return (
    <div>
      {/* Count */}
      <p className="text-sm text-gray-500 mb-4">
        {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="group relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50 aspect-square"
          >
            <img
              src={getFullUrl(attachment.fileUrl)}
              alt={attachment.fileName}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightboxImage(attachment)}
            />

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              {/* Enlarge */}
              <button
                type="button"
                onClick={() => setLightboxImage(attachment)}
                className="bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100 transition-colors shadow"
                title="View full size"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Download */}
              <button
                type="button"
                onClick={() => handleDownload(attachment)}
                className="bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100 transition-colors shadow"
                title="Download"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {/* Delete (Admin Only) */}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this attachment?')) {
                      onDelete(attachment.id);
                    }
                  }}
                  className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* File Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black to-transparent px-2 py-2">
              <p className="text-xs text-white truncate">{attachment.fileName}</p>
              <p className="text-xs text-gray-300">{formatFileSize(attachment.fileSize)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getFullUrl(lightboxImage.fileUrl)}
              alt={lightboxImage.fileName}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />

            {/* Lightbox Controls */}
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={() => handleDownload(lightboxImage)}
                className="bg-white text-gray-800 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-gray-100 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
              <button
                onClick={() => setLightboxImage(null)}
                className="bg-white text-gray-800 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
              >
                ✕ Close
              </button>
            </div>

            {/* File Info */}
            <div className="text-center mt-3">
              <p className="text-white text-sm">{lightboxImage.fileName}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {formatFileSize(lightboxImage.fileSize)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}