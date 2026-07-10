import { MaterialType } from "@/types/detection";

export interface ColorSample {
  r: number;
  g: number;
  b: number;
}

export interface FrameColorAnalysis {
  material: MaterialType | null;
  confidence: number;
  scores: Partial<Record<MaterialType, number>>;
  features: {
    grayDiff: number;
    saturation: number;
    value: number;
    hue: number;
    maxSaturation: number;
    colorfulRatio: number;
    blueGreenRatio: number;
  };
}

interface ClassificationResult {
  material: MaterialType;
  confidence: number;
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

function sampleFramePixels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const sx = Math.floor(width * 0.2);
  const sy = Math.floor(height * 0.2);
  const sw = Math.floor(width * 0.6);
  const sh = Math.floor(height * 0.6);

  const data = ctx.getImageData(sx, sy, sw, sh).data;

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  let maxSaturation = 0;
  let colorfulPixels = 0;
  let blueGreenPixels = 0;

  for (let i = 0; i < data.length; i += 12) {
    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];
    r += pr;
    g += pg;
    b += pb;
    count++;

    const { h, s } = rgbToHsv(pr, pg, pb);
    maxSaturation = Math.max(maxSaturation, s);
    if (s > 0.22) colorfulPixels++;
    if ((h >= 70 && h <= 200 && s > 0.18) || (h >= 200 && h <= 260 && s > 0.15)) {
      blueGreenPixels++;
    }
  }

  const avg = {
    r: r / count,
    g: g / count,
    b: b / count,
  };

  const { h, s, v } = rgbToHsv(avg.r, avg.g, avg.b);
  const grayDiff = Math.max(
    Math.abs(avg.r - avg.g),
    Math.abs(avg.g - avg.b),
    Math.abs(avg.r - avg.b)
  );

  return {
    avg,
    h,
    s,
    v,
    grayDiff,
    maxSaturation,
    colorfulRatio: colorfulPixels / count,
    blueGreenRatio: blueGreenPixels / count,
  };
}

function scoreFromFeatures(features: ReturnType<typeof sampleFramePixels>) {
  const { h, s, v, grayDiff, maxSaturation, colorfulRatio, blueGreenRatio, avg } =
    features;

  const scores: Partial<Record<MaterialType, number>> = {};

  // PET — plástico transparente, colorido (rótulo azul/verde), garrafa
  if (h >= 170 && h <= 250 && s > 0.12) {
    scores.PET = 0.55 + s * 0.35;
  }
  if (s < 0.2 && v > 0.4 && (avg.b > avg.r + 4 || avg.g > avg.r + 3)) {
    scores.PET = (scores.PET ?? 0) + 0.45;
  }
  if (colorfulRatio > 0.06 || blueGreenRatio > 0.05) {
    scores.PET = (scores.PET ?? 0) + 0.35 + colorfulRatio;
  }
  if (maxSaturation > 0.28 && blueGreenRatio > 0.04) {
    scores.PET = (scores.PET ?? 0) + 0.4;
  }

  // Alumínio — metal prateado uniforme, pouca cor
  const looksMetallic =
    grayDiff < 20 && v > 0.5 && s < 0.09 && colorfulRatio < 0.04;
  if (looksMetallic) {
    scores.Aluminio = 0.72 + (v - 0.5) * 0.25;
  }

  // Penaliza alumínio em objetos coloridos (garrafa PET com rótulo)
  if (scores.Aluminio && (colorfulRatio > 0.05 || maxSaturation > 0.25)) {
    scores.Aluminio *= 0.25;
  }
  if (scores.Aluminio && (avg.b > avg.r + 6 || avg.g > avg.r + 5)) {
    scores.Aluminio *= 0.3;
  }

  // Lata — metal escuro
  if (grayDiff < 28 && v >= 0.12 && v <= 0.48 && s < 0.14 && colorfulRatio < 0.06) {
    scores.Lata = 0.55 + (0.45 - v) * 0.4;
  }

  // Papel
  if (s < 0.22 && v > 0.62 && avg.r > 175 && avg.g > 165 && grayDiff > 8) {
    scores.Papel = 0.55 + (v - 0.5);
  }

  // Papelão
  if (h >= 18 && h <= 48 && s >= 0.18 && s <= 0.58 && v >= 0.22 && v <= 0.72) {
    scores.Papelao = 0.5 + s * 0.35;
  }

  if (scores.Papel && grayDiff < 18 && v > 0.5) scores.Papel *= 0.6;

  // Pedra
  if (grayDiff < 20 && v < 0.35 && s < 0.1) scores.Pedra = 0.6;

  // Orgânico
  if ((h >= 50 && h <= 140 && s > 0.25) || (h >= 30 && h <= 70 && s > 0.35)) {
    scores.Organico = 0.45 + s * 0.45;
  }
  if (avg.g > avg.r + 15 && avg.g > avg.b + 10 && s > 0.2) {
    scores.Organico = (scores.Organico ?? 0) + 0.35;
  }

  return scores;
}

export function analyzeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): FrameColorAnalysis | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  canvas.width = 160;
  canvas.height = 120;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const features = sampleFramePixels(ctx, canvas.width, canvas.height);
  const scores = scoreFromFeatures(features);

  const ranked = Object.entries(scores)
    .map(([material, score]) => ({
      material: material as MaterialType,
      confidence: Math.min(score, 0.96),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const top = ranked[0];
  const material = top && top.confidence >= 0.48 ? top.material : null;
  const confidence = top?.confidence ?? 0;

  return {
    material,
    confidence,
    scores,
    features: {
      grayDiff: features.grayDiff,
      saturation: features.s,
      value: features.v,
      hue: features.h,
      maxSaturation: features.maxSaturation,
      colorfulRatio: features.colorfulRatio,
      blueGreenRatio: features.blueGreenRatio,
    },
  };
}

export function classifyFromVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): ClassificationResult | null {
  const analysis = analyzeVideoFrame(video, canvas);
  if (!analysis?.material) return null;
  return { material: analysis.material, confidence: analysis.confidence };
}
