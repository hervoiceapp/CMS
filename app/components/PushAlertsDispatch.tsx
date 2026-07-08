"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { Bell, Send, Trash2, Loader2, Clock, CheckCircle } from "lucide-react";

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  createdAt: any;
}

export default function PushAlertsDispatch() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);

  // Form states matching text inputs
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // 1. Sync live with your Firebase 'notifications' collection logs history
  useEffect(() => {
    const q = query(collection(db, "notifications"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveLogs: NotificationLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          liveLogs.push({
            id: doc.id,
            title: data.title || "Untitled Notification",
            body: data.body || "",
            createdAt: data.createdAt || null,
          });
        });

        // Sort programmatically by date descending to keep newest entries up top
        liveLogs.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setLogs(liveLogs);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore notifications log sync error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // 2. Write payload record into Cloud Firestore to trigger a push notification
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      return alert(
        "Please fill out both the Notification Title and Message Body.",
      );
    }

    try {
      setSending(true);

      const newNotificationPayload = {
        title,
        body,
        createdAt: serverTimestamp(), // Firestore server timestamp
      };

      await addDoc(collection(db, "notifications"), newNotificationPayload);

      // Reset form fields upon successful save
      setTitle("");
      setBody("");
      setSending(false);
      alert("Notification dispatched successfully!");
    } catch (err) {
      console.error("Failed to dispatch alert:", err);
      alert("Error logging dispatch entry.");
      setSending(false);
    }
  };

  // 3. Clear older history entries from logs tracking lists
  const handleDeleteLog = async (id: string) => {
    if (!confirm("Remove this alert entry from history archives?")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error("Failed to delete notification record:", err);
    }
  };

  const formatLogDate = (createdAtField: any) => {
    if (!createdAtField) return "Just Now";
    const dateObj = createdAtField.seconds
      ? new Date(createdAtField.seconds * 1000)
      : new Date(createdAtField);
    return dateObj.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div className="text-xs font-medium text-slate-400">
          Syncing alert dispatch records...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: Notification Dispatch Form Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-[15px] mb-6">
          <Bell className="w-5 h-5 text-blue-500" />
          <h3>Broadcast New Push Alert</h3>
        </div>

        <form onSubmit={handleDispatch} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Notification Title
            </label>
            <input
              type="text"
              placeholder="e.g. Daily Meditation Check-in"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Message Body Context
            </label>
            <textarea
              rows={4}
              placeholder="Type your message text here (keep it under 150 characters for optimal lockscreen rendering)..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300 resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 bg-[#0070E0] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition shadow-sm"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Transmitting Signal..." : "Publish & Dispatch"}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Historical Notification Broadcast Logs */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-800">
          Dispatched Alerts History ({logs.length})
        </h3>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-start justify-between transition hover:border-slate-200 group"
            >
              <div className="flex gap-3.5 items-start overflow-hidden w-full mr-4">
                <div className="p-2.5 bg-blue-50 border border-blue-100/50 rounded-xl text-blue-600 shrink-0">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                </div>

                <div className="space-y-1 overflow-hidden w-full">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {log.title}
                    </h4>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 italic">
                    "{log.body}"
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pt-1">
                    <Clock className="w-3 h-3" />
                    <span>Sent: {formatLogDate(log.createdAt)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteLog(log.id)}
                className="text-slate-300 hover:text-rose-600 p-2 rounded-md hover:bg-rose-50 transition shrink-0"
                title="Remove Log Entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center p-8 border border-dashed border-slate-200 text-slate-400 text-sm rounded-xl bg-slate-50/50">
              No historical broadcast alert logs located inside this database
              collection.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
