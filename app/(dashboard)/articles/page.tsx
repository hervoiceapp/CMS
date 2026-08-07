"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection } from "@/hooks/use-collection";
import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { gsToHttps, deleteFile } from "@/lib/media";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ArticlePreviewDialog } from "@/components/ArticlePreviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { MedicalFileIcon, EyeIcon, PlusSignIcon } from "@hugeicons/core-free-icons";

const categoryColor: Record<string, string> = {
  educational: "bg-blue-500/10 text-blue-600",
  "mental health": "bg-violet-500/10 text-violet-600",
  "postnatal guidance": "bg-emerald-500/10 text-emerald-600",
};

export default function ArticlesPage() {
  const { data, loading, error } = useCollection<Article>("articles");
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [previewing, setPreviewing] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.imageUrl) {
        await deleteFile(deleteTarget.imageUrl).catch(() => { });
      }
      await deleteDoc(doc(db, "articles", deleteTarget.id));
      toast.add({ title: "Article deleted", type: "success" });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete article", type: "error" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns = useMemo<ColumnDef<Article>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
          const article = row.original;
          const thumb = article.imageUrl ? gsToHttps(article.imageUrl) : "";
          return (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewing(article)}
                className="group relative size-10 shrink-0 overflow-hidden rounded-lg"
                aria-label={`Preview ${article.title}`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center bg-muted">
                    <HugeiconsIcon icon={MedicalFileIcon} className="size-4" />
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                  <HugeiconsIcon icon={EyeIcon} className="size-4 text-white" />
                </span>
              </button>
              <div className="min-w-0">
                <p className="truncate font-medium">{article.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {article.subtitle}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => {
          const value = String(getValue());
          return (
            <Badge className={categoryColor[value] ?? "bg-muted"}>
              {value}
            </Badge>
          );
        },
      },
      {
        accessorKey: "author",
        header: "Author",
      },
      {
        accessorKey: "likes",
        header: "Likes",
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) => formatDate(getValue()),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Article & Guides"
        description="Compose, edit, and manage published support articles"
        action={
          <Button nativeButton={false} render={<Link href="/articles/new" />}>
            <HugeiconsIcon icon={PlusSignIcon} />
            New Article
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        searchable
        onEdit={(item) => {
          window.location.href = `/articles/${item.id}/edit`;
        }}
        onDelete={(item) => setDeleteTarget(item)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Article"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
      />

      <ArticlePreviewDialog
        open={!!previewing}
        onOpenChange={(open) => {
          if (!open) setPreviewing(null);
        }}
        article={previewing}
      />
    </div>
  );
}
