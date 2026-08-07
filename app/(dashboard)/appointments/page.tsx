"use client";

import { useMemo } from "react";
import { doc, updateDoc } from "firebase/firestore";
import type { ColumnDef } from "@tanstack/react-table";

import { db } from "@/lib/firebase";
import { useCollection } from "@/hooks/use-collection";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { CalendarCheckIcon } from "@hugeicons/core-free-icons";

const statusBadge: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600" },
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600" },
  declined: { label: "Declined", className: "bg-destructive/10 text-destructive" },
};

export default function AppointmentsPage() {
  const { data, loading, error } = useCollection<Appointment>("appointments");

  const setStatus = async (appointment: Appointment, status: AppointmentStatus) => {
    try {
      await updateDoc(doc(db, "appointments", appointment.id), { status });
      toast.add({
        title: `Appointment ${status === "pending" ? "marked pending" : status}`,
        type: "success",
      });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to update status", type: "error" });
    }
  };

  const columns = useMemo<ColumnDef<Appointment>[]>(
    () => [
      {
        accessorKey: "doctorName",
        header: "Provider",
        cell: ({ row }) => {
          const appt = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback>
                  <HugeiconsIcon icon={CalendarCheckIcon} className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{appt.doctorName}</p>
                <p className="text-xs text-muted-foreground">{appt.doctorTitle}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: "time",
        header: "Time",
      },
      {
        accessorKey: "duration",
        header: "Duration",
        cell: ({ getValue }) => String(getValue() ?? "—"),
      },
      {
        accessorKey: "sessionType",
        header: "Type",
        cell: ({ getValue }) => (
          <Badge variant="secondary">{String(getValue() ?? "—")}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const appt = row.original;
          const badge = statusBadge[appt.status] ?? statusBadge.pending;
          return (
            <select
              value={appt.status}
              onChange={(e) => setStatus(appt, e.target.value as AppointmentStatus)}
              className="rounded-lg border bg-background px-2 py-1 text-xs font-medium"
              aria-label={`Status for ${appt.doctorName}`}
            >
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusBadge[status].label}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ getValue }) => {
          const notes = String(getValue() ?? "");
          return notes ? (
            <p className="line-clamp-1 max-w-xs text-sm text-muted-foreground">
              {notes}
            </p>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
    ],
    [],
  );

  const counts = {
    pending: data.filter((a) => a.status === "pending").length,
    confirmed: data.filter((a) => a.status === "confirmed").length,
    declined: data.filter((a) => a.status === "declined").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation Requests"
        description="Review and confirm appointment bookings"
      />

      <div className="grid grid-cols-3 gap-4">
        {(["pending", "confirmed", "declined"] as AppointmentStatus[]).map((s) => (
          <div
            key={s}
            className="rounded-2xl border bg-card p-4 flex flex-col gap-1"
          >
            <Badge className={`w-fit ${statusBadge[s].className}`}>
              {statusBadge[s].label}
            </Badge>
            <span className="mt-1 text-2xl font-bold">{counts[s]}</span>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        searchable
        pageSize={15}
      />
    </div>
  );
}
