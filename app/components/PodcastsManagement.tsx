"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import {
  Play,
  Trash2,
  Upload,
  FileAudio,
  X,
  Loader2,
  Image as ImageIcon,
  Mic,
} from "lucide-react";

interface PodcastItem {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  duration: string;
  createdAt: any;
  imageColor: string;
  image_url: string;
  uri: string;
}

export default function PodcastsManagement() {
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);

  // Form states matching layout inputs and your actual fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [duration, setDuration] = useState(""); // Automatically evaluated
  const [author, setAuthor] = useState("");

  // Media Attachment Selection Hooks
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);

  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Converts seconds into an formatted MM:SS string structure
  const formatSecondsToMMSS = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper to convert Firebase Storage gs:// paths to public HTTP URLs
  const formatImageUrl = (gsUrl: string) => {
    if (!gsUrl || !gsUrl.startsWith("gs://")) return "";
    const path = gsUrl.replace("gs://", "");
    const firstSlash = path.indexOf("/");
    const bucket = path.substring(0, firstSlash);
    const filePath = encodeURIComponent(path.substring(firstSlash + 1));
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${filePath}?alt=media`;
  };

  // Sync live with your actual Firestore 'podcasts' collection
  useEffect(() => {
    const podcastsQuery = query(collection(db, "podcasts"));

    const unsubscribe = onSnapshot(
      podcastsQuery,
      (snapshot) => {
        const livePodcasts: PodcastItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          livePodcasts.push({
            id: doc.id,
            title: data.title || "Untitled Episode",
            subtitle: data.subtitle || "",
            author: data.author || "Unknown Speaker",
            duration: data.duration || "00:00",
            createdAt: data.createdAt || null,
            imageColor: data.imageColor || "#FECACA",
            image_url: data.image_url || "",
            uri: data.uri || "",
          });
        });
        setPodcasts(livePodcasts);
        setLoading(false);
      },
      (error) => {
        console.error("Podcasts snapshot sync failed:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Evaluates internal runtime meta info directly from the uploaded file
  const extractAudioDuration = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const audioContext = new Audio(objectUrl);

    audioContext.onloadedmetadata = () => {
      const calculatedDuration = formatSecondsToMMSS(audioContext.duration);
      setDuration(calculatedDuration);
      URL.revokeObjectURL(objectUrl); // Clear resource memory hook
    };
  };

  // Audio File Source Selection Handlers
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      extractAudioDuration(file);
    }
  };

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAudio(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("audio/")) {
        setAudioFile(file);
        extractAudioDuration(file);
      } else {
        alert("Please drop a valid audio file.");
      }
    }
  };

  // Image / Cover Art Selection Handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedAudio = () => {
    setAudioFile(null);
    setDuration("");
    if (audioFileInputRef.current) audioFileInputRef.current.value = "";
  };

  const removeSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  };

  // Upload asset streams to Storage buckets, then save Document records to Firestore
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !subtitle) {
      return alert("Please fill out Title, Subtitle, and Author fields.");
    }
    if (!audioFile) {
      return alert(
        "Please attach an audio broadcast stream asset prior to deployment.",
      );
    }

    try {
      setUploading(true);

      // A. Upload Audio File
      const audioStorageRef = ref(
        storage,
        `podcasts/${Date.now()}_${audioFile.name}`,
      );
      const audioUploadTask = await uploadBytesResumable(
        audioStorageRef,
        audioFile,
      );
      const audioGsUrl = `gs://${audioStorageRef.bucket}/${audioUploadTask.ref.fullPath}`;

      // B. Upload Cover Art Image if present (falls back to custom placeholder otherwise)
      let imageGsUrl =
        "gs://kolado-mis.firebasestorage.app/her_voice_meta/podcast_understand.png";
      if (imageFile) {
        const imageStorageRef = ref(
          storage,
          `her_voice_meta/${Date.now()}_${imageFile.name}`,
        );
        const imageUploadTask = await uploadBytesResumable(
          imageStorageRef,
          imageFile,
        );
        imageGsUrl = `gs://${imageStorageRef.bucket}/${imageUploadTask.ref.fullPath}`;
      }

      // C. Submit Payload Schema Data Configuration Map
      const newPodcastPayload = {
        author,
        createdAt: serverTimestamp(),
        duration: duration || "00:00",
        imageColor: "#FECACA",
        image_url: imageGsUrl,
        subtitle,
        title,
        uri: audioGsUrl,
      };

      await addDoc(collection(db, "podcasts"), newPodcastPayload);

      // Clear interface inputs and state targets
      setTitle("");
      setSubtitle("");
      setAuthor("");
      removeSelectedAudio();
      removeSelectedImage();
      setUploading(false);
    } catch (err) {
      console.error("Error publishing podcast broadcast item:", err);
      alert("Failed publishing broadcast files to cloud ecosystem.");
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this podcast document from the cloud?",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "podcasts", id));
    } catch (err) {
      console.error("Failed executing delete operations on id:", id, err);
    }
  };

  const formatBroadcastDate = (createdAtField: any) => {
    if (!createdAtField) return "Streaming Live";
    const dateObj = createdAtField.seconds
      ? new Date(createdAtField.seconds * 1000)
      : new Date(createdAtField);
    return dateObj.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div className="text-xs font-medium text-slate-400">
          Synchronizing audio feed streams...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: Upload Form Container */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-[15px] mb-6">
          <Mic className="w-5 h-5 text-blue-500" />
          <h3>Upload Daily Audio Guide</h3>
        </div>

        <form onSubmit={handlePublish} className="space-y-5">
          {/* Row 1: Title & Automated Duration Metric Output Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Audio Title
              </label>
              <input
                type="text"
                placeholder="e.g. Intro"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Duration (Evaluated from Audio)
              </label>
              <input
                type="text"
                placeholder="00:00"
                value={duration}
                readOnly
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-500 outline-none select-none font-mono font-medium"
              />
            </div>
          </div>

          {/* Row 2: Subtitle & Author */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Subtitle / Episode Label
              </label>
              <input
                type="text"
                placeholder="e.g. Episode 1: Understanding PND"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Author Name / Credential
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Charity"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Row 3: Cover Art Image Upload Box Space */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Episode Cover Art Illustration
            </label>
            <div className="flex items-center gap-4 p-4 border border-slate-200 border-dashed rounded-xl bg-slate-50/50">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={imageFileInputRef}
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => imageFileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-xs shrink-0"
              >
                <ImageIcon className="w-4 h-4 text-slate-400" />
                Upload Cover Art
              </button>

              {imagePreview ? (
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Cover art preview"
                    className="w-12 h-12 object-cover rounded-md border border-slate-200 shrink-0"
                  />
                  <span className="text-xs text-slate-500 truncate max-w-xs">
                    {imageFile?.name}
                  </span>
                  <button
                    type="button"
                    onClick={removeSelectedImage}
                    className="text-xs text-rose-500 hover:underline font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  No cover chosen. Default design will auto-apply.
                </span>
              )}
            </div>
          </div>

          {/* Row 4: Audio Drop Attachment Area Zone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Audio Broadcast File
            </label>
            <input
              type="file"
              ref={audioFileInputRef}
              onChange={handleAudioChange}
              accept="audio/*"
              className="hidden"
            />

            {!audioFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingAudio(true);
                }}
                onDragLeave={() => setIsDraggingAudio(false)}
                onDrop={handleAudioDrop}
                onClick={() => audioFileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                  ${
                    isDraggingAudio
                      ? "border-blue-500 bg-blue-50/50 text-blue-600"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-500 hover:border-slate-300"
                  }`}
              >
                <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 mb-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: MP3, WAV, M4A (Max 50MB)
                </p>
              </div>
            ) : (
              <div className="w-full border border-emerald-100 bg-emerald-50/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 rounded-xl text-white">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1 max-w-md">
                      {audioFile.name}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB •
                      Duration detected successfully
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeSelectedAudio}
                  disabled={uploading}
                  className="p-1.5 hover:bg-emerald-100 text-slate-400 hover:text-slate-600 rounded-lg transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 bg-[#0070E0] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition shadow-sm"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading
                ? "Transmitting Media Content..."
                : "Publish Audio Broadcast"}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Live Feed Feed */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-800">
          Live Audio Feed ({podcasts.length})
        </h3>

        <div className="space-y-3">
          {podcasts.map((podcast) => (
            <div
              key={podcast.id}
              className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center justify-between transition hover:border-slate-200"
            >
              <div className="flex items-center gap-4 overflow-hidden w-full mr-4">
                <div
                  className="w-12 h-12 rounded-lg text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-black/5 overflow-hidden"
                  style={{ backgroundColor: podcast.imageColor || "#FECACA" }}
                >
                  {podcast.image_url ? (
                    <img
                      src={formatImageUrl(podcast.image_url)}
                      alt="cover"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    "AUDIO"
                  )}
                </div>

                <div className="space-y-0.5 overflow-hidden w-full">
                  <h4 className="font-bold text-slate-800 text-[15px] leading-snug truncate">
                    {podcast.subtitle ? `${podcast.subtitle}: ` : ""}
                    {podcast.title}
                  </h4>
                  <div className="text-[11px] text-slate-400 font-medium truncate">
                    Presented by{" "}
                    <span className="text-slate-600 font-semibold">
                      {podcast.author}
                    </span>{" "}
                    • {podcast.duration}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md block leading-none mb-1 whitespace-nowrap">
                    Active Stream
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                    {formatBroadcastDate(podcast.createdAt)}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(podcast.id)}
                  className="text-slate-300 hover:text-rose-600 p-2 rounded-md hover:bg-rose-50 transition"
                  title="Delete Episode"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {podcasts.length === 0 && (
            <div className="text-center p-8 border border-dashed border-slate-200 text-slate-400 text-sm rounded-xl bg-slate-50/50">
              No matching podcast track entries detected in the live database.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
