"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  Calendar,
  Trash2,
  Check,
  X,
  Clock,
  User,
  FileText,
  Loader2,
} from "lucide-react";

interface AppointmentItem {
  id: string; // Firestore document ID
  date: string;
  time: string;
  doctorName: string;
  doctorTitle: string;
  doctorImage?: string;
  duration: string;
  notes: string;
  sessionType: string;
  status: "pending" | "confirmed" | "declined" | string;
  userId: string;
}

export default function AppointmentBookManagement() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 1. Sync live with your actual Firestore 'appointments' collection
  useEffect(() => {
    const q = query(collection(db, "appointments"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveAppointments: AppointmentItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          liveAppointments.push({
            id: doc.id,
            date: data.date || "",
            time: data.time || "",
            doctorName: data.doctorName || "Unassigned Provider",
            doctorTitle: data.doctorTitle || "Specialist",
            doctorImage: data.doctorImage || "",
            duration: data.duration || "1 hour",
            notes: data.notes || "No extra session notes provided.",
            sessionType: data.sessionType || "Physical",
            status: data.status || "pending",
            userId: data.userId || "",
          });
        });
        setAppointments(liveAppointments);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore appointments sync error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // --- ACTIONS ---

  const handleUpdateStatus = async (
    id: string,
    newStatus: "confirmed" | "declined",
  ) => {
    try {
      const docRef = doc(db, "appointments", id);
      await updateDoc(docRef, { status: newStatus });
    } catch (err) {
      console.error("Failed to update appointment status:", err);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Permanently erase this consultation log from the database?"))
      return;
    try {
      await deleteDoc(doc(db, "appointments", id));
    } catch (err) {
      console.error("Failed to delete appointment document:", err);
    }
  };

  // Helper formatting for string dates
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "TBD";
    if (dateStr.includes("T")) return dateStr.split("T")[0];
    return dateStr;
  };

  // Filters computed on local state array array loops
  const filteredAppointments = appointments.filter((app) => {
    if (statusFilter === "all") return true;
    return app.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div className="text-xs font-medium text-slate-400">
          Syncing reservation sheets...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filtering Navigation Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex flex-wrap gap-2">
          {["all", "pending", "confirmed", "declined"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition ${
                statusFilter === filter
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter} (
              {filter === "all"
                ? appointments.length
                : appointments.filter((a) => a.status === filter).length}
              )
            </button>
          ))}
        </div>
        <span className="text-xs font-medium text-slate-400">
          Live Clinical Operations Schedule
        </span>
      </div>

      {/* Grid List View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAppointments.map((app) => (
          <div
            key={app.id}
            className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition hover:border-slate-200 relative overflow-hidden ${
              app.status === "confirmed"
                ? "border-emerald-100"
                : app.status === "declined"
                  ? "border-rose-100"
                  : "border-slate-100"
            }`}
          >
            {/* Main Content Info Block */}
            <div className="space-y-4">
              {/* Header: Date, Time & Mode */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded text-slate-800">
                    {formatDisplayDate(app.date)}
                  </span>
                  <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
                  <span className="text-xs font-medium text-slate-500">
                    {app.time} ({app.duration})
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                    app.status === "confirmed"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : app.status === "declined"
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                  }`}
                >
                  {app.status}
                </span>
              </div>

              {/* Provider Row Assignment Info */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-slate-800 text-sm truncate leading-tight">
                    {app.doctorName}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-400 truncate">
                    {app.doctorTitle} • {app.sessionType} Session
                  </p>
                </div>
              </div>

              {/* Patient Intake Note text block */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50 text-slate-600 text-xs flex gap-2 items-start leading-relaxed">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <p className="italic">"{app.notes}"</p>
              </div>
            </div>

            {/* Bottom Actions Mod Panel */}
            <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-50">
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[160px]">
                UID: {app.userId || "guest-profile"}
              </span>

              <div className="flex items-center gap-1.5">
                {app.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(app.id, "declined")}
                      className="p-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Decline Appointment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(app.id, "confirmed")}
                      className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition shadow-xs"
                      title="Confirm Appointment"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleDeleteAppointment(app.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition ml-1"
                  title="Erase Log Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAppointments.length === 0 && (
        <div className="text-center p-12 border border-dashed border-slate-200 text-slate-400 text-sm rounded-2xl bg-slate-50/50">
          No matches found inside this calendar register configuration view.
        </div>
      )}
    </div>
  );
}
