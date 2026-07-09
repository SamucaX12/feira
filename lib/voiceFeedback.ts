import { MaterialType } from "@/types/detection";
import { getWasteInfo } from "@/lib/wasteRules";

const VOICE_STORAGE_KEY = "ecoscan_voice_enabled";

let voicesReady = false;

function pickPortugueseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "pt-BR") ??
    voices.find((v) => v.lang.startsWith("pt")) ??
    null
  );
}

export function initVoiceEngine(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const load = () => {
    voicesReady = window.speechSynthesis.getVoices().length > 0;
  };

  load();
  window.speechSynthesis.addEventListener("voiceschanged", load);
}

export function isVoiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isVoiceEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(VOICE_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
}

export function setVoiceEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_STORAGE_KEY, String(enabled));
  if (!enabled) {
    window.speechSynthesis?.cancel();
  }
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
}

export function speakText(text: string): void {
  if (!isVoiceSupported() || !isVoiceEnabled()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.92;
  utterance.pitch = 1;

  const voice = pickPortugueseVoice();
  if (voice) utterance.voice = voice;

  if (!voicesReady) {
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        const ptVoice = pickPortugueseVoice();
        if (ptVoice) utterance.voice = ptVoice;
        window.speechSynthesis.speak(utterance);
      },
      { once: true }
    );
  }

  window.speechSynthesis.speak(utterance);
}

export function buildMaterialAnnouncement(material: MaterialType): string {
  const info = getWasteInfo(material);
  if (!info) return "";

  return `${info.voiceLabel}. ${info.voiceBinName}. ${info.hygieneTip}`;
}

const lastSpoken = { material: "" as MaterialType | "", at: 0 };

export function speakMaterialFeedback(material: MaterialType): void {
  if (!isVoiceEnabled()) return;

  const now = Date.now();
  if (lastSpoken.material === material && now - lastSpoken.at < 4500) {
    return;
  }

  lastSpoken.material = material;
  lastSpoken.at = now;

  speakText(buildMaterialAnnouncement(material));
}

export function repeatMaterialFeedback(material: MaterialType): void {
  lastSpoken.material = "";
  speakMaterialFeedback(material);
}
