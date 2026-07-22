"use client";

import { useRef, useState } from "react";
import { UploadIcon, UserIcon } from "./icons";

export function PhotoUpload({
  label,
  onChange,
}: {
  label: string;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    if (f) {
      setPreview(URL.createObjectURL(f));
      onChange(f);
    } else {
      setPreview(null);
      onChange(null);
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith("image/")) handleFile(f);
      }}
      className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
        dragging ? "border-accent bg-accent-soft/40" : "border-line bg-paper-2/40 hover:border-accent/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-ink/60 py-2 text-xs font-medium text-paper opacity-0 transition-opacity group-hover:opacity-100">
            Click to replace
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center px-4 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-accent">
            <UserIcon className="h-6 w-6" />
          </span>
          <span className="mt-3 flex items-center gap-1.5 text-sm font-medium text-ink">
            <UploadIcon className="h-4 w-4" />
            Upload photo
          </span>
          <span className="mt-1 text-xs text-muted">
            A clear, front-facing photo works best
          </span>
        </div>
      )}
    </div>
  );
}
