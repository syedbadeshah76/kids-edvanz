import React from "react";
import { Laptop, Sparkles } from "lucide-react";

export interface LearningSectorSwitcherProps {
  selectedSector: "IT" | "KIDS";
  onSectorChange: (sector: "IT" | "KIDS") => void;
  className?: string;
  variant?: "blue" | "indigo";
  size?: "sm" | "md";
}

export const LearningSectorSwitcher: React.FC<LearningSectorSwitcherProps> = ({
  selectedSector,
  onSectorChange,
  className = "",
  variant = "blue",
  size = "md",
}) => {
  const isIndigo = variant === "indigo";
  const activeClass = isIndigo
    ? "bg-indigo-600 text-white shadow-sm"
    : "bg-blue-600 text-white shadow-sm";

  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      role="group"
      aria-label="Select Learning Sector"
      className={`inline-flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-xs ${className}`}
    >
      <button
        type="button"
        aria-pressed={selectedSector === "IT"}
        onClick={() => onSectorChange("IT")}
        className={`flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer ${sizeClass} ${
          selectedSector === "IT"
            ? `${activeClass} font-extrabold`
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
        }`}
      >
        <Laptop className={iconSize} />
        <span>IT</span>
      </button>

      <button
        type="button"
        aria-pressed={selectedSector === "KIDS"}
        onClick={() => onSectorChange("KIDS")}
        className={`flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer ${sizeClass} ${
          selectedSector === "KIDS"
            ? `${activeClass} font-extrabold`
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
        }`}
      >
        <Sparkles className={iconSize} />
        <span>Kidz</span>
      </button>
    </div>
  );
};

export default LearningSectorSwitcher;
