import { countByBin } from "@/lib/binStats";
import {
  DetectionsSummary,
  MATERIALS,
  MaterialType,
  RecentDetection,
} from "@/types/detection";

interface MemoryRecord {
  id: string;
  material: MaterialType;
  confidence: number;
  timestamp: Date;
}

const records: MemoryRecord[] = [];
const MAX_RECENT = 12;

export function isMemoryMode(): boolean {
  return !process.env.MONGODB_URI?.trim();
}

export function memoryAdd(material: MaterialType, confidence: number) {
  records.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    material,
    confidence,
    timestamp: new Date(),
  });
}

function buildRecent(): RecentDetection[] {
  return records
    .slice(-MAX_RECENT)
    .reverse()
    .map((item) => ({
      id: item.id,
      material: item.material,
      confidence: item.confidence,
      timestamp: item.timestamp.toISOString(),
    }));
}

export function memoryGetSummary(): DetectionsSummary {
  const totals = MATERIALS.map((material) => ({
    material,
    count: records.filter((item) => item.material === material).length,
  }));

  const last = records.length > 0 ? records[records.length - 1] : null;

  return {
    totals,
    totalDetections: records.length,
    lastDetection: last
      ? {
          material: last.material,
          confidence: last.confidence,
          timestamp: last.timestamp.toISOString(),
        }
      : null,
    recent: buildRecent(),
    byBin: countByBin(totals),
  };
}

export function memoryReset() {
  records.length = 0;
}
