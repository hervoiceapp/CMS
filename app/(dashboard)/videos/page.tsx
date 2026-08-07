"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection } from "@/hooks/use-collection";
import { videoSchema, type VideoForm } from "@/lib/schemas";
import { VIDEO_CATEGORIES } from "@/lib/constants";
import type { Video } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { gsToHttps, deleteFile, formatDuration } from "@/lib/media";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DropZone } from "@/components/DropZone";
import { MediaPlayerDialog } from "@/components/MediaPlayerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
import { Tv01Icon, PlayCircleIcon, PlusSignIcon } from "@hugeicons/core-free-icons";

export default function VideosPage() {
  const { data, loading, error } = useCollection<Video>("videos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<VideoForm>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: "",
      description: "",
      coach: "",
      category: "Therapy Guide",
      duration: "",
      image_url: "",
      uri: "",
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      title: "",
      description: "",
      coach: "",
      category: "Therapy Guide",
      duration: "",
      image_url: "",
      uri: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: Video) => {
    setEditing(item);
    form.reset({
      title: item.title,
      description: item.description,
      coach: item.coach,
      category: (item.category as VideoForm["category"]) || "Therapy Guide",
      duration: item.duration,
      image_url: item.image_url,
      uri: item.uri,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: VideoForm) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "videos", editing.id), values);
        toast.add({ title: "Video updated", type: "success" });
      } else {
        await addDoc(collection(db, "videos"), values);
        toast.add({ title: "Video uploaded", type: "success" });
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to save video", type: "error" });
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
      await deleteDoc(doc(db, "videos", deleteTarget.id));
      toast.add({ title: "Video removed", type: "success" });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete video", type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo<ColumnDef<Video>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
          const video = row.original;
          const thumb = video.image_url ? gsToHttps(video.image_url) : "";
          return (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaying(video)}
                className="group relative size-10 shrink-0 overflow-hidden rounded-lg"
                aria-label={`Play ${video.title}`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center bg-muted">
                    <HugeiconsIcon icon={Tv01Icon} className="size-4" />
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                  <HugeiconsIcon icon={PlayCircleIcon} className="size-5 text-white" />
                </span>
              </button>
              <div className="min-w-0">
                <p className="truncate font-medium">{video.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {video.description}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "coach",
        header: "Coach",
        cell: ({ getValue }) => {
          const value = String(getValue() ?? "");
          return value || <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => {
          const value = String(getValue() ?? "");
          return value ? (
            <Badge variant="secondary">{value}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
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
        title="Video Library"
        description="Curate therapy guides, somatic exercises, and meditations"
        action={
          <Button onClick={openCreate}>
            <HugeiconsIcon icon={PlusSignIcon} />
            New Video
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
            <DialogTitle>{editing ? "Edit Video" : "Upload Video"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update video metadata and thumbnail."
                : "Add a new video to the library."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            id="video-form"
          >
            <DropZone
              label="Video File"
              accept="video/*"
              maxSizeMB={200}
              pathPrefix="her_voice_meta/videos"
              value={form.watch("uri")}
              onChange={(gsUrl) => form.setValue("uri", gsUrl)}
              extractDuration
              onDurationExtracted={(sec) => form.setValue("duration", String(sec))}
            />
            {form.formState.errors.uri && (
              <p className="text-xs text-destructive">
                {form.formState.errors.uri.message}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="video-title">Video Title</Label>
                <Input
                  id="video-title"
                  placeholder="e.g. Grounding Breathwork"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-coach">Coach</Label>
                <Input
                  id="video-coach"
                  placeholder="e.g. Coach Ama"
                  {...form.register("coach")}
                />
                {form.formState.errors.coach && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.coach.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-category">Category</Label>
              <NativeSelect
                id="video-category"
                className="w-full"
                {...form.register("category")}
              >
                {VIDEO_CATEGORIES.map((category) => (
                  <NativeSelectOption key={category} value={category}>
                    {category}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-description">Description</Label>
              <Textarea
                id="video-description"
                rows={3}
                placeholder="What will the viewer learn?"
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <DropZone
              label="Thumbnail"
              accept="image/*"
              pathPrefix="her_voice_meta/videos"
              value={form.watch("image_url")}
              onChange={(gsUrl) => form.setValue("image_url", gsUrl)}
            />
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="video-form" disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Update Video" : "Add to Library"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Video"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? Its video file will also be removed.`}
        onConfirm={handleDelete}
      />

      <MediaPlayerDialog
        open={!!playing}
        onOpenChange={(open) => {
          if (!open) setPlaying(null);
        }}
        title={playing?.title ?? ""}
        subtitle={playing?.description}
        mediaUrl={playing?.uri ?? ""}
        type="video"
      />
    </div>
  );
}
