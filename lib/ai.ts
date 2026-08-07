import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { app } from "./firebase";
import type { AiCopilotConfig } from "./types";

export const ai = getAI(app, { backend: new GoogleAIBackend() });

export interface ChatModelParams {
  model: string;
  systemInstruction: string;
  crisisDirective?: string;
  temperature: number;
  maxOutputTokens: number;
}

export function buildChatModel(cfg: ChatModelParams) {
  const directive = (cfg.crisisDirective ?? "").trim();
  return getGenerativeModel(ai, {
    model: cfg.model,
    systemInstruction:
      cfg.systemInstruction.trim() +
      (directive ? "\n\nCRISIS PROTOCOL:\n" + directive : ""),
    generationConfig: {
      temperature: cfg.temperature,
      maxOutputTokens: cfg.maxOutputTokens,
    },
  });
}

export function toChatParams(cfg: AiCopilotConfig): ChatModelParams {
  return {
    model: cfg.model,
    systemInstruction: cfg.systemInstruction,
    crisisDirective: cfg.crisisDirective,
    temperature: cfg.temperature,
    maxOutputTokens: cfg.maxOutputTokens,
  };
}