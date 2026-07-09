export const MATERIALS = [
  "PET",
  "Papel",
  "Papelao",
  "Lata",
  "Aluminio",
  "Pedra",
  "Organico",
] as const;

export type MaterialType = (typeof MATERIALS)[number];

export interface DetectionPayload {
  material: MaterialType;
  confidence: number;
}

export interface MaterialStats {
  material: MaterialType;
  count: number;
}

export interface DetectionsSummary {
  totals: MaterialStats[];
  totalDetections: number;
  lastDetection: {
    material: MaterialType;
    confidence: number;
    timestamp: string;
  } | null;
  recent?: RecentDetection[];
  byBin?: {
    amarela: number;
    marrom: number;
    cinza: number;
  };
  storage?: string;
}

export interface RecentDetection {
  id: string;
  material: MaterialType;
  confidence: number;
  timestamp: string;
}

export interface LivePrediction {
  material: MaterialType | string;
  confidence: number;
}
