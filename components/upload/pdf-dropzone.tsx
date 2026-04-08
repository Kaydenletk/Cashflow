/**
 * components/upload/pdf-dropzone.tsx
 *
 * Drag-and-drop zone that accepts a single PDF file and calls onFile()
 * with the File when the user drops (or clicks to pick). Thin wrapper
 * around react-dropzone — no upload logic lives here. The parent page
 * handles the POST to /api/pdf/parse and the preview/commit flow.
 *
 * States:
 *   - idle           → dashed border, "Drop a PDF here or click to pick"
 *   - drag-hover     → emerald border, brightened background
 *   - rejected       → red border, explains why (wrong type, too large)
 *   - disabled       → grey, non-interactive (during a parse/commit cycle)
 */

'use client';

import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';

import { cn } from '@/lib/utils';

// Max upload size. BoA checking statements are typically under 500KB, so
// 10MB gives us headroom for edge cases (very long months, image-heavy
// marketing pages) without letting a typo'd upload hog memory.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface PdfDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function PdfDropzone({ onFile, disabled = false }: PdfDropzoneProps) {
  const handleDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0 || accepted.length === 0) return;
      onFile(accepted[0]);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } =
    useDropzone({
      onDrop: handleDrop,
      accept: { 'application/pdf': ['.pdf'] },
      maxFiles: 1,
      maxSize: MAX_FILE_SIZE,
      disabled,
    });

  const rejection = fileRejections[0];

  return (
    <div className="flex flex-col gap-2">
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-8 py-12 text-center transition-colors',
          // Base state
          'border-[#262626] bg-[#141414]',
          // Drag hover
          isDragActive &&
            !isDragReject &&
            'border-[#10B981] bg-[#10B981]/5',
          // Drag reject (wrong type)
          isDragReject && 'border-[#EF4444] bg-[#EF4444]/5',
          // Disabled
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && 'cursor-pointer hover:border-[#10B981]/60 hover:bg-[#10B981]/5',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/10 text-[#10B981]">
          <UploadIcon />
        </div>
        {isDragActive ? (
          <p className="text-sm font-medium text-[#FAFAFA]">
            {isDragReject ? 'This file type is not supported' : 'Drop to upload'}
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#FAFAFA]">
              Drop a PDF here, or click to browse
            </p>
            <p className="text-xs text-[#525252]">
              Bank of America checking statements only (for now)
            </p>
          </div>
        )}
      </div>

      {rejection && (
        <p className="text-xs text-[#EF4444]" role="alert">
          {rejection.errors[0]?.message ?? 'File rejected.'}
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
