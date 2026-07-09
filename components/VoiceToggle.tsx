"use client";

import { useEffect, useState } from "react";
import {
  initVoiceEngine,
  isVoiceEnabled,
  isVoiceSupported,
  setVoiceEnabled,
  stopSpeaking,
} from "@/lib/voiceFeedback";

export default function VoiceToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    initVoiceEngine();
    setSupported(isVoiceSupported());
    setEnabled(isVoiceEnabled());
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setVoiceEnabled(next);
    if (!next) stopSpeaking();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`badge transition active:scale-95 ${
        enabled
          ? "border-neon/35 bg-neon/12 text-neon"
          : "border-white/15 bg-black/30 text-emerald-100/50"
      }`}
      title="Retorno por voz para acessibilidade"
    >
      {enabled ? "🔊 Voz ativada" : "🔇 Voz desativada"}
    </button>
  );
}
