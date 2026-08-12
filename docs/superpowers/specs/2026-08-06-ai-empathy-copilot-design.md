# AI Empathy Copilot — Design Spec

**Date:** 2026-08-06
**Status:** Approved (design), pending implementation plan

## Overview

The CMS gains an "AI Copilot" tuning console for the maternal-health support
chatbot that lives in the mobile app (women experiencing postnatal depression).
From this page admins adjust the chatbot's persona/behavior and generation
parameters, save them to Firestore, and test the persona in a live multi-turn
chat playground — without touching code.

> "Our pre-trained maternal model writes scientific-grade advice, comforting
> outlines, and therapeutic affirmations seamlessly."

In practice: a Gemini model driven by a tunable system instruction, whose
configuration is a single Firestore document the mobile app reads when
starting a chat.

## Decisions (from brainstorm)

| Decision         | Choice                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| Surface          | Dedicated page (`/copilot`), sidebar entry "AI Copilot"                               |
| Purpose          | Tune the app's PND support chatbot — NOT content writing                              |
| Config storage   | Firestore doc `config/ai_copilot` (app reads it at chat start)                        |
| Tunable knobs    | Core set: system instruction, crisis directive, model, temperature, max output tokens |
| Test panel       | Multi-turn playground with streaming + reset, using unsaved form values               |
| Publish model    | Overwrite + `updatedAt`/`updatedBy` stamp                                             |
| Model invocation | Client-side Firebase AI Logic (`firebase/ai`), no backend                             |

## Architecture

```
app/(dashboard)/copilot/page.tsx     config form (RHF+zod) + layout
components/CopilotChatPlayground.tsx  multi-turn streaming chat test panel
lib/ai.ts                             getAI() + buildChatModel(config)
lib/types.ts                          AiCopilotConfig type
lib/schemas.ts                        aiCopilotSchema (zod)
lib/constants.ts                      AI_MODELS list, DEFAULT_COPILOT_CONFIG
Firestore: config/ai_copilot          single document, overwritten on save
```

Data flow:

1. Page loads `config/ai_copilot` via `getDoc` (one-shot, not a listener —
   editing against a live-updating doc is surprising). Missing doc → form is
   seeded with `DEFAULT_COPILOT_CONFIG`.
2. Form edits are local. The playground builds its model from the form's
   current values, so tuning can be tested **before** saving.
3. Save writes the whole doc with `setDoc(doc(db,"config","ai_copilot"))`
   plus `updatedAt: serverTimestamp()` and `updatedBy: auth.currentUser.email`.
4. The mobile app (out of scope here) reads the same doc and passes the
   values into its own `getGenerativeModel()` call.

## Config Document Schema

```ts
interface AiCopilotConfig {
  systemInstruction: string; // persona + behavior rules
  crisisDirective: string; // crisis-escalation note, appended at runtime
  model: string; // "gemini-3.6-flash" | "gemini-3.5-flash" | "gemini-3.5-flash-lite"
  temperature: number; // 0.0–2.0, default 0.7
  maxOutputTokens: number; // 256–8192, default 1024
  updatedAt: Timestamp; // server timestamp, set on save
  updatedBy: string; // admin email, set on save
}
```

Model choices (stable, no Blaze plan required on Gemini Developer API):

- `gemini-3.6-flash` — latest stable, default
- `gemini-3.5-flash` — stable, supported through ≥2027-05
- `gemini-3.5-flash-lite` — cheapest/fastest

(Preview/Pro models and 2.x models deliberately excluded: billing-required or
shutting down October 2026.)

## AI Integration

`lib/ai.ts`:

```ts
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { app } from "./firebase";

export const ai = getAI(app, { backend: new GoogleAIBackend() });

export function buildChatModel(cfg: AiCopilotConfig) {
  return getGenerativeModel(ai, {
    model: cfg.model,
    systemInstruction:
      cfg.systemInstruction.trim() +
      (cfg.crisisDirective.trim() ? "\n\nCRISIS PROTOCOL:\n" + cfg.crisisDirective.trim() : ""),
    generationConfig: {
      temperature: cfg.temperature,
      maxOutputTokens: cfg.maxOutputTokens,
    },
  });
}
```

The playground calls `buildChatModel(form.getValues())`, `model.startChat()`,
and `chat.sendMessageStream(message)`; chunks are appended to the streaming
assistant bubble. Reset discards the chat session and rebuilds the model.

## Default System Instruction

Ships in `lib/constants.ts` as `DEFAULT_COPILOT_CONFIG.systemInstruction`.
Persona: warm, non-judgmental maternal-health companion for women with
postnatal depression; evidence-based (WHO/NICE-aligned); validates feelings
before advising; never diagnoses, never prescribes; plain language; brief
responses unless asked for depth. `DEFAULT_COPILOT_CONFIG.crisisDirective`:
if the user mentions self-harm, harming the baby, or hopelessness, respond
with calm empathy and immediately direct to emergency services / a crisis
hotline and the in-app "find a doctor" feature.

## UI Layout

Two-column grid (`xl:grid-cols-2`), collapsing to stacked on small screens:

- **Left — "Copilot Configuration" card**: system instruction textarea
  (10 rows), crisis directive textarea (4 rows), model select, temperature
  slider (0–2, step 0.05, live value), max output tokens number input,
  last-updated stamp, "Restore defaults" (confirm) + "Save configuration".
- **Right — "Test Playground" card**: scrollable message list (user right /
  assistant left, streaming indicator), input + send, "Reset conversation".
  Unsaved-config banner: "Testing unsaved changes" when form is dirty.

Toasts for save success/failure via existing `toast.add`.

## Provisioning (one-time, manual)

```
npx -y firebase-tools@latest init ailogic
```

enables the Gemini Developer API for project `kolado-mis`. Without it all AI
calls fail with PERMISSION_DENIED. (Requires firebase CLI login — run by the
user if not already authenticated.)

## Security

- Firestore rules: `config/ai_copilot` — read allowed (app needs it), write
  restricted to authenticated users. Flagged for the rules audit; no rules
  file exists in this repo today, so this ships as a note in the plan.
- **Follow-up (not in scope):** Firebase App Check before production AI use,
  per Firebase's safety requirement, to prevent quota abuse from the mobile
  app's API key.

## Error Handling

- AI call failure → error toast + an inline assistant bubble
  "Something went wrong…" so the playground thread stays readable.
- Missing `config/ai_copilot` doc → defaults + an info note, not an error.
- PERMISSION_DENIED → toast telling the admin to run the provisioning step.

## Testing / Verification

No test runner in this repo (package.json: dev/build/lint only). Verification:

1. `bun run build` + `bun run lint` green.
2. Browser: `/copilot` loads; form seeded from Firestore (or defaults);
   temperature slider updates; save writes doc (verify via reload showing
   new values + updated stamp); playground streams a reply; reset clears;
   dirty-form banner appears/disappears.

## Out of Scope

- The mobile app's consumption of the config doc.
- Config version history / draft-publish workflow (chose overwrite+stamp).
- App Check setup.
- Persona presets, topP/topK/safety-category controls (chose core set).
