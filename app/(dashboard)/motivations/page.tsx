"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection } from "@/hooks/use-collection";
import { motivationSchema, type MotivationForm } from "@/lib/schemas";
import type { DailyMotivation } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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
import { SunriseIcon, PlusSignIcon } from "@hugeicons/core-free-icons";

const DEFAULT_DATE = new Date().toISOString().slice(0, 10);

export default function MotivationsPage() {
  const { data: motivations, loading, error } = useCollection<DailyMotivation>(
    "daily_motivations",
  );
  const { data: podcasts } = useCollection<
    { id: string; title: string } & Record<string, unknown>
  >("podcasts");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DailyMotivation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyMotivation | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<MotivationForm>({
    resolver: zodResolver(motivationSchema),
    defaultValues: { text: "", date: DEFAULT_DATE, trackId: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ text: "", date: DEFAULT_DATE, trackId: "" });
    setModalOpen(true);
  };

  const openEdit = (item: DailyMotivation) => {
    setEditing(item);
    form.reset({
      text: item.text,
      date: item.date || "",
      trackId: item.trackId || "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: MotivationForm) => {
    setSubmitting(true);
    try {
      const payload = {
        text: values.text,
        date: values.date || null,
        trackId: values.trackId || null,
      };
      if (editing) {
        await updateDoc(doc(db, "daily_motivations", editing.id), payload);
        toast.add({ title: "Motivation updated", type: "success" });
      } else {
        await addDoc(collection(db, "daily_motivations"), {
          ...payload,
          createdAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
          status: "published",
        });
        toast.add({ title: "Motivation published", type: "success" });
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to save motivation", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "daily_motivations", deleteTarget.id));
      toast.add({ title: "Motivation removed", type: "success" });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete motivation", type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo<ColumnDef<DailyMotivation>[]>(
    () => [
      {
        id: "text",
        header: "Message",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-lg text-sm">
            {row.original.text || (
              <span className="text-muted-foreground">No message</span>
            )}
          </p>
        ),
      },
      {
        accessorKey: "date",
        header: "Target Day",
        cell: ({ getValue }) => {
          const date = String(getValue() ?? "");
          return date ? (
            <Badge variant="secondary">{date}</Badge>
          ) : (
            <span className="text-muted-foreground">Default</span>
          );
        },
      },
      {
        accessorKey: "trackId",
        header: "Linked Track",
        cell: ({ getValue }) => {
          const id = String(getValue() ?? "");
          if (!id) return <span className="text-muted-foreground">—</span>;
          const track = podcasts.find((p) => p.id === id);
          return track?.title || id;
        },
      },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: ({ getValue }) =>
          (() => {
            if (!getValue()) return "";
            const v = getValue() as
              | { seconds: number }
              | Date
              | number
              | string;
            const ms =
              typeof v === "object" && "seconds" in v ? v.seconds * 1000 : v;
            return new Date(ms as number).toLocaleDateString();
          })(),
      },
    ],
    [podcasts],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Motivations"
        description="Schedule short support messages that appear on the app home screen"
        action={
          <Button onClick={openCreate}>
            <HugeiconsIcon icon={PlusSignIcon} />
            New Motivation
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{motivations.length} total messages</Badge>
      </div>

      <DataTable
        columns={columns}
        data={motivations}
        loading={loading}
        error={error}
        searchable
        onEdit={openEdit}
        onDelete={(item) => setDeleteTarget(item)}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Motivation" : "New Motivation"}
            </DialogTitle>
            <DialogDescription>
              The app picks today&#39;s message, then the most recent default
              one.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            id="motivation-form"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={SunriseIcon} className="size-4 text-muted-foreground" />
                <Label htmlFor="motivation-text">Message</Label>
              </div>
              <Textarea
                id="motivation-text"
                rows={3}
                placeholder="e.g. You are doing amazing. Take today one breath at a time."
                {...form.register("text")}
              />
              {form.formState.errors.text && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.text.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation-date">Target Day (optional)</Label>
              <Input
                id="motivation-date"
                type="date"
                {...form.register("date")}
              />
              {form.formState.errors.date && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.date.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave blank to show this message on any day that has no dated
                one.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation-track">Linked audio track</Label>
              <NativeSelect
                id="motivation-track"
                className="w-full"
                value={form.watch("trackId") || ""}
                onChange={(e) => form.setValue("trackId", e.target.value)}
              >
                <NativeSelectOption value="">
                  No track (falls back to the latest podcast)
                </NativeSelectOption>
                {podcasts.map((pod) => (
                  <NativeSelectOption key={pod.id} value={pod.id}>
                    {pod.title}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="motivation-form" disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Update" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Motivation"
        description="Are you sure you want to remove this daily motivation message?"
        onConfirm={handleDelete}
      />
    </div>
  );
}