import type { FrameColorAnalysis } from "@/lib/colorClassifier";
import { MaterialType } from "@/types/detection";
import type { ResolvedPrediction } from "@/lib/predictionEngine";

function petScore(analysis: FrameColorAnalysis): number {
  return analysis.scores.PET ?? 0;
}

function aluminioScore(analysis: FrameColorAnalysis): number {
  return analysis.scores.Aluminio ?? 0;
}

function looksLikePlastic(analysis: FrameColorAnalysis): boolean {
  const { colorfulRatio, maxSaturation, blueGreenRatio } = analysis.features;
  return (
    colorfulRatio > 0.05 ||
    maxSaturation > 0.22 ||
    blueGreenRatio > 0.04 ||
    petScore(analysis) >= 0.5
  );
}

function looksLikeMetal(analysis: FrameColorAnalysis): boolean {
  const { grayDiff, saturation, colorfulRatio } = analysis.features;
  return grayDiff < 18 && saturation < 0.1 && colorfulRatio < 0.04;
}

/**
 * Cruza IA Teachable Machine com análise visual para evitar PET → Alumínio.
 */
export function mergeWithVisualAnalysis(
  tm: ResolvedPrediction,
  visual: FrameColorAnalysis | null
): ResolvedPrediction {
  if (!visual || !tm.material) return tm;

  const pet = petScore(visual);
  const al = aluminioScore(visual);

  // TM diz alumínio mas visual indica plástico PET
  if (tm.material === "Aluminio" && looksLikePlastic(visual) && pet >= 0.45) {
    const petInTm = tm.topCandidates.find((c) => c.material === "PET");
    const petConfidence = petInTm
      ? Math.max(petInTm.confidence, pet * 0.85)
      : Math.max(pet * 0.9, 0.62);

    return {
      material: "PET",
      confidence: petConfidence,
      rawLabel: petInTm?.label ?? "PET (visual)",
      topCandidates: [
        { material: "PET", confidence: petConfidence, label: "PET" },
        ...tm.topCandidates.filter((c) => c.material !== "PET").slice(0, 2),
      ],
      isAmbiguous: false,
      ambiguityHint: null,
      readyToConfirm: petConfidence >= 0.55,
    };
  }

  // TM diz alumínio, visual também — mas objeto colorido: pede confirmação
  if (
    tm.material === "Aluminio" &&
    tm.confidence >= 0.7 &&
    looksLikePlastic(visual) &&
    pet > al * 0.7
  ) {
    return {
      ...tm,
      isAmbiguous: true,
      ambiguityHint:
        "Parece garrafa PET (plástico), não metal. Mostre só a garrafa com fundo limpo.",
      readyToConfirm: false,
    };
  }

  // TM sem classe PET no modelo — visual forte em PET
  if (
    tm.material === "Aluminio" &&
    !tm.topCandidates.some((c) => c.material === "PET") &&
    pet >= 0.55 &&
    !looksLikeMetal(visual)
  ) {
    return {
      material: "PET",
      confidence: Math.max(pet, 0.6),
      rawLabel: "PET (visual)",
      topCandidates: [
        { material: "PET", confidence: pet, label: "PET" },
        ...tm.topCandidates.slice(0, 2),
      ],
      isAmbiguous: false,
      ambiguityHint: null,
      readyToConfirm: pet >= 0.55,
    };
  }

  // PET no TM mas baixa confiança — reforça com visual
  if (tm.material === "PET" && pet > tm.confidence * 0.8) {
    return {
      ...tm,
      confidence: Math.min(0.96, Math.max(tm.confidence, pet * 0.85)),
      readyToConfirm:
        Math.max(tm.confidence, pet * 0.85) >= 0.5 && !tm.isAmbiguous,
    };
  }

  return tm;
}
