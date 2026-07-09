"use client";

import { WASTE_INFO } from "@/lib/wasteRules";
import { MaterialType } from "@/types/detection";

interface PredictionBarsProps {
  candidates: Array<{
    material: MaterialType;
    confidence: number;
    label?: string;
  }>;
  highlight?: MaterialType | null;
}

export default function PredictionBars({
  candidates,
  highlight,
}: PredictionBarsProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-100/45">
        Análise da IA
      </p>
      {candidates.map((item) => {
        const info = WASTE_INFO[item.material];
        const pct = Math.round(item.confidence * 100);
        const isTop = highlight === item.material;

        return (
          <div key={item.material}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span
                className={
                  isTop ? "font-semibold text-white" : "text-emerald-100/65"
                }
              >
                {info.emoji} {info.label}
              </span>
              <span
                className={`font-[family-name:var(--font-orbitron)] tabular-nums ${
                  isTop ? "text-neon" : "text-emerald-100/50"
                }`}
              >
                {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(pct, 4)}%`,
                  backgroundColor: isTop ? info.binColor : `${info.binColor}88`,
                  boxShadow: isTop ? `0 0 8px ${info.binColor}66` : undefined,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
