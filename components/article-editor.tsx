"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { articleSchema, type ArticleForm } from "@/lib/schemas";
import { ARTICLE_CATEGORIES, ARTICLE_COLORS } from "@/lib/constants";
import type { Article } from "@/lib/types";
import { RichTextEditor } from "@/components/RichTextEditor";
import { DropZone } from "@/components/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, SaveIcon, UploadSquare01Icon } from "@hugeicons/core-free-icons";

const DRAFT_KEY = "hervoice_article_draft";

export function ArticleEditor({ articleId }: { articleId?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Article | null>(null);
  const [loading, setLoading] = useState(!!articleId);
  const [saving, setSaving] = useState(false);

  const form = useForm<ArticleForm>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      category: "educational",
      author: "",
      content: "",
      imageUrl: "",
      imageAlt: "",
      imageColor: ARTICLE_COLORS[0],
      tags: [],
    },
  });

  useEffect(() => {
    if (!articleId) return;
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "articles", articleId));
        if (!mounted) return;
        if (snap.exists()) {
          const data = snap.data() as Article;
          setEditing(data);
          form.reset({
            title: data.title || "",
            subtitle: data.subtitle || "",
            category: (data.category as ArticleForm["category"]) || "educational",
            author: data.author || "",
            content: data.content || "",
            imageUrl: data.imageUrl || "",
            imageAlt: data.imageAlt || "",
            imageColor: data.imageColor || ARTICLE_COLORS[0],
            tags: Array.isArray(data.tags) ? data.tags : [],
          });
        } else {
          toast.add({ title: "Article not found", type: "error" });
          router.replace("/articles");
        }
      } catch (err) {
        console.error(err);
        toast.add({ title: "Failed to load article", type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [articleId, router, form]);

  useEffect(() => {
    if (articleId) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        form.reset({ ...form.getValues(), ...parsed });
      } catch {
        // ignore corrupt draft
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoSave = useCallback(() => {
    if (articleId) return;
    const data = form.getValues();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        title: data.title,
        content: data.content,
        category: data.category,
        author: data.author,
        subtitle: data.subtitle,
        imageAlt: data.imageAlt,
      }),
    );
  }, [articleId, form]);

  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  const save = async (publish: boolean) => {
    const valid = await form.trigger();
    if (!valid) {
      toast.add({ title: "Please fill in the required fields", type: "error" });
      return;
    }
    const values = form.getValues();
    const payload = {
      title: values.title,
      subtitle: values.subtitle || values.content.slice(0, 100) + "...",
      category: values.category,
      content: values.content,
      author: values.author,
      imageUrl: values.imageUrl,
      imageAlt: values.imageAlt || "",
      imageColor: values.imageColor || ARTICLE_COLORS[0],
      likes: editing?.likes ?? 0,
      saved: editing?.saved ?? 0,
      tags: values.tags ?? [],
      status: publish ? "published" : "draft",
    };

    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "articles", editing.id), {
          ...payload,
          createdAt: editing.createdAt,
          publishedAt: publish
            ? (editing.publishedAt ?? new Date())
            : (editing.publishedAt ?? null),
        });
        toast.add({ title: publish ? "Article published" : "Draft saved", type: "success" });
      } else {
        await addDoc(collection(db, "articles"), {
          ...payload,
          createdAt: serverTimestamp(),
          publishedAt: publish ? serverTimestamp() : null,
        });
        localStorage.removeItem(DRAFT_KEY);
        toast.add({ title: publish ? "Article published" : "Draft saved", type: "success" });
      }
      router.push("/articles");
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to save article", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    router.push("/articles");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {editing ? "Edit Article" : "New Article"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editing
              ? "Update the article and republish."
              : "Drafts are auto-saved every 30 seconds."}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/articles")}>
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          Back
        </Button>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <DropZone
          label="Cover Image"
          accept="image/*"
          pathPrefix="her_voice_meta"
          value={form.watch("imageUrl")}
          onChange={(gsUrl) => form.setValue("imageUrl", gsUrl)}
        />

        <div className="space-y-2">
          <Label htmlFor="article-image-alt">Cover Image Alt Text</Label>
          <Input
            id="article-image-alt"
            placeholder="Describe the cover image for screen readers"
            {...form.register("imageAlt")}
          />
          <p className="text-xs text-muted-foreground">
            Accessible description read aloud to screen-reader users.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Cover Fallback Color</Label>
          <div className="flex flex-wrap items-center gap-2">
            {ARTICLE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Fallback color ${color}`}
                onClick={() => form.setValue("imageColor", color)}
                className={cn(
                  "size-7 rounded-full ring-2 ring-offset-2 transition-all",
                  form.watch("imageColor") === color
                    ? "ring-foreground"
                    : "ring-transparent hover:ring-border",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Used behind the cover image in the app when no image is uploaded.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="article-tags">Tags (comma-separated)</Label>
          <Input
            id="article-tags"
            placeholder="e.g. Postnatal, Self-care"
            defaultValue={(form.getValues("tags") ?? []).join(", ")}
            onChange={(e) => {
              const tags = e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              form.setValue("tags", tags);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Optional labels shown on the article card in the app.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="article-title">Article Title</Label>
          <Input
            id="article-title"
            placeholder="e.g. Recognizing Signs & Symptoms"
            className="text-base"
            {...form.register("title")}
            aria-invalid={!!form.formState.errors.title}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="article-author">Author Name / Credential</Label>
            <Input
              id="article-author"
              placeholder="e.g. Dr. Amoa"
              {...form.register("author")}
              aria-invalid={!!form.formState.errors.author}
            />
            {form.formState.errors.author && (
              <p className="text-xs text-destructive">{form.formState.errors.author.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-category">Category</Label>
            <NativeSelect id="article-category" className="w-full" {...form.register("category")}>
              {ARTICLE_CATEGORIES.map((category) => (
                <NativeSelectOption key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="article-subtitle">Subtitle</Label>
          <Input
            id="article-subtitle"
            placeholder="Brief summary line shown on app card previews"
            {...form.register("subtitle")}
          />
        </div>

        <div className="space-y-2">
          <Label>Full Article Body</Label>
          <RichTextEditor
            content={form.watch("content") ?? ""}
            onChange={(html) => form.setValue("content", html)}
          />
          {form.formState.errors.content && (
            <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
          )}
        </div>

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
          {!editing && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={discardDraft}
            >
              Discard Draft
            </Button>
          )}
          <div className="flex gap-3">
            <Button variant="outline" disabled={saving} onClick={() => save(false)}>
              <HugeiconsIcon icon={SaveIcon} />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button disabled={saving} onClick={() => save(true)}>
              <HugeiconsIcon icon={UploadSquare01Icon} />
              {saving ? "Publishing..." : editing ? "Publish Changes" : "Publish"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
