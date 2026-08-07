"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection } from "@/hooks/use-collection";
import { doctorSchema, type DoctorForm } from "@/lib/schemas";
import { DOCTOR_TITLES, DOCTOR_COLORS } from "@/lib/constants";
import type { Doctor } from "@/lib/types";
import { gsToHttps, deleteFile } from "@/lib/media";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DropZone } from "@/components/DropZone";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PlusSignIcon } from "@hugeicons/core-free-icons";

export default function DoctorsPage() {
  const { data, loading, error } = useCollection<Doctor>("doctors");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<DoctorForm>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: "",
      title: "Psychiatric Nurse",
      image: "",
      color: "yellow",
      rating: undefined,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      title: "Psychiatric Nurse",
      image: "",
      color: "yellow",
      rating: undefined,
    });
    setModalOpen(true);
  };

  const openEdit = (item: Doctor) => {
    setEditing(item);
    form.reset({
      name: item.name,
      title: item.title as DoctorForm["title"],
      image: item.image ?? "",
      color: item.color ?? "yellow",
      rating: item.rating ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: DoctorForm) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "doctors", editing.id), values);
        toast.add({ title: "Doctor updated", type: "success" });
      } else {
        await addDoc(collection(db, "doctors"), values);
        toast.add({ title: "Doctor registered", type: "success" });
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to save doctor", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.image) {
        await deleteFile(deleteTarget.image).catch(() => { });
      }
      await deleteDoc(doc(db, "doctors", deleteTarget.id));
      toast.add({ title: "Doctor removed", type: "success" });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete doctor", type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo<ColumnDef<Doctor>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Provider",
        cell: ({ row }) => {
          const doctor = row.original;
          const src = doctor.image ? gsToHttps(doctor.image) : "";
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                {src ? <AvatarImage src={src} alt={doctor.name} /> : null}
                <AvatarFallback
                  style={{ backgroundColor: doctor.color || "#FECACA" }}
                >
                  {(doctor.name || "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{doctor.name || "Unnamed Provider"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: "Specialty",
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
        accessorKey: "rating",
        header: "Rating",
        cell: ({ getValue }) => {
          const rating = getValue();
          return typeof rating === "number" ? (
            <span className="font-medium">{rating.toFixed(1)} ★</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Physicians Registry"
        description="Register and manage verified clinical providers"
        action={
          <Button onClick={openCreate}>
            <HugeiconsIcon icon={PlusSignIcon} />
            Add Doctor
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
            <DialogTitle>{editing ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the provider's profile details."
                : "Register a new clinical provider to the directory."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            id="doctor-form"
          >
            <DropZone
              label="Profile Image"
              accept="image/*"
              pathPrefix="her_voice_meta/doctors"
              value={form.watch("image")}
              onChange={(gsUrl) => form.setValue("image", gsUrl)}
            />

            <div className="space-y-2">
              <Label htmlFor="name">Full Name & Credential</Label>
              <Input
                id="name"
                placeholder="e.g. Dr. Evelyn Harris, MD"
                {...form.register("name")}
                aria-invalid={!!form.formState.errors.name}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Clinical Specialty Title</Label>
              <NativeSelect
                id="title"
                className="w-full"
                {...form.register("title")}
              >
                {DOCTOR_TITLES.map((title) => (
                  <NativeSelectOption key={title} value={title}>
                    {title}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Rating (0–5)</Label>
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="e.g. 4.8"
                {...form.register("rating", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                aria-invalid={!!form.formState.errors.rating}
              />
              {form.formState.errors.rating && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.rating.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Avatar Color</Label>
              <div className="flex flex-wrap items-center gap-2">
                {[...DOCTOR_COLORS, ...(form.watch("color") && !DOCTOR_COLORS.includes(form.watch("color") as never)
                  ? [form.watch("color") as string]
                  : [])].map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Color ${color}`}
                      onClick={() => form.setValue("color", color)}
                      className={cn(
                        "size-7 rounded-full ring-2 ring-offset-2 transition-all",
                        form.watch("color") === color
                          ? "ring-foreground"
                          : "ring-transparent hover:ring-border",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="doctor-form" disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Update Doctor" : "Add to Registry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Deregister Provider"
        description={`Are you sure you want to remove ${deleteTarget?.name} from the live registry? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
