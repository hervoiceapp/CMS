import type { Timestamp } from "firebase/firestore";

export type ContentStatus = "draft" | "published";

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  content: string;
  author: string;
  createdAt: Timestamp | Date | number | undefined;
  imageUrl: string;
  imageAlt?: string;
  imageColor: string;
  likes: number;
  saved: number;
  tags: string[];
  status?: ContentStatus;
  publishedAt?: Timestamp | Date | number;
}

export interface Podcast {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  duration: string;
  createdAt: Timestamp | Date | number | undefined;
  imageColor: string;
  image_url: string;
  imageAlt?: string;
  uri: string;
  status?: ContentStatus;
  publishedAt?: Timestamp | Date | number;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  coach: string;
  category: string;
  duration: string;
  image_url: string;
  imageAlt?: string;
  uri: string;
  createdAt: Timestamp | Date | number | undefined;
  status?: ContentStatus;
  publishedAt?: Timestamp | Date | number;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  image?: string;
  imageAlt?: string;
  color?: string;
  rating?: number;
  status?: ContentStatus;
  publishedAt?: Timestamp | Date | number;
}

/** True when a doc is visible to the app: published, or legacy docs without a status. */
export function isPublished(status: ContentStatus | undefined): boolean {
  return status !== "draft";
}

export interface Post {
  id: string;
  authorId?: string;
  authorName?: string;
  content?: string;
  imageUrl?: string;
  createdAt?: Timestamp | Date | number;
  comments?: number;
  likes?: number;
}

// The `posts` collection has accumulated several doc shapes over time
// (e.g. `comments`, `likes` vs `commentsCount`, `likesArray`). Normalize the
// raw Firestore doc into a single canonical shape before display.
export function normalizePost(raw: Record<string, unknown>): Post {
  const likes =
    typeof raw.likes === "number"
      ? raw.likes
      : Array.isArray(raw.likesArray)
        ? raw.likesArray.length
        : 0;
  const comments =
    typeof raw.comments === "number"
      ? raw.comments
      : typeof raw.commentsCount === "number"
        ? raw.commentsCount
        : 0;
  return {
    id: String(raw.id ?? ""),
    authorId: typeof raw.authorId === "string" ? raw.authorId : undefined,
    authorName: typeof raw.authorName === "string" ? raw.authorName : undefined,
    content:
      typeof raw.content === "string"
        ? raw.content
        : typeof raw.text === "string"
          ? raw.text
          : undefined,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    createdAt: raw.createdAt as Timestamp | Date | number | undefined,
    comments,
    likes,
  };
}

export type AppointmentStatus = "pending" | "confirmed" | "declined";

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  doctorTitle: string;
  doctorImage?: string;
  duration: string;
  notes: string;
  sessionType: string;
  status: AppointmentStatus;
  userId: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: Timestamp | Date | number | undefined;
}

export function isTimestampLike(
  value: unknown,
): value is { seconds: number } {
  return (
    !!value &&
    typeof value === "object" &&
    "seconds" in (value as { seconds: number })
  );
}

export function formatDate(createdAt: unknown): string {
  if (!createdAt) return "";
  const date =
    isTimestampLike(createdAt) || typeof createdAt === "number"
      ? new Date(
          isTimestampLike(createdAt) ? createdAt.seconds * 1000 : createdAt,
        )
      : createdAt instanceof Date
        ? createdAt
        : new Date(createdAt as string | number);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface AiCopilotConfig {
  model: string;
  systemInstruction: string;
  crisisDirective: string;
  temperature: number;
  maxOutputTokens: number;
  updatedAt?: Timestamp | Date | number;
  updatedBy?: string;
}

export interface AppConfig {
  minVersion: string;
  forceUpdateBelow: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt?: Timestamp | Date | number;
  updatedBy?: string;
}
