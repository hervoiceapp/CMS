"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection } from "@/hooks/use-collection";
import { alertSchema, type AlertForm } from "@/lib/schemas";
import type { Notification } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Notification01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

export default function AlertsPage() {
  const { data, loading, error } = useCollection<Notification>("notifications");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AlertForm>({
    resolver: zodResolver(alertSchema),
    defaultValues: { title: "", body: "" },
  });

  const onSubmit = async (values: AlertForm) => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, "notifications"), {
        title: values.title,
        body: values.body,
        createdAt: serverTimestamp(),
      });
      toast.add({ title: "Alert broadcast", type: "success" });
      setModalOpen(false);
      form.reset();
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to send alert", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "notifications", deleteTarget.id));
      toast.add({ title: "Alert removed", type: "success" });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete alert", type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo<ColumnDef<Notification>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ getValue }) => (
          <span className="font-medium">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: "body",
        header: "Message",
        cell: ({ getValue }) => (
          <p className="line-clamp-1 max-w-md text-muted-foreground">
            {String(getValue())}
          </p>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Sent",
        cell: ({ getValue }) => formatDate(getValue()),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Push Alerts"
        description="Broadcast urgent health alerts and announcements"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <HugeiconsIcon icon={PlusSignIcon} />
            New Alert
          </Button>
        }
      />

      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={Notification01Icon} />
        </div>
        <div>
          <p className="text-sm font-medium">
            {data.length} alert{data.length === 1 ? "" : "s"} sent
          </p>
          <p className="text-xs text-muted-foreground">
            Notifications appear in-app for all mothers on their next launch.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        onDelete={(item) => setDeleteTarget(item)}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Broadcast Alert</DialogTitle>
            <DialogDescription>
              Send an urgent notice to every mother using the app.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            id="alert-form"
          >
            <div className="space-y-2">
              <Label htmlFor="alert-title">Alert Title</Label>
              <Input
                id="alert-title"
                placeholder="e.g. Clinic Closure Notice"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-body">Message</Label>
              <Textarea
                id="alert-body"
                rows={4}
                placeholder="Details of the alert..."
                {...form.register("body")}
              />
              {form.formState.errors.body && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.body.message}
                </p>
              )}
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="alert-form" disabled={submitting}>
              {submitting ? "Sending..." : "Broadcast Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Alert"
        description="Are you sure you want to remove this alert from the history?"
        onConfirm={handleDelete}
      />
    </div>
  );
}
