"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { db, auth } from "@/lib/firebase";
import { appConfigSchema, type AppConfigForm } from "@/lib/schemas";
import { formatDate } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, SaveIcon } from "@hugeicons/core-free-icons";

const DEFAULTS: AppConfigForm = {
  minVersion: "1.0.0",
  forceUpdateBelow: "1.0.0",
  maintenanceMode: false,
  maintenanceMessage: "",
};

export default function AppSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const form = useForm<AppConfigForm>({
    resolver: zodResolver(appConfigSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "config", "app_config"));
        if (!active) return;
        const d = snap.data();
        if (d) {
          setLastUpdated(d.updatedAt ? formatDate(d.updatedAt) : null);
          form.reset({
            minVersion: d.minVersion ?? DEFAULTS.minVersion,
            forceUpdateBelow: d.forceUpdateBelow ?? DEFAULTS.forceUpdateBelow,
            maintenanceMode: !!d.maintenanceMode,
            maintenanceMessage: d.maintenanceMessage ?? "",
          });
        }
      } catch (err) {
        console.error(err);
        toast.add({ title: "Failed to load app config", type: "error" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [form]);

  const onSubmit = async (values: AppConfigForm) => {
    setSubmitting(true);
    try {
      await setDoc(doc(db, "config", "app_config"), {
        ...values,
        maintenanceMessage: values.maintenanceMessage ?? "",
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email ?? "unknown",
      });
      setLastUpdated(formatDate(new Date()));
      toast.add({ title: "App settings saved", type: "success" });
      form.reset(values);
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to save app settings", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const watched = form.watch();

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Settings"
        description="Force app updates and manage maintenance windows"
      />

      {watched.maintenanceMode && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Maintenance mode is ON — mobile users will see the message below.
          </p>
          <Badge variant="secondary" className="shrink-0">Active</Badge>
        </div>
      )}

      <Card className="max-w-2xl">
        <form onSubmit={form.handleSubmit(onSubmit)} id="app-config-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Settings01Icon} className="size-4 text-primary" />
              App Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ac-min-version">Current app version</Label>
                <Input
                  id="ac-min-version"
                  placeholder="1.2.3"
                  {...form.register("minVersion")}
                />
                {form.formState.errors.minVersion && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.minVersion.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  The version you are shipping in this store release.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ac-force-below">Force update below</Label>
                <Input
                  id="ac-force-below"
                  placeholder="1.2.0"
                  {...form.register("forceUpdateBelow")}
                />
                {form.formState.errors.forceUpdateBelow && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.forceUpdateBelow.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Users running an older version are forced to update.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <Label htmlFor="ac-maintenance">Maintenance mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Block the app with a notice while you perform maintenance.
                  </p>
                </div>
                <input
                  id="ac-maintenance"
                  type="checkbox"
                  checked={watched.maintenanceMode}
                  onChange={(e) =>
                    form.setValue("maintenanceMode", e.target.checked)
                  }
                  className="size-5 accent-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ac-message">Maintenance message</Label>
                <Textarea
                  id="ac-message"
                  rows={3}
                  placeholder="e.g. We're doing a quick upgrade. Please check back shortly."
                  {...form.register("maintenanceMessage")}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {lastUpdated
                ? `Last updated ${lastUpdated}`
                : "No settings saved yet"}
              {loading && " · loading…"}
            </div>
            <Button
              type="submit"
              form="app-config-form"
              disabled={submitting || !form.formState.isDirty}
            >
              <HugeiconsIcon icon={SaveIcon} />
              {submitting ? "Saving…" : "Save settings"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
