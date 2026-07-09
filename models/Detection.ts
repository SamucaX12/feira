import mongoose, { Schema, models, model } from "mongoose";
import { MATERIALS, type MaterialType } from "@/types/detection";

export interface IDetection {
  material: MaterialType;
  confidence: number;
  timestamp: Date;
}

const DetectionSchema = new Schema<IDetection>(
  {
    material: {
      type: String,
      required: true,
      enum: MATERIALS,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

DetectionSchema.index({ timestamp: -1 });
DetectionSchema.index({ material: 1 });

export const Detection =
  models.Detection || model<IDetection>("Detection", DetectionSchema);
