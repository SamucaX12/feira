import { MaterialType } from "@/types/detection";
import { WASTE_INFO } from "@/lib/wasteRules";

export type BinKey = "amarela" | "marrom" | "cinza";

export const BIN_META: Record<
  BinKey,
  { label: string; subtitle: string; color: string; emoji: string }
> = {
  amarela: {
    label: "Lixeira Amarela",
    subtitle: "Reciclável",
    color: "#FACC15",
    emoji: "🟡",
  },
  marrom: {
    label: "Lixeira Marrom",
    subtitle: "Orgânico",
    color: "#92400E",
    emoji: "🟤",
  },
  cinza: {
    label: "Lixeira Cinza",
    subtitle: "Rejeito",
    color: "#9CA3AF",
    emoji: "⚪",
  },
};

export function materialToBin(material: MaterialType): BinKey {
  const info = WASTE_INFO[material];
  if (info.binName.includes("Marrom")) return "marrom";
  if (info.binName.includes("Cinza")) return "cinza";
  return "amarela";
}

export function countByBin(
  totals: Array<{ material: MaterialType; count: number }>
): Record<BinKey, number> {
  const result: Record<BinKey, number> = {
    amarela: 0,
    marrom: 0,
    cinza: 0,
  };

  for (const item of totals) {
    result[materialToBin(item.material)] += item.count;
  }

  return result;
}
