"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

// Define strict data types matching your Firestore documents
interface AppointmentRequest {
  id: string;
  userName?: string;
  notes?: string;
  date?: string;
  time?: string;
}

interface FlaggedPost {
  id: string;
  text?: string;
  reason?: string;
}

export default function ActionQueues() {
  const [consultation, setConsultation] = useState<AppointmentRequest | null>(
    null,
  );
  const [flaggedPost, setFlaggedPost] = useState<FlaggedPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch the single most recent unconfirmed appointment request
    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("status", "==", "pending"), // Adjust value to match how you flag pending requests
      limit(1),
    );

    const unsubAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setConsultation({
          id: docSnap.id,
          userName: data.doctorName || "Anonymous Mother", // Replace with data.clientName if available
          notes: data.notes || "No custom consultation notes provided.",
          date: data.date || "",
          time: data.time || "",
        });
      } else {
        setConsultation(null);
      }
    });

    // 2. Fetch the single most recent flagged post from community feed
    const postsQuery = query(
      collection(db, "posts"),
      where("isFlagged", "==", true), // Assuming you have a boolean or status indicator for moderation
      limit(1),
    );

    const unsubPosts = onSnapshot(postsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setFlaggedPost({
          id: docSnap.id,
          text: data.text || data.content || "Content missing.",
          reason: data.flagReason || "Upsetting language or community report.",
        });
      } else {
        setFlaggedPost(null);
      }
      setLoading(false);
    });

    return () => {
      unsubAppointments();
      unsubPosts();
    };
  }, []);

  // --- ACTIONS ---

  const handleAcceptAppointment = async (id: string) => {
    try {
      const docRef = doc(db, "appointments", id);
      await updateDoc(docRef, { status: "confirmed" });
    } catch (err) {
      console.error("Error accepting appointment:", err);
    }
  };

  const handleDeclineAppointment = async (id: string) => {
    try {
      const docRef = doc(db, "appointments", id);
      await updateDoc(docRef, { status: "declined" });
    } catch (err) {
      console.error("Error declining appointment:", err);
    }
  };

  const handleDismissReport = async (id: string) => {
    try {
      const docRef = doc(db, "posts", id);
      await updateDoc(docRef, { isFlagged: false });
    } catch (err) {
      console.error("Error dismissing flag:", err);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  if (loading)
    return (
      <div className="text-sm text-slate-400">
        Updating live action queues...
      </div>
    );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
      {/* CARD ONE: Urgent Consultation Requests */}
      <div className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
            <span>✓</span> Urgent Consultation Requests
          </div>
          <button className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            View Scheduler ↗
          </button>
        </div>

        {consultation ? (
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-slate-800 text-sm">
                {consultation.userName}
              </h4>
              {(consultation.date || consultation.time) && (
                <span className="text-[11px] font-mono font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                  {consultation.date.split("T")[0]} @ {consultation.time}
                </span>
              )}
            </div>
            <p className="text-xs italic text-slate-600 leading-relaxed">
              "{consultation.notes}"
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleDeclineAppointment(consultation.id)}
                className="px-4 py-2 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={() => handleAcceptAppointment(consultation.id)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Accept & Assign Slot
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No pending consultation requests.
          </div>
        )}
      </div>

      {/* CARD TWO: Community Moderation Queue */}
      <div className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
            <span>✓</span> Community Moderation Queue
          </div>
          <button className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            Moderate Threads ↗
          </button>
        </div>

        {flaggedPost ? (
          <div className="bg-rose-50/30 p-4 rounded-xl border border-rose-100/50 space-y-4">
            <p className="text-xs text-rose-800 font-semibold">
              Reason:{" "}
              <span className="font-normal text-rose-600">
                {flaggedPost.reason}
              </span>
            </p>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
              <p className="text-xs italic text-slate-600 leading-relaxed">
                "{flaggedPost.text}"
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleDismissReport(flaggedPost.id)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Dismiss Report
              </button>
              <button
                onClick={() => handleDeletePost(flaggedPost.id)}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors shadow-sm"
              >
                Delete Post
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Community feed is clear. No active flags.
          </div>
        )}
      </div>
    </div>
  );
}
