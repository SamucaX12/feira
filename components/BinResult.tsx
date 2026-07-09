"use client";

import { MaterialType } from "@/types/detection";
import { getWasteInfo } from "@/lib/wasteRules";

interface BinResultProps {
  material: MaterialType | string;
  confidence: number;
  saved?: boolean;
  compact?: boolean;
}

export default function BinResult({
  material,
  confidence,
  saved = false,
  compact = false,
}: BinResultProps) {
  const info = getWasteInfo(material);
  if (!info) return null;

  if (compact) {
    return (
      <div
        className={`rounded-2xl border p-3.5 ${info.binRing} bg-black/35`}
        style={{ borderColor: `${info.binColor}55` }}
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-100/50">
          {saved ? "✓ Descarte registrado" : "Detectado agora"}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-white sm:text-base">
          {info.emoji} {info.label}
        </p>
        <p className="mt-1 text-sm font-medium" style={{ color: info.binColor }}>
          → {info.binName}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 p-4 sm:p-5 ${info.binRing}`}
      style={{
        borderColor: info.binColor,
        background: `linear-gradient(145deg, ${info.binColor}20, rgba(0,0,0,0.55))`,
        boxShadow: `0 8px 32px ${info.binColor}15`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ backgroundColor: `${info.binColor}33` }}
        >
          {info.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-emerald-100/50">
            {saved ? "✓ Você fez certo!" : "Material detectado"}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white sm:text-xl">
            {info.label}
          </h3>
          <p className="mt-1 font-[family-name:var(--font-orbitron)] text-sm text-neon">
            {(confidence * 100).toFixed(0)}% de confiança
          </p>
        </div>
      </div>

      <div
        className="mt-4 rounded-xl px-4 py-3"
        style={{ backgroundColor: `${info.binColor}22` }}
      >
        <p className="text-xs uppercase tracking-wider text-emerald-100/60">
          Jogue na
        </p>
        <p
          className="mt-1 text-base font-bold sm:text-lg"
          style={{ color: info.binColor }}
        >
          {info.binName}
        </p>
      </div>

      <p className="mt-3 text-sm text-emerald-100/75">
        {saved ? info.successMessage : info.instruction}
      </p>

      <p className="mt-2 text-xs text-emerald-100/45">
        Exemplos: {info.examples}
      </p>
    </div>
  );
}
