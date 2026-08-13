"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { db, auth } from "@/lib/firebase";
import { aiCopilotSchema, type AiCopilotForm } from "@/lib/schemas";
import { AI_MODELS, DEFAULT_COPILOT_CONFIG } from "@/lib/constants";
import type { AiCopilotConfig } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { CopilotChatPlayground } from "@/components/CopilotChatPlayground";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChatBotIcon, SaveIcon, RestoreBinIcon } from "@hugeicons/core-free-icons";

export default function CopilotPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const form = useForm<AiCopilotForm>({
    resolver: zodResolver(aiCopilotSchema),
    defaultValues: {
      model: DEFAULT_COPILOT_CONFIG.model,
      systemInstruction: DEFAULT_COPILOT_CONFIG.systemInstruction,
      crisisDirective: DEFAULT_COPILOT_CONFIG.crisisDirective,
      temperature: DEFAULT_COPILOT_CONFIG.temperature,
      maxOutputTokens: DEFAULT_COPILOT_CONFIG.maxOutputTokens,
    },
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "config", "ai_copilot"));
        if (!active) return;
        const d = snap.data();
        if (d) {
          setLastUpdated(d.updatedAt ? formatDate(d.updatedAt) : null);
          form.reset({
            model: (AI_MODELS as readonly string[]).includes(d.model)
              ? d.model
              : DEFAULT_COPILOT_CONFIG.model,
            systemInstruction: d.systemInstruction ?? DEFAULT_COPILOT_CONFIG.systemInstruction,
            crisisDirective: d.crisisDirective ?? DEFAULT_COPILOT_CONFIG.crisisDirective,
            temperature: Number(d.temperature ?? DEFAULT_COPILOT_CONFIG.temperature),
            maxOutputTokens: Number(d.maxOutputTokens ?? DEFAULT_COPILOT_CONFIG.maxOutputTokens),
          });
        } else {
          form.reset({ ...DEFAULT_COPILOT_CONFIG });
        }
      } catch (err) {
        console.error(err);
        toast.add({ title: "Failed to load copilot config", type: "error" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [form]);

  const watched = form.watch();
  const liveConfig: AiCopilotConfig = {
    model: watched.model,
    systemInstruction: watched.systemInstruction,
    crisisDirective: watched.crisisDirective ?? "",
    temperature: watched.temperature,
    maxOutputTokens: watched.maxOutputTokens,
  };

  const onSubmit = async (values: AiCopilotForm) => {
    setSubmitting(true);
    try {
      await setDoc(doc(db, "config", "ai_copilot"), {
        ...values,
        crisisDirective: values.crisisDirective ?? "",
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email ?? "unknown",
      });
      setLastUpdated(formatDate(new Date()));
      toast.add({ title: "Configuration saved", type: "success" });
      form.reset(values);
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to save configuration", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetDefaults = () => {
    form.reset({ ...DEFAULT_COPILOT_CONFIG });
    setConfirmReset(false);
    toast.add({ title: "Defaults restored — save to apply", type: "success" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Empathy Copilot"
        description="Tune the maternal support chatbot's behavior and test it before it reaches the app"
      />

      {form.formState.isDirty && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Testing unsaved changes — the playground uses these edits. Save to apply them to the
            live app.
          </p>
          <Badge variant="secondary" className="shrink-0">
            Unsaved
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <form onSubmit={form.handleSubmit(onSubmit)} id="copilot-form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={ChatBotIcon} className="size-4 text-primary" />
                Copilot Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="ci-model">Model</Label>
                <NativeSelect id="ci-model" className="w-full" {...form.register("model")}>
                  {AI_MODELS.map((m) => (
                    <NativeSelectOption key={m} value={m}>
                      {m}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {form.formState.errors.model && (
                  <p className="text-xs text-destructive">{form.formState.errors.model.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ci-instruction">System instruction</Label>
                <Textarea id="ci-instruction" rows={10} {...form.register("systemInstruction")} />
                {form.formState.errors.systemInstruction && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.systemInstruction.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ci-crisis">Crisis directive</Label>
                <Textarea id="ci-crisis" rows={4} {...form.register("crisisDirective")} />
                <p className="text-xs text-muted-foreground">
                  Appended as the “CRISIS PROTOCOL” block guiding self-harm and emergency responses.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Temperature · {watched.temperature.toFixed(2)}</Label>
                <Slider
                  min={0}
                  max={2}
                  step={0.05}
                  value={[watched.temperature]}
                  onValueChange={(v) => {
                    const val = Array.isArray(v) ? v[0] : v;
                    if (typeof val === "number") {
                      form.setValue("temperature", Math.round(val * 100) / 100);
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ci-tokens">Max output tokens</Label>
                <Input
                  id="ci-tokens"
                  type="number"
                  min={1}
                  max={65536}
                  {...form.register("maxOutputTokens", {
                    setValueAs: (v) => (v === "" ? 0 : Number(v)),
                  })}
                />
                {form.formState.errors.maxOutputTokens && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.maxOutputTokens.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                {lastUpdated ? `Last updated ${lastUpdated}` : "No config saved yet"}
                {loading && " · loading…"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmReset(true)}
                  disabled={submitting}
                >
                  <HugeiconsIcon icon={RestoreBinIcon} />
                  Reset defaults
                </Button>
                <Button
                  type="submit"
                  form="copilot-form"
                  disabled={submitting || !form.formState.isDirty}
                >
                  <HugeiconsIcon icon={SaveIcon} />
                  {submitting ? "Saving…" : "Save configuration"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>

        <CopilotChatPlayground config={liveConfig} />
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Restore default configuration?"
        description="This overwrites the form with the default persona and settings. You must save afterwards to publish it."
        onConfirm={handleResetDefaults}
      />
    </div>
  );
}
