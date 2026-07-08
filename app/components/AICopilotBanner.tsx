import React from "react";
import { Sparkles } from "lucide-react";

export default function AICopilotBanner() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#0267D2] to-[#4FA4F2] rounded-[24px] p-8 md:p-10 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      {/* Background Subtle Radial Glow Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

      {/* Content Side */}
      <div className="space-y-3 z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md text-white rounded-full text-[11px] font-bold uppercase tracking-wider border border-white/10">
          <Sparkles className="w-3 h-3 text-blue-200 fill-blue-200" />
          Clinical Copilot Support
        </span>

        <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Instantly Draft Empathetic Guides with AI
        </h3>

        <p className="text-blue-50/90 text-[14px] md:text-[15px] font-medium max-w-2xl leading-relaxed">
          Our pre-trained maternal model writes scientific-grade advice,
          comforting outlines, and therapeutic affirmations seamlessly.
        </p>
      </div>

      {/* Action Button Side */}
      <div className="z-10 shrink-0 self-end md:self-center">
        <button className="flex items-center gap-2 bg-white text-[#0267D2] px-5 py-3 rounded-xl text-sm font-bold hover:bg-blue-50 active:scale-[0.98] transition-all shadow-md shadow-blue-900/10">
          {/* Bookmark-style icon approximation from design */}
          <svg
            className="w-4 h-4 text-[#0267D2]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          Open Copilot
        </button>
      </div>
    </div>
  );
}
