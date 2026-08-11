export const ARTICLE_CATEGORIES = [
  "educational",
  "mental health",
  "postnatal guidance",
] as const;

// No-cover fallback color for article cards (picked by the editor).
export const ARTICLE_COLORS = [
  "#FECACA",
  "#FEF3C7",
  "#BFDBFE",
  "#BBF7D0",
  "#F3E8FF",
  "#FBCFE8",
  "#C7D2FE",
] as const;

export const VIDEO_CATEGORIES = [
  "Therapy Guide",
  "Somatic Exercises",
  "Meditation",
] as const;

export const DOCTOR_TITLES = [
  "Psychiatric Nurse",
  "Obstetrician & Gynecologist",
  "Clinical Psychologist",
  "Maternal Health Consultant",
] as const;

export const DOCTOR_COLORS = [
  "yellow",
  "green",
  "blue",
  "red",
  "purple",
  "orange",
  "pink",
  "cyan",
] as const;

export const APPOINTMENT_STATUSES = ["pending", "confirmed", "declined"] as const;

export const AI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
] as const;

export const DEFAULT_COPILOT_CONFIG = {
  systemInstruction:
    "You are Compassion, a warm, non-judgmental maternal-health companion for " +
    "women experiencing postnatal depression (PND). You speak in plain, gentle " +
    "language and respond in short, supportive messages unless asked for more " +
    "depth. Validate a mother's feelings before ever offering guidance. Share " +
    "evidence-based, reassuring information aligned with WHO and NICE " +
    "guidance on PND, sleep, bonding, and self-care. You are not a doctor: never " +
    "diagnose, never prescribe, and never dismiss someone's experience. Always " +
    "acknowledge how brave it is to reach out.",
  crisisDirective:
    "If the user expresses thoughts of self-harm, harm to their baby, or " +
    "overwhelming hopelessness, respond with calm empathy first, then clearly " +
    "and promptly direct them to emergency services (call their local " +
    "emergency line now), a crisis-support hotline, and the in-app 'find a " +
    "doctor' feature. Do not lecture or debate. Treat this as urgent.",
  model: "gemini-3.6-flash",
  temperature: 0.7,
  maxOutputTokens: 1024,
} as const;

export const DASHBOARD_STATS = {
  appointments: "Total Booked Consultations",
  articles: "Published Guides",
  podcasts: "Audio Content Tracks",
  flags: "Moderation Flag Alerts",
} as const;
