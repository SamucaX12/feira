import { MATERIALS, MaterialType } from "@/types/detection";

export interface WasteInfo {
  label: string;
  emoji: string;
  binName: string;
  binColor: string;
  binRing: string;
  instruction: string;
  successMessage: string;
  examples: string;
  hygieneTip: string;
  voiceLabel: string;
  voiceBinName: string;
}

export const WASTE_INFO: Record<MaterialType, WasteInfo> = {
  PET: {
    label: "Garrafa PET / Plástico",
    emoji: "🥤",
    binName: "Lixeira Amarela — Reciclável",
    binColor: "#FACC15",
    binRing: "border-yellow-400",
    instruction: "Esvazie, enxágue e amasse a garrafa antes de descartar.",
    successMessage: "Correto! PET vai para a lixeira amarela (reciclável).",
    examples: "Garrafa d'água, refrigerante, suco",
    hygieneTip:
      "Lembre-se de esvaziar e lavar a embalagem antes de descartar — isso melhora a qualidade do material reciclado.",
    voiceLabel: "Plástico PET detectado",
    voiceBinName: "Jogue na lixeira amarela, reciclável",
  },
  Papel: {
    label: "Papel",
    emoji: "📄",
    binName: "Lixeira Amarela — Reciclável",
    binColor: "#FACC15",
    binRing: "border-yellow-400",
    instruction: "Descarte seco, sem gordura ou sujeira.",
    successMessage: "Correto! Papel vai para a lixeira amarela (reciclável).",
    examples: "Folha sulfite, jornal, revista",
    hygieneTip:
      "Mantenha o papel seco e limpo. Papel sujo ou com gordura não pode ser reciclado.",
    voiceLabel: "Papel detectado",
    voiceBinName: "Jogue na lixeira amarela, reciclável",
  },
  Papelao: {
    label: "Papelão",
    emoji: "📦",
    binName: "Lixeira Amarela — Reciclável",
    binColor: "#FACC15",
    binRing: "border-yellow-400",
    instruction: "Desmonte a caixa e deixe seca antes de descartar.",
    successMessage: "Correto! Papelão vai para a lixeira amarela (reciclável).",
    examples: "Caixa de delivery, embalagem",
    hygieneTip:
      "Desmonte a caixa e remova fita ou restos de comida. Papelão limpo recicla melhor.",
    voiceLabel: "Papelão detectado",
    voiceBinName: "Jogue na lixeira amarela, reciclável",
  },
  Lata: {
    label: "Lata (aço/ferro)",
    emoji: "🥫",
    binName: "Lixeira Amarela — Reciclável",
    binColor: "#FACC15",
    binRing: "border-yellow-400",
    instruction: "Esvazie e enxágue a lata antes de descartar.",
    successMessage: "Correto! Lata vai para a lixeira amarela (reciclável).",
    examples: "Lata de milho, sardinha, tinta",
    hygieneTip:
      "Lembre-se de esvaziar e lavar a lata antes de descartar — embalagem limpa vale mais na reciclagem.",
    voiceLabel: "Lata detectada",
    voiceBinName: "Jogue na lixeira amarela, reciclável",
  },
  Aluminio: {
    label: "Alumínio",
    emoji: "🧃",
    binName: "Lixeira Amarela — Reciclável",
    binColor: "#FACC15",
    binRing: "border-yellow-400",
    instruction: "Esvazie e amasse a embalagem de alumínio.",
    successMessage: "Correto! Alumínio vai para a lixeira amarela (reciclável).",
    examples: "Latinha, tampa, papel-alumínio",
    hygieneTip:
      "Lembre-se de enxaguar a latinha antes de descartar. Alumínio limpo é reciclado com mais qualidade.",
    voiceLabel: "Alumínio detectado",
    voiceBinName: "Jogue na lixeira amarela, reciclável",
  },
  Pedra: {
    label: "Pedra / Rejeito",
    emoji: "🪨",
    binName: "Lixeira Cinza — Rejeito",
    binColor: "#9CA3AF",
    binRing: "border-gray-400",
    instruction: "Não é reciclável. Descarte no lixo comum (rejeito).",
    successMessage: "Correto! Pedra e rejeito vão para a lixeira cinza.",
    examples: "Pedra, cerâmica quebrada, espelho",
    hygieneTip:
      "Este material não é reciclável. Descarte com cuidado na lixeira cinza, rejeito.",
    voiceLabel: "Pedra ou rejeito detectado",
    voiceBinName: "Jogue na lixeira cinza, rejeito",
  },
  Organico: {
    label: "Orgânico",
    emoji: "🍌",
    binName: "Lixeira Marrom — Orgânico",
    binColor: "#92400E",
    binRing: "border-amber-700",
    instruction: "Descarte restos de comida e matéria orgânica.",
    successMessage: "Correto! Orgânico vai para a lixeira marrom.",
    examples: "Casca de banana, restos de comida, folhas",
    hygieneTip:
      "Retire embalagens antes de descartar restos de comida. Orgânico vai na lixeira marrom.",
    voiceLabel: "Orgânico detectado",
    voiceBinName: "Jogue na lixeira marrom, orgânico",
  },
};

const ALIASES: Record<string, MaterialType> = {
  pet: "PET",
  plastico: "PET",
  plástico: "PET",
  garrafa: "PET",
  garrafapet: "PET",
  garrafa_pet: "PET",
  bottle: "PET",
  papel: "Papel",
  paper: "Papel",
  papelao: "Papelao",
  papelão: "Papelao",
  cardboard: "Papelao",
  caixa: "Papelao",
  lata: "Lata",
  can: "Lata",
  metal: "Lata",
  aluminio: "Aluminio",
  alumínio: "Aluminio",
  aluminum: "Aluminio",
  latinha: "Aluminio",
  pedra: "Pedra",
  stone: "Pedra",
  rock: "Pedra",
  rejeito: "Pedra",
  organico: "Organico",
  orgânico: "Organico",
  organic: "Organico",
  comida: "Organico",
  fruta: "Organico",
};

export function normalizeMaterial(raw: string): MaterialType | null {
  const trimmed = raw.trim();
  if (MATERIALS.includes(trimmed as MaterialType)) {
    return trimmed as MaterialType;
  }

  const key = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  return ALIASES[key] ?? null;
}

export function getWasteInfo(material: MaterialType | string): WasteInfo | null {
  const normalized =
    typeof material === "string" ? normalizeMaterial(material) : material;
  if (!normalized) return null;
  return WASTE_INFO[normalized];
}
