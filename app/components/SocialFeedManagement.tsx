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
  orderBy,
} from "firebase/firestore";
import {
  Trash2,
  ShieldAlert,
  CheckCircle,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface PostItem {
  id: string; // Firestore document ID
  text?: string;
  content?: string;
  isFlagged?: boolean;
  flagReason?: string;
  authorName?: string;
  createdAt?: any;
  likes?: number;
}

export default function SocialFeedManagement() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | "flagged">("all");

  // 1. Listen live to your actual 'posts' collection
  useEffect(() => {
    // Attempting to stream posts from your collection
    const postsQuery = query(collection(db, "posts"));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const livePosts: PostItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          livePosts.push({
            id: doc.id,
            ...data,
          });
        });
        setPosts(livePosts);
        setLoading(false);
      },
      (error) => {
        console.error("Error syncing social feed posts:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // --- ACTIONS ---

  // Removes a post completely from the database feed
  const handleDeletePost = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this post from the community feed?",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  // Clears flags if a post is manually reviewed and deemed safe
  const handleDismissFlag = async (id: string) => {
    try {
      const docRef = doc(db, "posts", id);
      await updateDoc(docRef, { isFlagged: false });
    } catch (err) {
      console.error("Failed to dismiss flag:", err);
    }
  };

  // Filter computation logic
  const filteredPosts = posts.filter((post) => {
    if (filter === "flagged") return post.isFlagged === true;
    return true;
  });

  const flaggedCount = posts.filter((p) => p.isFlagged).length;

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div className="text-xs font-medium text-slate-400">
          Syncing live community feeds...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters and Counters Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Threads ({posts.length})
          </button>
          <button
            onClick={() => setFilter("flagged")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              filter === "flagged"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-rose-600 hover:bg-rose-50"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Flagged Alerts ({flaggedCount})
          </button>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Reviewing live anonymous mother feedback rooms
        </p>
      </div>

      {/* Main Feed Content Stack */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const postText =
            post.text || post.content || "Empty content payload.";

          return (
            <div
              key={post.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition duration-200 flex flex-col justify-between relative overflow-hidden ${
                post.isFlagged
                  ? "border-rose-200 bg-rose-50/10"
                  : "border-slate-100"
              }`}
            >
              {/* Flag Warning Ribbon banner indicator */}
              {post.isFlagged && (
                <div className="mb-4 bg-rose-50 border border-rose-200/60 p-3 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Flagged for Moderation:</span>{" "}
                    <span className="italic text-rose-600">
                      "{post.flagReason || "Community Report"}"
                    </span>
                  </div>
                </div>
              )}

              {/* Main Content Info Layer */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-500">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">
                      {post.authorName || "Anonymous Mother"}
                    </h5>
                    <p className="text-[10px] text-slate-400 font-medium">
                      ID: {post.id} • {post.likes || 0} Likes
                    </p>
                  </div>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed bg-slate-50/30 p-3 border border-slate-100/50 rounded-xl italic">
                  "{postText}"
                </p>
              </div>

              {/* Control Mod Actions Panel */}
              <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-50">
                {post.isFlagged && (
                  <button
                    onClick={() => handleDismissFlag(post.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-xl text-xs font-semibold transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve / Dismiss Flag
                  </button>
                )}
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Thread
                </button>
              </div>
            </div>
          );
        })}

        {filteredPosts.length === 0 && (
          <div className="text-center p-12 border border-dashed border-slate-200 text-slate-400 text-sm rounded-2xl bg-slate-50/50">
            No matching social feed items currently active under this filter.
          </div>
        )}
      </div>
    </div>
  );
}
