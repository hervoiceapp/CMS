"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection } from "@/hooks/use-collection";
import type { Post } from "@/lib/types";
import { normalizePost, formatDate } from "@/lib/types";
import { gsToHttps } from "@/lib/media";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

export default function FeedPage() {
  const { data, loading, error } = useCollection<Record<string, unknown> & { id: string }>("posts");
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  const posts = useMemo(() => data.map((raw) => normalizePost(raw)), [data]);

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
    </div>
  );
}
