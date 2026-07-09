import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  isMemoryMode,
  memoryAdd,
  memoryGetSummary,
  memoryReset,
} from "@/lib/memoryStore";
import { Detection, type IDetection } from "@/models/Detection";
import { MATERIALS, type MaterialType } from "@/types/detection";

function isValidMaterial(value: unknown): value is MaterialType {
  return typeof value === "string" && MATERIALS.includes(value as MaterialType);
}

async function getMongoSummary() {
  await connectDB();

  const [totalsAgg, totalDetections, lastDetection] = await Promise.all([
    Detection.aggregate<{ _id: MaterialType; count: number }>([
      { $group: { _id: "$material", count: { $sum: 1 } } },
    ]),
    Detection.countDocuments(),
    Detection.findOne().sort({ timestamp: -1 }).lean<IDetection>(),
  ]);

  const totals = MATERIALS.map((material) => {
    const found = totalsAgg.find((item) => item._id === material);
    return { material, count: found?.count ?? 0 };
  });

  return {
    totals,
    totalDetections,
    lastDetection: lastDetection
      ? {
          material: lastDetection.material,
          confidence: lastDetection.confidence,
          timestamp: lastDetection.timestamp.toISOString(),
        }
      : null,
  };
}

export async function GET() {
  try {
    if (isMemoryMode()) {
      return NextResponse.json({
        ...memoryGetSummary(),
        storage: "memory",
      });
    }

    const summary = await getMongoSummary();
    return NextResponse.json({ ...summary, storage: "mongodb" });
  } catch (error) {
    console.error("[GET /api/detections]", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { material, confidence } = body ?? {};

    if (!isValidMaterial(material)) {
      return NextResponse.json(
        { error: "Material inválido. Use: PET, Papel, Papelao, Lata, Aluminio, Pedra, Organico." },
        { status: 400 }
      );
    }

    if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
      return NextResponse.json(
        { error: "Confiança deve ser um número entre 0 e 1." },
        { status: 400 }
      );
    }

    if (isMemoryMode()) {
      memoryAdd(material, confidence);
      return NextResponse.json(
        {
          ok: true,
          storage: "memory",
          detection: {
            material,
            confidence,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    }

    await connectDB();
    const detection = await Detection.create({ material, confidence });

    return NextResponse.json(
      {
        ok: true,
        storage: "mongodb",
        detection: {
          material: detection.material,
          confidence: detection.confidence,
          timestamp: detection.timestamp.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/detections]", error);
    return NextResponse.json(
      { error: "Erro ao salvar detecção." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    if (isMemoryMode()) {
      memoryReset();
      return NextResponse.json({ ok: true, storage: "memory" });
    }

    await connectDB();
    await Detection.deleteMany({});
    return NextResponse.json({ ok: true, storage: "mongodb" });
  } catch (error) {
    console.error("[DELETE /api/detections]", error);
    return NextResponse.json(
      { error: "Erro ao resetar estatísticas." },
      { status: 500 }
    );
  }
}
