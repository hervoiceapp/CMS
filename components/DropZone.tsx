"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { uploadFile, gsToHttps } from "@/lib/media";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CloudUploadIcon,
  Loading03Icon,
  FileAudioIcon,
  FileVideoIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

interface DropZoneProps {
  accept?: string;
  maxSizeMB?: number;
  pathPrefix?: string;
  value?: string | null;
  onChange: (gsUrl: string, httpsUrl?: string) => void;
  label: string;
  onUploadComplete?: (url: string) => void;
  onError?: (error: string) => void;
  extractDuration?: boolean;
  onDurationExtracted?: (seconds: number) => void;
}

function fileNameFromUrl(url: string): string {
  const last = url.split("?")[0].split("/").pop() ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function DropZone({
  accept = "image/*",
  maxSizeMB = 10,
  pathPrefix = "uploads",
  value,
  onChange,
  label,
  onUploadComplete,
  onError,
  extractDuration,
  onDurationExtracted,
}: DropZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAudio = accept.startsWith("audio/");
  const isVideo = accept.startsWith("video/");

  // `preview` only holds a transient image set while the user picks a new file.
  // Otherwise the display source is derived from `value` at render time, so
  // asynchronously-loaded edit data (gs:// URIs) just works without an effect.
  const imageSrc =
    !isAudio && !isVideo
      ? (preview ?? (value ? (value.startsWith("gs://") ? gsToHttps(value) : value) : null))
      : null;

  const extractMediaDuration = useCallback(
    (file: File): Promise<number> => {
      return new Promise((resolve, reject) => {
        if (isVideo) {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            resolve(Math.round(video.duration));
          };
          video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error("Could not read video duration"));
          };
          video.src = URL.createObjectURL(file);
        } else {
          const audio = new Audio();
          audio.preload = "metadata";
          audio.onloadedmetadata = () => {
            URL.revokeObjectURL(audio.src);
            resolve(Math.round(audio.duration));
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audio.src);
            reject(new Error("Could not read audio duration"));
          };
          audio.src = URL.createObjectURL(file);
        }
      });
    },
    [isVideo],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.add({ title: `File too large (max ${maxSizeMB}MB)`, type: "error" });
        onError?.(`File too large (max ${maxSizeMB}MB)`);
        return;
      }
      setFileName(file.name);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }

      if (extractDuration && (isAudio || isVideo)) {
        try {
          const duration = await extractMediaDuration(file);
          onDurationExtracted?.(duration);
        } catch {
          // duration extraction failed silently
        }
      }

      setUploading(true);
      setProgress(0);
      try {
        const { gsUrl, httpsUrl } = await uploadFile(file, pathPrefix, (pct) => setProgress(pct));
        setPreview(httpsUrl);
        onChange(gsUrl, httpsUrl);
        onUploadComplete?.(gsUrl);
        toast.add({ title: "Upload complete", type: "success" });
      } catch {
        toast.add({ title: "Upload failed. Please try again.", type: "error" });
        onError?.("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [
      maxSizeMB,
      isAudio,
      isVideo,
      extractDuration,
      extractMediaDuration,
      pathPrefix,
      onChange,
      onUploadComplete,
      onError,
      onDurationExtracted,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    onChange("");
  };

  const hasMedia = !!value && (isAudio || isVideo);
  const mediaSrc = value ? (value.startsWith("gs://") ? gsToHttps(value) : value) : "";

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium">{label}</label>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-150",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-muted-foreground/40",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <HugeiconsIcon
              icon={isAudio ? FileAudioIcon : isVideo ? FileVideoIcon : CloudUploadIcon}
              className="size-10"
            />
            {fileName && (
              <span className="max-w-full truncate text-sm font-medium text-foreground">
                {fileName}
              </span>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
              <span>Uploading {progress}%</span>
            </div>
          </div>
        ) : hasMedia ? (
          <div className="w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={isAudio ? FileAudioIcon : FileVideoIcon}
                className="size-5 shrink-0 text-primary"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {fileNameFromUrl(value!) || (isAudio ? "Audio attached" : "Video attached")}
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-white shadow"
                aria-label="Remove media"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              </button>
            </div>
            {isAudio ? (
              <audio controls src={mediaSrc} className="w-full" />
            ) : (
              <video controls src={mediaSrc} className="max-h-44 w-full rounded-xl bg-black" />
            )}
            <p className="text-center text-xs text-muted-foreground/70">
              Drop a new file or click to replace
            </p>
          </div>
        ) : imageSrc ? (
          <div className="relative w-full max-w-[200px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt="Preview" className="h-32 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow"
              aria-label="Remove"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <HugeiconsIcon
              icon={isAudio ? FileAudioIcon : isVideo ? FileVideoIcon : CloudUploadIcon}
              className="size-10"
            />
            <span className="text-sm font-medium">
              Drop {isAudio ? "audio" : isVideo ? "video" : "image"} here or click to browse
            </span>
            <span className="text-xs text-muted-foreground/70">Max {maxSizeMB}MB</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />
      </div>
    </div>
  );
}
