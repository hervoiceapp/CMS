"use client";

import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { gsToHttps } from "@/lib/media";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ArticlePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: Article | null;
}

export function ArticlePreviewDialog({
  open,
  onOpenChange,
  article,
}: ArticlePreviewDialogProps) {
  if (!article) return null;
  const cover = article.imageUrl ? gsToHttps(article.imageUrl) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">{article.title}</DialogTitle>
        </DialogHeader>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="h-56 w-full rounded-xl object-cover"
          />
        )}
        <div className="space-y-2">
          <Badge variant="secondary">{article.category}</Badge>
          <h2 className="text-2xl font-bold tracking-tight">{article.title}</h2>
          <p className="text-sm text-muted-foreground">
            {article.author} • {formatDate(article.createdAt)}
          </p>
          {article.subtitle && (
            <p className="text-muted-foreground">{article.subtitle}</p>
          )}
        </div>
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content || "" }}
        />
      </DialogContent>
    </Dialog>
  );
}