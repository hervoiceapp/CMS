import { z } from "zod";
import {
  ARTICLE_CATEGORIES,
  DOCTOR_TITLES,
  VIDEO_CATEGORIES,
  AI_MODELS,
} from "./constants";

export const CONTENT_STATUSES = ["draft", "published"] as const;
export type ContentStatusValue = (typeof CONTENT_STATUSES)[number];

export const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  category: z.enum(ARTICLE_CATEGORIES),
  author: z.string().min(1, "Author is required"),
  content: z.string().min(1, "Article body is required"),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  imageColor: z.string().optional(),
});

export type ArticleForm = z.infer<typeof articleSchema>;

export const podcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  author: z.string().min(1, "Author is required"),
  duration: z.string().optional(),
  image_url: z.string().optional(),
  imageAlt: z.string().optional(),
  uri: z.string().min(1, "Audio file is required"),
  imageColor: z.string(),
});

export type PodcastForm = z.infer<typeof podcastSchema>;

export const videoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  coach: z.string().min(1, "Coach is required"),
  category: z.enum(VIDEO_CATEGORIES),
  duration: z.string().optional(),
  image_url: z.string().optional(),
  imageAlt: z.string().optional(),
  uri: z.string().min(1, "Video file is required"),
});

export type VideoForm = z.infer<typeof videoSchema>;

export const doctorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.enum(DOCTOR_TITLES),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  color: z.string().optional(),
  rating: z
    .number()
    .min(0, "Rating must be at least 0")
    .max(5, "Rating cannot exceed 5")
    .optional(),
});

export type DoctorForm = z.infer<typeof doctorSchema>;

export const alertSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message body is required"),
});

export type AlertForm = z.infer<typeof alertSchema>;

export const aiCopilotSchema = z.object({
  model: z.enum(AI_MODELS),
  systemInstruction: z
    .string()
    .min(1, "System instruction is required"),
  crisisDirective: z.string().optional(),
  temperature: z.number().min(0, "Temperature must be at least 0").max(2),
  maxOutputTokens: z
    .number()
    .min(1, "Must be a positive whole number")
    .max(65536),
});

export type AiCopilotForm = z.infer<typeof aiCopilotSchema>;
