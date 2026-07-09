import { MaterialType } from "@/types/detection";
import { normalizeMaterial } from "@/lib/wasteRules";

export interface RawPrediction {
  className: string;
  probability: number;
}

export interface ResolvedPrediction {
  material: MaterialType | null;
  confidence: number;
  rawLabel: string;
  topCandidates: Array<{ material: MaterialType; confidence: number; label: string }>;
  isAmbiguous: boolean;
  ambiguityHint: string | null;
  readyToConfirm: boolean;
}

const CONFUSION_GROUPS: MaterialType[][] = [
  ["Aluminio", "Lata"],
  ["Papel", "Papelao"],
  ["Aluminio", "Papel"],
  ["Lata", "Papel"],
];

const CONFIRM_THRESHOLDS: Partial<Record<MaterialType, number>> = {
  Aluminio: 0.62,
  Lata: 0.62,
  Papel: 0.55,
  Papelao: 0.55,
  PET: 0.5,
  Pedra: 0.5,
  Organico: 0.5,
};

const MARGIN_THRESHOLDS: Partial<Record<MaterialType, number>> = {
  Aluminio: 0.14,
  Lata: 0.14,
  Papel: 0.1,
  Papelao: 0.1,
};

function isConfusedPair(a: MaterialType, b: MaterialType): boolean {
  return CONFUSION_GROUPS.some(
    (group) => group.includes(a) && group.includes(b)
  );
}

function getConfirmThreshold(material: MaterialType): number {
  return CONFIRM_THRESHOLDS[material] ?? 0.5;
}

function getMarginThreshold(material: MaterialType): number {
  return MARGIN_THRESHOLDS[material] ?? 0.08;
}

export function resolvePrediction(
  predictions: RawPrediction[]
): ResolvedPrediction {
  const ranked = predictions
    .map((item) => {
      const material = normalizeMaterial(item.className);
      return {
        material,
        confidence: item.probability,
        label: item.className,
      };
    })
    .filter(
      (
        item
      ): item is {
        material: MaterialType;
        confidence: number;
        label: string;
      } => item.material !== null
    )
    .sort((a, b) => b.confidence - a.confidence);

  const topCandidates = ranked.slice(0, 3);

  if (ranked.length === 0) {
    return {
      material: null,
      confidence: 0,
      rawLabel: "",
      topCandidates: [],
      isAmbiguous: false,
      ambiguityHint: null,
      readyToConfirm: false,
    };
  }

  const top = ranked[0];
  const second = ranked[1];
  const margin = second ? top.confidence - second.confidence : top.confidence;

  let isAmbiguous = false;
  let ambiguityHint: string | null = null;

  if (second && isConfusedPair(top.material, second.material) && margin < 0.18) {
    isAmbiguous = true;
    if (
      (top.material === "Aluminio" || top.material === "Lata") &&
      (second.material === "Aluminio" || second.material === "Lata")
    ) {
      ambiguityHint =
        "Aproxime a latinha — alumínio brilha mais, lata de aço é mais escura.";
    } else if (
      top.material === "Papel" ||
      top.material === "Papelao" ||
      second.material === "Papel" ||
      second.material === "Papelao"
    ) {
      ambiguityHint = "Mostre só o papel ou papelão, com fundo limpo.";
    } else {
      ambiguityHint = "Segure firme e melhore a luz.";
    }
  }

  const readyToConfirm =
    top.confidence >= getConfirmThreshold(top.material) &&
    margin >= getMarginThreshold(top.material) &&
    !isAmbiguous;

  return {
    material: top.material,
    confidence: top.confidence,
    rawLabel: top.label,
    topCandidates,
    isAmbiguous,
    ambiguityHint,
    readyToConfirm,
  };
}

const VOTE_WINDOW = 10;
const VOTE_MIN_AGREE = 6;

export class TemporalVoteTracker {
  private buffer: Array<{ material: MaterialType; confidence: number }> = [];

  reset() {
    this.buffer = [];
  }

  push(material: MaterialType, confidence: number) {
    this.buffer.push({ material, confidence });
    if (this.buffer.length > VOTE_WINDOW) {
      this.buffer.shift();
    }
  }

  getConsensus(): { material: MaterialType; confidence: number } | null {
    if (this.buffer.length < 4) return null;

    const counts = new Map<MaterialType, { count: number; sum: number }>();

    for (const item of this.buffer) {
      const entry = counts.get(item.material) ?? { count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += item.confidence;
      counts.set(item.material, entry);
    }

    let best: { material: MaterialType; count: number; avg: number } | null =
      null;

    for (const [material, data] of counts) {
      const avg = data.sum / data.count;
      if (
        !best ||
        data.count > best.count ||
        (data.count === best.count && avg > best.avg)
      ) {
        best = { material, count: data.count, avg };
      }
    }

    if (!best || best.count < VOTE_MIN_AGREE) return null;

    return { material: best.material, confidence: best.avg };
  }
}
