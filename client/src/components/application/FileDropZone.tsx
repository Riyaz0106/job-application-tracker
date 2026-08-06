import { useRef, useState, type DragEvent } from 'react';
import {
  ACCEPT_ATTRIBUTE,
  MAX_SIZE_LABEL,
} from '../../../../server/src/uploads/fileRules';

// Drop a file here, or click to browse.
//
// NO CONFLICT WITH THE BOARD'S CARD DRAG: dragging a file from the OS uses the
// HTML5 Drag and Drop API (dragenter/dragover/drop carrying a DataTransfer).
// dnd-kit's sensors listen to mouse/touch/keyboard events instead, and never see
// these. They're also in different DOM subtrees — this lives inside the detail
// slide-over, which is portalled to document.body, while the cards live on the
// board. preventDefault on dragover is what stops the browser from navigating
// away to the dropped file.
export function FileDropZone({
  label,
  onFile,
  disabled = false,
  busy = false,
  progress,
}: {
  label: string;
  onFile: (file: File) => void;
  disabled?: boolean;
  busy?: boolean;
  progress?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault(); // required, or the browser opens the file instead
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={handleDrop}
      className={`rounded-control border border-dashed p-md text-center transition-colors duration-fast ${
        dragOver ? 'border-signal bg-signal/5' : 'border-line'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {busy ? (
        <div className="flex flex-col gap-xs">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">
            Uploading {progress != null ? `${progress}%` : ''}
          </p>
          {/* Token-driven progress bar; width is data, not decoration. */}
          <div
            className="h-1 overflow-hidden rounded-pill bg-surface"
            role="progressbar"
            aria-valuenow={progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Uploading ${label}`}
          >
            <div
              className="h-full bg-signal transition-[width] duration-fast ease-out"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            Drop your {label.toLowerCase()} here, or
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mt-2xs min-h-11 rounded-control px-sm text-sm text-signal transition-colors duration-fast hover:brightness-110 disabled:opacity-50"
          >
            browse files
          </button>
          <p className="font-mono text-xs text-muted">
            PDF, DOCX, XLSX, TXT · max {MAX_SIZE_LABEL}
          </p>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        aria-label={`Choose a ${label} file`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ''; // allow re-picking the same file
        }}
      />
    </div>
  );
}
