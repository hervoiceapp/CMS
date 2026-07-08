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
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Trash2, Image, Loader2, Notebook } from "lucide-react";

// Strict type definition mapping to your exact production Firestore data shape
interface ArticleItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  content: string;
  author: string;
  createdAt: any;
  imageUrl: string;
  imageColor: string;
  likes: number;
  tags: string[];
}

export default function ArticlesManagement() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states matching text field inputs and your schema
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("educational");
  const [author, setAuthor] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Helper to convert Firebase Storage gs:// paths to public HTTP URLs for rendering in dashboard
  const formatImageUrl = (gsUrl: string) => {
    if (!gsUrl || !gsUrl.startsWith("gs://")) return "";

    const path = gsUrl.replace("gs://", "");
    const firstSlash = path.indexOf("/");
    const bucket = path.substring(0, firstSlash);
    const filePath = encodeURIComponent(path.substring(firstSlash + 1));

    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${filePath}?alt=media`;
  };

  // Sync live with your actual Firestore 'articles' collection
  useEffect(() => {
    const articlesQuery = query(collection(db, "articles"));

    const unsubscribe = onSnapshot(
      articlesQuery,
      (snapshot) => {
        const liveArticles: ArticleItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();

          liveArticles.push({
            id: doc.id,
            title: data.title || "Untitled Article",
            subtitle: data.subtitle || data.excerpt || "",
            category: data.category || "educational",
            content: data.content || data.body || "",
            author: data.author || "Unknown Author",
            createdAt: data.createdAt || null,
            imageUrl: data.imageUrl || "",
            imageColor: data.imageColor || "",
            likes: typeof data.likes === "number" ? data.likes : 0,
            tags: Array.isArray(data.tags) ? data.tags : [],
          });
        });
        setArticles(liveArticles);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore sync error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Handle local image file selection changes (previews graphic prior to cloud upload)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Publish a new document matching your strict production schema layout
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !body) {
      return alert(
        "Please fill out Title, Author, and Full Article Body fields.",
      );
    }

    try {
      setUploadingImage(true);
      let targetGsUrl =
        "gs://kolado-mis.firebasestorage.app/her_voice_meta/article_sign.png"; // Default baseline asset url

      // If a custom image was requested, push it to Firebase Storage first
      if (selectedFile) {
        // Create an explicit storage reference path matching your dynamic uploads scheme
        const storageRef = ref(
          storage,
          `her_voice_meta/${Date.now()}_${selectedFile.name}`,
        );
        const uploadTask = await uploadBytesResumable(storageRef, selectedFile);

        // Reconstruct the matching 'gs://' path configuration required by your app schemas
        const bucketName = storageRef.bucket;
        const fullStoragePath = uploadTask.ref.fullPath;
        targetGsUrl = `gs://${bucketName}/${fullStoragePath}`;
      }

      const newArticlePayload = {
        title,
        subtitle: subtitle || body.slice(0, 100) + "...",
        category: category.toLowerCase(),
        content: body,
        author,
        createdAt: serverTimestamp(),
        imageUrl: targetGsUrl,
        imageColor: "",
        likes: 0,
        saved: "",
        tags: [""],
      };

      await addDoc(collection(db, "articles"), newArticlePayload);

      // Reset interface inputs and state anchors
      setTitle("");
      setAuthor("");
      setSubtitle("");
      setBody("");
      setSelectedFile(null);
      setImagePreview(null);
      setUploadingImage(false);
    } catch (err) {
      console.error("Failed writing article to database:", err);
      alert("Error publishing article.");
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      await deleteDoc(doc(db, "articles", id));
    } catch (err) {
      console.error("Failed removing database instance:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div className="text-xs font-medium text-slate-400">
          Syncing database articles catalog...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: Compose Support Article Card Container */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-[15px] mb-6">
          <Notebook className="w-5 h-5 text-blue-500" />
          <h3>Compose Support Article</h3>
        </div>

        <form onSubmit={handlePublish} className="space-y-5">
          {/* Row 1: Title, Category */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Article Title
              </label>
              <input
                type="text"
                placeholder="e.g. Recognizing Signs & Symptoms"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-700"
              >
                <option value="educational">Educational</option>
                <option value="mental health">Mental Health</option>
                <option value="postnatal guidance">Postnatal Guidance</option>
              </select>
            </div>
          </div>

          {/* Row 2: Author Name & Subtitle */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Author Name / Credential
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Amoa"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Subtitle
              </label>
              <input
                type="text"
                placeholder="Brief summary line shown on app card previews"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Row 3: Image Upload & Preview Interface Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Article Banner Graphic Image
            </label>
            <div className="flex items-center gap-4 p-4 border border-slate-200 border-dashed rounded-xl bg-slate-50/50">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-xs shrink-0"
              >
                <Image className="w-4 h-4 text-slate-400" />
                Select Graphic Cover
              </button>

              {imagePreview ? (
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Cover preview"
                    className="w-12 h-12 object-cover rounded-md border border-slate-200 shrink-0"
                  />
                  <span className="text-xs text-slate-500 truncate max-w-xs">
                    {selectedFile?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setImagePreview(null);
                    }}
                    className="text-xs text-rose-500 hover:underline font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  No media chosen. Default system graphic cover placeholder will
                  auto-apply.
                </span>
              )}
            </div>
          </div>

          {/* Row 4: Full Body Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Full Article Body
            </label>
            <textarea
              rows={6}
              placeholder="Draft detailed therapeutic insights for mothers here........"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300 resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={uploadingImage}
              className="flex items-center gap-2 bg-[#0070E0] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition shadow-sm"
            >
              {uploadingImage && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadingImage ? "Uploading & Saving..." : "Save & Publish"}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Active Articles Catalog Feed */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-800">
          Active Articles Catalog ({articles.length})
        </h3>

        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-4 items-center justify-between group transition hover:border-slate-200"
            >
              <div className="flex gap-4 items-center w-full overflow-hidden">
                <div className="w-16 h-16 rounded-lg bg-slate-50 shrink-0 border border-slate-100 overflow-hidden relative flex items-center justify-center">
                  {article.imageUrl ? (
                    <img
                      src={formatImageUrl(article.imageUrl)}
                      alt="Article cover"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextURIPathElement;
                        if (fallback)
                          (fallback as HTMLElement).style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    style={{ display: article.imageUrl ? "none" : "flex" }}
                    className="absolute inset-0 items-center justify-center bg-blue-50 text-[#0070E0] text-[9px] font-bold"
                  >
                    DOC
                  </div>
                </div>

                <div className="space-y-1 w-full overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {article.category}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      ❤️ {article.likes} Likes
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-base leading-tight line-clamp-1">
                    {article.title}
                  </h4>

                  <p className="text-slate-500 text-xs line-clamp-1">
                    {article.subtitle || article.content}
                  </p>

                  <div className="text-[10px] font-medium text-slate-400">
                    Written by:{" "}
                    <span className="text-slate-500 font-semibold">
                      {article.author}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between items-end h-16 shrink-0">
                <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
                  Published
                </span>

                <button
                  onClick={() => handleDelete(article.id)}
                  className="text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                  title="Delete Article"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {articles.length === 0 && (
            <div className="text-center p-8 border border-dashed border-slate-200 text-slate-400 text-sm rounded-xl bg-slate-50/50">
              No matching records found in your database configuration.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
