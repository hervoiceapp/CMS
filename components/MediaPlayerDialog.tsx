"use client";

import { gsToHttps } from "@/lib/media";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MediaPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  mediaUrl: string;
  type: "audio" | "video";
}

export function MediaPlayerDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  mediaUrl,
  type,
}: MediaPlayerDialogProps) {
  const src = mediaUrl.startsWith("gs://") ? gsToHttps(mediaUrl) : mediaUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        {open && src ? (
          type === "audio" ? (
            <audio controls autoPlay src={src} className="w-full" />
          ) : (
            <video
              controls
              autoPlay
              playsInline
              src={src}
              className="max-h-[70vh] w-full rounded-xl bg-black"
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
