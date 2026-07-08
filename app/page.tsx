"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import SidebarNav from "./components/sidebar";
import MetricCard from "./components/MetricCard";
import ActionQueues from "./components/ActionQueues";
import AICopilotBanner from "./components/AICopilotBanner";
import ArticlesManagement from "./components/ArticlesManagement";
import PodcastsManagement from "./components/PodcastsManagement";
import VideosManagement from "./components/VideosManagement";
import PhysiciansRegistry from "./components/PhysiciansRegistry";
import SocialFeedManagement from "./components/SocialFeedManagement";
import AppointmentBookManagement from "./components/AppointmentBookManagement";
import PushAlertsDispatch from "./components/PushAlertsDispatch"; // 👈 1. Imported here

interface DashboardStats {
  totalAppointments: number;
  totalArticles: number;
  totalPodcasts: number;
  totalPosts: number;
  pendingFlags: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    totalArticles: 0,
    totalPodcasts: 0,
    totalPosts: 0,
    pendingFlags: 0,
  });

  useEffect(() => {
    const unsubAppointments = onSnapshot(
      collection(db, "appointments"),
      (snapshot) => {
        setStats((prev) => ({ ...prev, totalAppointments: snapshot.size }));
      },
    );

    const unsubArticles = onSnapshot(collection(db, "articles"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalArticles: snapshot.size }));
      setIsLoading(false);
    });

    const unsubPodcasts = onSnapshot(collection(db, "podcasts"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalPodcasts: snapshot.size }));
    });

    const unsubPosts = onSnapshot(collection(db, "posts"), (snapshot) => {
      let flagCount = 0;
      snapshot.forEach((doc) => {
        if (doc.data().isFlagged === true) flagCount++;
      });
      setStats((prev) => ({
        ...prev,
        totalPosts: snapshot.size,
        pendingFlags: flagCount,
      }));
    });

    return () => {
      unsubAppointments();
      unsubArticles();
      unsubPodcasts();
      unsubPosts();
    };
  }, []);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Publish & Manage Maternal Guidance Articles";
      case "articles":
        return "Article & Guides Control Center";
      case "podcasts":
        return "Upload Audio & Calming Night Podcast Episodes";
      case "videos":
        return "Register Video Playlists";
      case "registry":
        return "Physicians & Medical Specialist Registry";
      case "feed":
        return "Community Discussions & Social Feed Moderation";
      case "appointments":
      case "appointment-book":
        return "Clinical Appointments Scheduler Book";
      case "alerts":
      case "push-alerts":
      case "push-alerts-dispatch": // 👈 2. Added heading matching title criteria
        return "Push Alerts & Global Mobile Broadcasting Dispatch";
      default:
        return activeTab.replace("-", " ");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#E5F4FF] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-sm font-medium">
            Synchronizing HerVoice Ecosystem...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-[#E5F4FF] p-4 lg:p-6 gap-4 lg:gap-6 overflow-hidden font-sans antialiased">
      <SidebarNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <main className="flex-1 h-full bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-y-auto p-8 lg:p-10 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight capitalize">
              {getHeaderTitle()}
            </h2>
          </div>

          {activeTab === "dashboard" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Booked Consultations"
                  value={String(stats.totalAppointments)}
                  subtext="Live appointments pool"
                  variant="success"
                />
                <MetricCard
                  title="Published Guides"
                  value={String(stats.totalArticles)}
                  subtext="Articles across app instances"
                  variant="success"
                />
                <MetricCard
                  title="Audio Content Tracks"
                  value={String(stats.totalPodcasts)}
                  subtext="Calming night streams live"
                  variant="warning"
                />
                <MetricCard
                  title="Moderation Flag Alerts"
                  value={`${stats.pendingFlags} Flags`}
                  subtext="Requires Safety Inspection"
                  variant="danger"
                />
              </div>
              <ActionQueues />
              <AICopilotBanner />
            </>
          )}

          {activeTab === "articles" && <ArticlesManagement />}
          {activeTab === "podcasts" && <PodcastsManagement />}
          {activeTab === "videos" && <VideosManagement />}
          {activeTab === "registry" && <PhysiciansRegistry />}
          {activeTab === "feed" && <SocialFeedManagement />}

          {(activeTab === "appointments" ||
            activeTab === "appointment-book") && <AppointmentBookManagement />}

          {/* 👈 3. Injected tab component viewport handler condition here */}
          {(activeTab === "alerts" ||
            activeTab === "push-alerts" ||
            activeTab === "push-alerts-dispatch") && <PushAlertsDispatch />}

          {/* FALLBACK VIEW: Triggers ONLY if the current tab isn't one of our active modules */}
          {![
            "dashboard",
            "articles",
            "podcasts",
            "videos",
            "registry",
            "feed",
            "appointments",
            "appointment-book",
            "alerts",
            "push-alerts",
            "push-alerts-dispatch",
          ].includes(
            // 👈 4. Added array whitelist values tracking keys
            activeTab,
          ) && (
            <div className="p-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50/50">
              <p className="text-slate-500 text-sm font-medium mb-1">
                Workspace Module Under Construction
              </p>
              <p className="text-slate-400 text-xs">
                The view layer component for "{activeTab}" is ready to be linked
                to your corresponding Firestore collection.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
