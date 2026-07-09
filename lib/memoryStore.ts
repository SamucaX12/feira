import { DetectionsSummary, MATERIALS, MaterialType } from "@/types/detection";

interface MemoryRecord {
  id: string;
  material: MaterialType;
  confidence: number;
  timestamp: Date;
}

const records: MemoryRecord[] = [];

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
  };
}

export function memoryReset() {
  records.length = 0;
}
