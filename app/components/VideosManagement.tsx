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
  Film,
  Upload,
  FileVideo,
  X,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

// Strict type definition mapping to your production collection schema
interface VideoItem {
  id: string; // Firebase alphanumeric document identifier
  title: string;
  description: string;
  coach: string;
  category: string;
  duration: string;
  image_url: string;
  uri: string;
  createdAt: any;
}

export default function VideosManagement() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);

  // Form states matching structural input parameters
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coach, setCoach] = useState("");
  const [category, setCategory] = useState("Therapy Guide");
  const [duration, setDuration] = useState(""); // Automatically evaluated from raw metadata parameters

  // Raw media configuration streams anchors
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Converts total seconds into an elegant structural MM:SS indicator string
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

  // 1. Sync live with your actual Firestore 'videos' collection safely
  useEffect(() => {
    const videosQuery = query(collection(db, "videos"));

    const unsubscribe = onSnapshot(
      videosQuery,
      (snapshot) => {
        const liveVideos: VideoItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          liveVideos.push({
            id: doc.id,
            title: data.title || "Untitled Lesson",
            description: data.description || "No summary available.",
            coach: data.coach || "Unknown Practitioner",
            category: data.category || "Therapy Guide",
            duration: data.duration || "00:00",
            image_url: data.image_url || "",
            uri: data.uri || "",
            createdAt: data.createdAt || null,
          });
        });
        setVideos(liveVideos);
        setLoading(false);
      },
      (error) => {
        console.error("Videos snapshot streaming failed:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Grabs total length context directly from the localized file buffer array instance pools
  const extractVideoDuration = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const videoElement = document.createElement("video");
    videoElement.src = objectUrl;

    videoElement.onloadedmetadata = () => {
      const calculatedDuration = formatSecondsToMMSS(videoElement.duration);
      setDuration(calculatedDuration);
      URL.revokeObjectURL(objectUrl);
    };
  };

  // Video File Attachment Dropzone Handlers
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      extractVideoDuration(file);
    }
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        setVideoFile(file);
        extractVideoDuration(file);
      } else {
        alert("Please drop a valid video file.");
      }
    }
  };

  // Cover Thumbnail Graphic Selection Handlers
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedVideo = () => {
    setVideoFile(null);
    setDuration("");
    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
  };

  const removeSelectedThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailFileInputRef.current) thumbnailFileInputRef.current.value = "";
  };

  // 2. Submit assets to Storage bucket and payload records onto Firestore database collections
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !coach || !description) {
      return alert(
        "Please complete Title, Specialist Coach, and Description input sections.",
      );
    }
    if (!videoFile) {
      return alert(
        "Please load a core video broadcast file asset before deploying to active libraries.",
      );
    }

    try {
      setUploading(true);

      // A. Push the core video payload stream up to Storage
      const videoStorageRef = ref(
        storage,
        `videos/${Date.now()}_${videoFile.name}`,
      );
      const videoUploadTask = await uploadBytesResumable(
        videoStorageRef,
        videoFile,
      );
      const videoGsUrl = `gs://${videoStorageRef.bucket}/${videoUploadTask.ref.fullPath}`;

      // B. Upload cover image thumbnail graphic if explicitly attached
      let imageGsUrl = "";
      if (thumbnailFile) {
        const thumbStorageRef = ref(
          storage,
          `her_voice_meta/thumbnails/${Date.now()}_${thumbnailFile.name}`,
        );
        const thumbUploadTask = await uploadBytesResumable(
          thumbStorageRef,
          thumbnailFile,
        );
        imageGsUrl = `gs://${thumbStorageRef.bucket}/${thumbUploadTask.ref.fullPath}`;
      }

      // C. Compile full schema configurations
      const newVideoPayload = {
        title,
        description,
        coach,
        category,
        duration: duration || "05:00",
        image_url: imageGsUrl,
        uri: videoGsUrl,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "videos"), newVideoPayload);

      // Reset internal hooks and elements
      setTitle("");
      setDescription("");
      setCoach("");
      setCategory("Therapy Guide");
      removeSelectedVideo();
      removeSelectedThumbnail();
      setUploading(false);
    } catch (err) {
      console.error(
        "Database streaming creation deployment error event caught:",
        err,
      );
      alert("Error publishing custom multimedia workspace segment.");
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm("Are you sure you want to permanently erase this movie module?")
    )
      return;
    try {
      await deleteDoc(doc(db, "videos", id));
    } catch (err) {
      console.error(
        "Deletion target execution criteria block encountered script runtime error on key:",
        id,
        err,
      );
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div className="text-xs font-medium text-slate-400">
          Syncing active database video archives...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: Form Module box container layout */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-[15px] mb-6">
          <Film className="w-4 h-4 text-blue-500" />
          <h3>Register Video Playlists</h3>
        </div>

        <form onSubmit={handlePublish} className="space-y-5">
          {/* Row 1: Title & Auto-calculated Duration field */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Video Lesson Title
              </label>
              <input
                type="text"
                placeholder="e.g. 5-Min Grounding Somatic Flow"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Duration (Evaluated Automatically)
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

          {/* Row 2: Specialist Coach & Category select configurations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Specialist Coach / Tutor
              </label>
              <input
                type="text"
                placeholder="e.g. Maya Lin (Somatic Therapist)"
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-700"
              >
                <option>Therapy Guide</option>
                <option>Somatic Exercises</option>
                <option>Meditation</option>
              </select>
            </div>
          </div>

          {/* Row 3: Description fields context text areas */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Summary Context Description
            </label>
            <input
              type="text"
              placeholder="Provide a detailed roadmap descriptor summarizing clinical insights shown inside this sequence clip file"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
            />
          </div>

          {/* Row 4: Custom Video Thumbnail Graphic Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Custom Preview Cover Image Art
            </label>
            <div className="flex items-center gap-4 p-4 border border-slate-200 border-dashed rounded-xl bg-slate-50/50">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={thumbnailFileInputRef}
                onChange={handleThumbnailChange}
              />
              <button
                type="button"
                onClick={() => thumbnailFileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-xs shrink-0"
              >
                <ImageIcon className="w-4 h-4 text-slate-400" />
                Select Banner Image
              </button>

              {thumbnailPreview ? (
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={thumbnailPreview}
                    alt="Cover preview"
                    className="w-16 h-10 object-cover rounded border border-slate-200 shrink-0"
                  />
                  <span className="text-xs text-slate-500 truncate max-w-xs">
                    {thumbnailFile?.name}
                  </span>
                  <button
                    type="button"
                    onClick={removeSelectedThumbnail}
                    className="text-xs text-rose-500 hover:underline font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  Optional. A minimalist dark title card layout template
                  gradient applies if left vacant.
                </span>
              )}
            </div>
          </div>

          {/* Row 5: Core Native File Upload Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Upload Video Lesson File
            </label>
            <input
              type="file"
              ref={videoFileInputRef}
              onChange={handleVideoChange}
              accept="video/*"
              className="hidden"
            />

            {!videoFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingVideo(true);
                }}
                onDragLeave={() => setIsDraggingVideo(false)}
                onDrop={handleVideoDrop}
                onClick={() => videoFileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                  ${
                    isDraggingVideo
                      ? "border-blue-500 bg-blue-50/50 text-blue-600"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-500 hover:border-slate-300"
                  }`}
              >
                <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 mb-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Click to choose file or drag and drop video
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: MP4, MOV, WEBM (Max 200MB)
                </p>
              </div>
            ) : (
              <div className="w-full border border-emerald-100 bg-emerald-50/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 rounded-xl text-white">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1 max-w-md">
                      {videoFile.name}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB •
                      Duration detected successfully
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeSelectedVideo}
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
                ? "Transmitting Media Content Files..."
                : "Publish Video Lesson"}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Active catalog grid list items outputs view */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-800">
          Active Videos ({videos.length})
        </h3>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition hover:border-slate-200 group"
            >
              {/* Dynamic Image Cover Art Banner section matching item URI definitions */}
              <div className="w-full h-48 relative flex items-center justify-center text-white bg-slate-900 overflow-hidden select-none">
                {video.image_url ? (
                  <img
                    src={formatImageUrl(video.image_url)}
                    alt="Video thumbnail cover artwork"
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-indigo-900 opacity-80 flex items-center justify-center p-6 text-center">
                    <span className="text-xl font-black uppercase tracking-wider text-slate-200/50">
                      {video.category}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/10 p-4 text-center">
                  <button className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white flex items-center justify-center border border-white/30 shadow transition transform active:scale-95">
                    <Play className="w-5 h-5 fill-current ml-1" />
                  </button>
                </div>

                <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white font-mono text-[11px] px-2 py-0.5 rounded font-medium tracking-wide">
                  {video.duration}
                </span>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase tracking-wide">
                      {video.category}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      By {video.coach}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-base leading-tight line-clamp-1">
                    {video.title}
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                    {video.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[12px] font-medium text-slate-400">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <span className="text-xs">🔖</span>
                    <span>Live in App Instances</span>
                  </div>

                  <button
                    onClick={() => handleDelete(video.id)}
                    className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Delete Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {videos.length === 0 && (
            <div className="col-span-2 text-center p-8 border border-dashed border-slate-200 text-slate-400 text-sm rounded-xl bg-slate-50/50">
              No custom video resources loaded into active database records.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
