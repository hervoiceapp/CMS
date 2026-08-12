"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { useCollection } from "@/hooks/use-collection";
import type { ScreeningResult } from "@/lib/types";
import { formatDateTime } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const severityTone: Record<
  string,
  { label: string; className: string }
> = {
  "Mild Postnatal Emotional Challenges": {
    label: "Mild",
    className: "bg-emerald-500/10 text-emerald-600",
  },
  "Moderate Postnatal Emotional Challenges": {
    label: "Moderate",
    className: "bg-amber-500/10 text-amber-600",
  },
  "Severe Postnatal Emotional Challenges": {
    label: "Severe",
    className: "bg-rose-500/10 text-rose-600",
  },
};

function toneFor(severity: string | undefined) {
  return (
    severityTone[severity ?? ""] ?? {
      label: severity || "Unknown",
      className: "bg-muted text-muted-foreground",
    }
  );
}

export default function ScreeningsPage() {
  const { data, loading, error } = useCollection<ScreeningResult>(
    "screening_results",
  );
  const [selected, setSelected] = useState<ScreeningResult | null>(null);

  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => {
        const ta =
          a.timestamp &&
          typeof a.timestamp === "object" &&
          "seconds" in a.timestamp
            ? a.timestamp.seconds
            : 0;
        const tb =
          b.timestamp &&
          typeof b.timestamp === "object" &&
          "seconds" in b.timestamp
            ? b.timestamp.seconds
            : 0;
        return tb - ta;
      }),
    [data],
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { total: data.length };
    for (const s of data) {
      const key = toneFor(s.severity).label;
      out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }, [data]);

  const columns = useMemo<ColumnDef<ScreeningResult>[]>(
    () => [
      {
        accessorKey: "userName",
        header: "Member",
        cell: ({ getValue }) =>
          String(getValue() ?? "")

            ? String(getValue())
            : (
                <span className="text-muted-foreground">Community Member</span>
              ),
      },
      {
        accessorKey: "totalScore",
        header: "Score",
        cell: ({ getValue }) => (
          <span className="font-medium tabular-nums">
            {String(getValue() ?? "—")}
          </span>
        ),
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ getValue }) => {
          const badge = toneFor(String(getValue() ?? ""));
          return (
            <Badge className={badge.className} variant="outline">
              {badge.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "timestamp",
        header: "Submitted",
        cell: ({ getValue }) => formatDateTime(getValue()),
      },
      {
        id: "view",
        header: "",
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => setSelected(row.original)}>
            Review
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening Results"
        description="Postnatal assessment submissions ready for care-team follow-up"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          ["Total", "total", "bg-primary/10 text-primary"],
          ["Mild", "Mild", "bg-emerald-500/10 text-emerald-600"],
          ["Moderate", "Moderate", "bg-amber-500/10 text-amber-600"],
          ["Severe", "Severe", "bg-rose-500/10 text-rose-600"],
        ].map(([label, key, className]) => (
          <div
            key={String(key)}
            className="flex flex-col gap-1 rounded-2xl border bg-card p-4"
          >
            <Badge className={`w-fit ${className}`}>{label}</Badge>
            <span className="mt-1 text-2xl font-bold">{counts[String(key)] ?? 0}</span>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={sorted}
        loading={loading}
        error={error}
        searchable
        pageSize={15}
      />

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.userName || "Screening Result"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${formatDateTime(selected.timestamp)} · Score ${selected.totalScore ?? "—"}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-80">
            <div className="space-y-4">
              {selected?.severity && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Severity
                  </p>
                  <Badge className={toneFor(selected.severity).className} variant="outline">
                    {toneFor(selected.severity).label}
                  </Badge>
                </div>
              )}
              {selected?.recommendation && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Recommendation
                  </p>
                  <p className="text-sm">{selected.recommendation}</p>
                </div>
              )}
              {selected?.answers && selected.answers.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Answers
                  </p>
                  <div className="space-y-2">
                    {selected.answers.map((a, i) => (
                      <div
                        key={i}
                        className="rounded-xl border bg-muted/40 p-3"
                      >
                        <p className="text-sm font-medium">{a.text}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Answer {a.answer} · Score {a.score}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}