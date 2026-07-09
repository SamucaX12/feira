import { MaterialType } from "@/types/detection";

interface ColorSample {
  r: number;
  g: number;
  b: number;
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

function sampleCenterRegion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ColorSample {
  const sx = Math.floor(width * 0.25);
  const sy = Math.floor(height * 0.25);
  const sw = Math.floor(width * 0.5);
  const sh = Math.floor(height * 0.5);

  const data = ctx.getImageData(sx, sy, sw, sh).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 16) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  return {
    r: r / count,
    g: g / count,
    b: b / count,
  };
}

export function classifyFromVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): ClassificationResult | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  canvas.width = 160;
  canvas.height = 120;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const { r, g, b } = sampleCenterRegion(ctx, canvas.width, canvas.height);
  const { h, s, v } = rgbToHsv(r, g, b);

  const scores: Partial<Record<MaterialType, number>> = {};

  // PET — azul/transparente/ciano
  if (h >= 170 && h <= 230) scores.PET = 0.55 + s * 0.35;
  if (s < 0.15 && v > 0.55 && b > r) scores.PET = (scores.PET ?? 0) + 0.4;

  // Alumínio — prateado brilhante (alto brilho, baixa saturação)
  const grayDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  if (grayDiff < 22 && v > 0.55 && s < 0.1) {
    scores.Aluminio = 0.7 + (v - 0.5) * 0.3;
  }

  // Lata — cinza escuro metálico (menos brilho que alumínio)
  if (grayDiff < 28 && v >= 0.12 && v <= 0.48 && s < 0.14) {
    scores.Lata = 0.55 + (0.45 - v) * 0.4;
  }

  // Papel — branco/bege claro (não metálico)
  if (s < 0.22 && v > 0.62 && r > 175 && g > 165 && grayDiff > 8) {
    scores.Papel = 0.55 + (v - 0.5);
  }

  // Papelão — marrom claro (tom quente, não prateado)
  if (h >= 18 && h <= 48 && s >= 0.18 && s <= 0.58 && v >= 0.22 && v <= 0.72) {
    scores.Papelao = 0.5 + s * 0.35;
  }

  // Penaliza papel quando parece metal
  if (scores.Papel && grayDiff < 18 && v > 0.5) {
    scores.Papel *= 0.6;
  }

  // Penaliza alumínio quando parece papel bege
  if (scores.Aluminio && s > 0.12 && r > g + 10) {
    scores.Aluminio *= 0.55;
  }

  // Pedra — cinza escuro opaco
  if (grayDiff < 20 && v < 0.35 && s < 0.1) scores.Pedra = 0.6;

  // Orgânico — verde/amarelo/marrom vivo
  if ((h >= 50 && h <= 140 && s > 0.25) || (h >= 30 && h <= 70 && s > 0.35)) {
    scores.Organico = 0.45 + s * 0.45;
  }
  if (g > r + 15 && g > b + 10 && s > 0.2) scores.Organico = (scores.Organico ?? 0) + 0.35;

  const ranked = Object.entries(scores)
    .map(([material, score]) => ({
      material: material as MaterialType,
      confidence: Math.min(score, 0.96),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  if (ranked.length === 0 || ranked[0].confidence < 0.52) return null;

  return ranked[0];
}
