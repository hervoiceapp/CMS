"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection } from "@/hooks/use-collection";
import { podcastSchema, type PodcastForm } from "@/lib/schemas";
import type { Podcast } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { gsToHttps, deleteFile } from "@/lib/media";
import { formatDuration } from "@/lib/media";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DropZone } from "@/components/DropZone";
import { MediaPlayerDialog } from "@/components/MediaPlayerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { PodcastIcon, PlayCircleIcon, PlusSignIcon } from "@hugeicons/core-free-icons";

export default function PodcastsPage() {
  const { data, loading, error } = useCollection<Podcast>("podcasts");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Podcast | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Podcast | null>(null);
  const [playing, setPlaying] = useState<Podcast | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PodcastForm>({
    resolver: zodResolver(podcastSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      author: "",
      duration: "",
      image_url: "",
      uri: "",
      imageColor: "#FECACA",
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      title: "",
      subtitle: "",
      author: "",
      duration: "",
      image_url: "",
      uri: "",
      imageColor: "#FECACA",
    });
    setModalOpen(true);
  };

  const openEdit = (item: Podcast) => {
    setEditing(item);
    form.reset({
      title: item.title,
      subtitle: item.subtitle,
      author: item.author,
      duration: item.duration,
      image_url: item.image_url,
      uri: item.uri,
      imageColor: item.imageColor || "#FECACA",
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: PodcastForm) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "podcasts", editing.id), values);
        toast.add({ title: "Podcast updated", type: "success" });
      } else {
        await addDoc(collection(db, "podcasts"), values);
        toast.add({ title: "Podcast uploaded", type: "success" });
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to save podcast", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFile(deleteTarget.uri).catch(() => {});
      if (deleteTarget.image_url) {
        await deleteFile(deleteTarget.image_url).catch(() => {});
      }
      await deleteDoc(doc(db, "podcasts", deleteTarget.id));
      toast.add({ title: "Podcast removed", type: "success" });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete podcast", type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo<ColumnDef<Podcast>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
          const pod = row.original;
          const thumb = pod.image_url ? gsToHttps(pod.image_url) : "";
          return (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaying(pod)}
                className="group relative size-10 shrink-0 overflow-hidden rounded-xl"
                aria-label={`Play ${pod.title}`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="size-full object-cover" />
                ) : (
                  <span
                    className="flex size-full items-center justify-center"
                    style={{ backgroundColor: pod.imageColor || "#FECACA" }}
                  >
                    <HugeiconsIcon icon={PodcastIcon} className="size-4" />
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                  <HugeiconsIcon icon={PlayCircleIcon} className="size-5 text-white" />
                </span>
              </button>
              <div className="min-w-0">
                <p className="truncate font-medium">{pod.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {pod.subtitle}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "author",
        header: "Author",
      },
      {
        accessorKey: "duration",
        header: "Duration",
        cell: ({ getValue }) =>
          getValue() ? formatDuration(String(getValue())) : "—",
      },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: ({ getValue }) => formatDate(getValue()),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Podcast Studio"
        description="Upload, schedule, and manage audio support tracks"
        action={
          <Button onClick={openCreate}>
            <HugeiconsIcon icon={PlusSignIcon} />
            New Podcast
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        searchable
        onEdit={openEdit}
        onDelete={(item) => setDeleteTarget(item)}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Podcast" : "Upload Podcast"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update episode metadata and artwork."
                : "Add a new audio track to the library."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            id="podcast-form"
          >
            <DropZone
              label="Audio File"
              accept="audio/*"
              maxSizeMB={100}
              pathPrefix="her_voice_meta/podcasts"
              value={form.watch("uri")}
              onChange={(gsUrl) => form.setValue("uri", gsUrl)}
              extractDuration
              onDurationExtracted={(sec) =>
                form.setValue("duration", String(sec))
              }
            />
            {form.formState.errors.uri && (
              <p className="text-xs text-destructive">
                {form.formState.errors.uri.message}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="podcast-title">Episode Title</Label>
                <Input
                  id="podcast-title"
                  placeholder="e.g. Breathing for Calm"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="podcast-author">Host / Author</Label>
                <Input
                  id="podcast-author"
                  placeholder="e.g. Amoa Serwah"
                  {...form.register("author")}
                />
                {form.formState.errors.author && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.author.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="podcast-subtitle">Subtitle</Label>
              <Input
                id="podcast-subtitle"
                placeholder="Short description of the episode"
                {...form.register("subtitle")}
              />
              {form.formState.errors.subtitle && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.subtitle.message}
                </p>
              )}
            </div>

            <DropZone
              label="Cover Artwork"
              accept="image/*"
              pathPrefix="her_voice_meta/podcasts"
              value={form.watch("image_url")}
              onChange={(gsUrl) => form.setValue("image_url", gsUrl)}
            />
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="podcast-form" disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Update Podcast" : "Add to Library"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Podcast"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? Its audio file will also be removed.`}
        onConfirm={handleDelete}
      />

      <MediaPlayerDialog
        open={!!playing}
        onOpenChange={(open) => {
          if (!open) setPlaying(null);
        }}
        title={playing?.title ?? ""}
        subtitle={playing?.subtitle}
        mediaUrl={playing?.uri ?? ""}
        type="audio"
      />
    </div>
  );
}
