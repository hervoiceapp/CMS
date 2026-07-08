import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext: string;
  // Variants control the styling of the subtext status row
  variant?: "success" | "warning" | "danger" | "info";
}

export default function MetricCard({
  title,
  value,
  subtext,
  variant = "info",
}: MetricCardProps) {
  // Determine subtext coloring based on the card's data type
  const variantStyles = {
    success: "text-emerald-600 bg-emerald-50 border-emerald-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    danger: "text-rose-600 bg-rose-50 border-rose-100",
    info: "text-blue-600 bg-blue-50 border-blue-100",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between min-h-[140px] transition-all hover:shadow-md">
      {/* Card Title */}
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        {title}
      </span>

      {/* Primary Value */}
      <h3 className="text-3xl font-bold text-slate-800 my-2 tracking-tight">
        {value}
      </h3>

      {/* Subtext Status Badge Row */}
      <div
        className={`inline-flex items-center w-max px-2.5 py-1 rounded-lg text-[12px] font-medium border ${variantStyles[variant]}`}
      >
        {subtext}
      </div>
    </div>
  );
}
