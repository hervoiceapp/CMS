"use client";

import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  Mic,
  Tv,
  Users,
  UserCheck,
  Calendar,
  Bell,
  Sparkles,
} from "lucide-react";

const navigationData = [
  {
    category: "Ecosystem Status",
    items: [{ name: "Dashboard", id: "dashboard", icon: LayoutDashboard }],
  },
  {
    category: "Media & Copywriting",
    items: [
      { name: "Article & Guides", id: "articles", icon: BookOpen },
      { name: "Podcast Episodes", id: "podcasts", icon: Mic },
      { name: "Therapy Videos", id: "videos", icon: Tv },
    ],
  },
  {
    category: "Community & Support",
    items: [{ name: "Social Feed", id: "feed", icon: Users }],
  },
  {
    category: "Clinical Providers",
    items: [
      { name: "Physicians Registry", id: "registry", icon: UserCheck },
      { name: "Appointment Book", id: "appointments", icon: Calendar },
    ],
  },
  {
    category: "System & Engagement",
    items: [
      { name: "Push Alerts Dispatch", id: "alerts", icon: Bell },
      { name: "AI Empathy Copilot", id: "copilot", icon: Sparkles },
    ],
  },
];

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function SidebarNav({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
}: SidebarNavProps) {
  return (
    <aside
      className={`h-full bg-white rounded-[24px] shadow-sm border border-slate-100 flex flex-col p-5 overflow-y-auto select-none transition-all duration-300 ease-in-out shrink-0
        ${isCollapsed ? "w-44 text-center" : "w-72"}`}
    >
      {/* Brand Header Area */}
      <div
        className={`flex items-center mb-8 px-1 ${isCollapsed ? "justify-center relative group/logo" : "justify-between"}`}
      >
        {/* Logo Avatar */}
        <div className="w-12 h-12 bg-[#3B82F6] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm relative overflow-hidden shrink-0">
          <span>H</span>

          {/* Collapse Overlay: Only active and visible when collapsed AND hovering the avatar logo */}
          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="absolute inset-0 bg-slate-900/80 text-white flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200 cursor-pointer outline-none"
              title="Expand Sidebar"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <path d="M9 3v18" />
              </svg>
            </button>
          )}
        </div>

        {/* Full Branding Typography & Persistent Toggle Icon */}
        {!isCollapsed && (
          <>
            <div className="flex-1 ml-3 text-left animate-fadeIn">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
                HerVoice
              </h1>
              <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase mt-1 block">
                Management System
              </span>
            </div>

            {/* Persistent button on full sidebar */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors outline-none"
              title="Collapse Sidebar"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <path d="M9 3v18" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-6 overflow-x-hidden pt-2">
        {navigationData.map((section) => (
          <div key={section.category} className="space-y-3">
            {/* Division Headings - Locked to one line, never wrapping */}
            <h3
              className={`font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap overflow-hidden text-ellipsis text-center
              ${isCollapsed ? "text-[9px] px-1" : "text-[11px] px-3 text-left"}`}
            >
              {section.category}
            </h3>

            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`
                        w-full flex items-center py-3 rounded-xl text-[14px] font-medium transition-all duration-200 group relative
                        ${isCollapsed ? "justify-center px-0" : "px-4 gap-3 text-left"}
                        ${
                          isActive
                            ? "bg-[#E3EFFE] text-[#1E3A8A] font-bold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }
                      `}
                    >
                      <Icon
                        className={`shrink-0 ${isCollapsed ? "w-6 h-6" : "w-5 h-5"} ${isActive ? "text-[#3B82F6]" : "text-slate-400 group-hover:text-slate-600"}`}
                      />

                      {!isCollapsed && (
                        <span className="animate-fadeIn truncate">
                          {item.name}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
