"use client";

import { MaterialType } from "@/types/detection";
import { getWasteInfo, normalizeMaterial } from "@/lib/wasteRules";
import {
  isVoiceSupported,
  repeatMaterialFeedback,
} from "@/lib/voiceFeedback";

interface BinResultProps {
  material: MaterialType | string;
  confidence: number;
  saved?: boolean;
  compact?: boolean;
  showHygiene?: boolean;
  showVoiceButton?: boolean;
}

function resolveMaterial(material: MaterialType | string): MaterialType | null {
  if (typeof material !== "string") return material;
  return normalizeMaterial(material);
}

export default function BinResult({
  material,
  confidence,
  saved = false,
  compact = false,
  showHygiene = true,
  showVoiceButton = true,
}: BinResultProps) {
  const info = getWasteInfo(material);
  const materialType = resolveMaterial(material);
  if (!info) return null;

  const handleRepeatVoice = () => {
    if (materialType) repeatMaterialFeedback(materialType);
  };

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
        {showHygiene && saved && (
          <p className="mt-2 text-xs leading-relaxed text-sky-200/80">
            🧼 {info.hygieneTip}
          </p>
        )}
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

      {showHygiene && (
        <div className="mt-3 rounded-xl border border-sky-400/25 bg-sky-950/25 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">
            🧼 Higiene na reciclagem
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-sky-100/85">
            {info.hygieneTip}
          </p>
        </div>
      )}

      <p className="mt-3 text-sm text-emerald-100/75">
        {saved ? info.successMessage : info.instruction}
      </p>

      <p className="mt-2 text-xs text-emerald-100/45">
        Exemplos: {info.examples}
      </p>

      {showVoiceButton && isVoiceSupported() && saved && materialType && (
        <button
          type="button"
          onClick={handleRepeatVoice}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-neon/25 bg-neon/10 px-4 py-2.5 text-sm font-medium text-neon transition hover:bg-neon/20 active:scale-[0.98]"
        >
          🔊 Ouvir novamente
        </button>
      )}
    </div>
  );
}
