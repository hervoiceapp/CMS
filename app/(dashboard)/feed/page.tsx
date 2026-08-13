"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc, getDoc, increment, updateDoc } from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection, useCollectionWhere } from "@/hooks/use-collection";
import type { Post, PostComment } from "@/lib/types";
import { normalizePost, formatDate, formatDateTime } from "@/lib/types";
import { gsToHttps } from "@/lib/media";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatIcon, Delete02Icon } from "@hugeicons/core-free-icons";

export default function FeedPage() {
  const { data, loading, error } = useCollection<Record<string, unknown> & { id: string }>("posts");
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<PostComment | null>(null);

  const posts = useMemo(() => data.map((raw) => normalizePost(raw)), [data]);

  const { data: comments, loading: commentsLoading } = useCollectionWhere<PostComment>(
    "postComments",
    "postId",
    selectedPost?.id,
  );

  const sortedComments = useMemo(() => {
    const ts = (v?: PostComment["createdAt"]) => {
      if (!v) return 0;
      if (typeof v === "number") return v;
      if (v instanceof Date) return v.getTime();
      if (typeof (v as { seconds?: number }).seconds === "number") {
        return (v as { seconds: number }).seconds * 1000;
      }
      if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
        return (v as { toMillis(): number }).toMillis();
      }
      return 0;
    };
    return [...comments].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
  }, [comments]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "posts", deleteTarget.id));
      toast.add({ title: "Post removed", type: "success" });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete post", type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentTarget || !selectedPost) return;
    try {
      await deleteDoc(doc(db, "postComments", deleteCommentTarget.id));
      const postSnap = await getDoc(doc(db, "posts", selectedPost.id));
      const raw = postSnap.data() ?? {};
      const field =
        typeof raw.commentsCount === "number" && typeof raw.comments !== "number"
          ? "commentsCount"
          : "comments";
      await updateDoc(doc(db, "posts", selectedPost.id), {
        [field]: increment(-1),
      }).catch(() => {});
      toast.add({ title: "Comment removed", type: "success" });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete comment", type: "error" });
    } finally {
      setDeleteCommentTarget(null);
    }
  };

  const columns = useMemo<ColumnDef<Post>[]>(
    () => [
      {
        accessorKey: "content",
        header: "Post",
        cell: ({ row }) => {
          const post = row.original;
          const text = post.content || "";
          const src = post.imageUrl
            ? post.imageUrl.startsWith("gs://")
              ? gsToHttps(post.imageUrl)
              : post.imageUrl
            : "";
          return (
            <div className="flex items-start gap-3">
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
              )}
              <p className="line-clamp-2 max-w-md text-sm">
                {text || <span className="text-muted-foreground">No content</span>}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "authorName",
        header: "Author",
        cell: ({ getValue }) => {
          const name = String(getValue() ?? "");
          return name ? (
            <span className="font-medium">{name}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "comments",
        header: "Comments",
        cell: ({ getValue }) => String(getValue() ?? 0),
      },
      {
        accessorKey: "likes",
        header: "Likes",
        cell: ({ getValue }) => String(getValue() ?? 0),
      },
      {
        accessorKey: "createdAt",
        header: "Posted",
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        id: "view",
        header: "",
        cell: ({ row }) => {
          const post = row.original;
          return (
            <Button variant="outline" size="sm" onClick={() => setSelectedPost(post)}>
              <HugeiconsIcon icon={BubbleChatIcon} />
              Comments
            </Button>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Community Feed" description="Review user-submitted posts" />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{posts.length} total posts</Badge>
      </div>

      <DataTable
        columns={columns}
        data={posts}
        loading={loading}
        error={error}
        searchable
        onDelete={(item) => setDeleteTarget(item)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Remove Post"
        description="Are you sure you want to permanently remove this post from the community feed?"
        onConfirm={handleDelete}
      />

      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>
              {selectedPost?.authorName || "Community Member"} ·{" "}
              {formatDate(selectedPost?.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {commentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : sortedComments.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              No comments on this post yet.
            </p>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {sortedComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start justify-between gap-3 rounded-xl border bg-muted/30 p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.authorName || "Community Member"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">
                        {comment.content || "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteCommentTarget(comment)}
                      aria-label="Delete comment"
                    >
                      <HugeiconsIcon icon={Delete02Icon} />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPost(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCommentTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteCommentTarget(null);
        }}
        title="Remove Comment"
        description="Are you sure you want to permanently remove this comment?"
        onConfirm={handleDeleteComment}
      />
    </div>
  );
}
