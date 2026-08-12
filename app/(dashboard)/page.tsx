"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCollection } from "@/hooks/use-collection";
import { useAuth } from "@/components/auth-provider";
import type { Article, Appointment, Podcast, Post, ScreeningResult } from "@/lib/types";
import { formatDate, normalizePost } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  CalendarCheckIcon,
  MedicalFileIcon,
  PodcastIcon,
  BubbleChatIcon,
  ClipboardIcon,
} from "@hugeicons/core-free-icons";

function StatCard({
  title,
  value,
  subtext,
  icon,
  className,
}: {
  title: string;
  value: string | number;
  subtext: string;
  icon: IconSvgElement;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <Badge variant="secondary" className="font-normal">
              {subtext}
            </Badge>
          </div>
          <div className={`flex size-10 items-center justify-center rounded-xl ${className ?? "bg-muted"}`}>
            <HugeiconsIcon icon={icon} className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionQueueCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconSvgElement;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={icon} className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

const statusColor: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  declined: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export default function DashboardPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { data: appointments, loading: loadingAppointments } =
    useCollection<Appointment>("appointments");
  const { data: articles, loading: loadingArticles } =
    useCollection<Article>("articles");
  const { data: podcasts, loading: loadingPodcasts } =
    useCollection<Podcast>("podcasts");
  const { data: rawPosts } = useCollection<
    Record<string, unknown> & { id: string }
  >("posts");
  const posts = useMemo(() => rawPosts.map((raw) => normalizePost(raw)), [rawPosts]);
  const { data: screenings, loading: loadingScreenings } =
    useCollection<ScreeningResult>("screening_results");
  const severeScreenings = useMemo(
    () =>
      screenings.filter((s) =>
        String(s.severity ?? "").startsWith("Severe"),
      ),
    [screenings],
  );
  const recentPosts = useMemo(() => {
    const ts = (v?: Post["createdAt"]) => {
      if (!v) return 0;
      if (typeof v === "number") return v;
      if (v instanceof Date) return v.getTime();
      if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
        return (v as { toMillis(): number }).toMillis();
      }
      return 0;
    };
    return [...posts].sort((a, b) => ts(b.createdAt) - ts(a.createdAt)).slice(0, 3);
  }, [posts]);

  const pendingAppointments = appointments.filter(
    (a) => a.status === "pending",
  );

  const statusCounts = appointments.reduce(
    (acc: Record<string, number>, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    {},
  );
  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  const loading =
    loadingAppointments && loadingArticles && loadingPodcasts && loadingScreenings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live overview of the HerVoice ecosystem
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Booked Consultations"
            value={appointments.length}
            subtext="Live appointments pool"
            icon={CalendarCheckIcon}
            className="bg-blue-500/10 text-blue-600"
          />
          <StatCard
            title="Published Guides"
            value={articles.length}
            subtext="Articles across app instances"
            icon={MedicalFileIcon}
            className="bg-emerald-500/10 text-emerald-600"
          />
          <StatCard
            title="Audio Content Tracks"
            value={podcasts.length}
            subtext="Calming night streams live"
            icon={PodcastIcon}
            className="bg-amber-500/10 text-amber-600"
          />
          {isAdmin && (
            <StatCard
              title="Community Posts"
              value={posts.length}
              subtext="Live user-submitted posts"
              icon={BubbleChatIcon}
              className="bg-rose-500/10 text-rose-600"
            />
          )}
          {isAdmin && (
            <StatCard
              title="Screenings"
              value={screenings.length}
              subtext={`${severeScreenings.length} severe`}
              icon={ClipboardIcon}
              className="bg-indigo-500/10 text-indigo-600"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ActionQueueCard title="Urgent Consultation Requests" icon={CalendarCheckIcon}>
          {pendingAppointments.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              No pending consultation requests.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingAppointments.slice(0, 3).map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-xl border bg-muted/30 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold">
                      {appointment.doctorName}
                    </h4>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {appointment.date?.split("T")[0]} @ {appointment.time}
                    </Badge>
                  </div>
                  <p className="text-xs italic text-muted-foreground leading-relaxed">
                    &ldquo;{appointment.notes}&rdquo;
                  </p>
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/appointments" />}>
                    Review in Appointment Book
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ActionQueueCard>

        {isAdmin && (
          <ActionQueueCard
            title="Severe Screening Alerts"
            icon={ClipboardIcon}
          >
            {severeScreenings.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                No severe screening results.
              </p>
            ) : (
              <div className="space-y-4">
                {severeScreenings.slice(0, 3).map((screening) => (
                  <div
                    key={screening.id}
                    className="rounded-xl border bg-muted/30 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold">
                        {screening.userName || "Community Member"}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Score {screening.totalScore ?? "—"}
                      </span>
                    </div>
                    <p className="text-xs italic text-muted-foreground leading-relaxed">
                      {screening.severity || "Screening submitted"}
                    </p>
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/screenings" />}>
                      Review in Screening Results
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ActionQueueCard>
        )}

        {isAdmin && (
          <ActionQueueCard title="Latest Community Posts" icon={BubbleChatIcon}>
            {recentPosts.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                No posts yet from the community.
              </p>
            ) : (
              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-xl border bg-muted/30 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold">
                        {post.authorName || "Community Member"}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs italic text-muted-foreground leading-relaxed">
                      &ldquo;{post.content || "No content"}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {post.likes ?? 0} likes • {post.comments ?? 0} comments
                    </p>
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/feed" />}>
                      View Community Feed
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ActionQueueCard>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                No appointment data yet.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Appointments</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/appointments" />}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <p className="rounded-xl border border-dashed m-4 p-12 text-center text-sm text-muted-foreground">
                No appointments yet.
              </p>
            ) : (
              <ul className="divide-y">
                {appointments.slice(0, 5).map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {appointment.doctorName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(appointment.date)} • {appointment.time} •{" "}
                        {appointment.sessionType}
                      </p>
                    </div>
                    <Badge className={statusColor[appointment.status] ?? "bg-muted"}>
                      {appointment.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
