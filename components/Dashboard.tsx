"use client";

import { useCallback, useEffect, useState } from "react";
import BinResult from "@/components/BinResult";
import {
  DetectionsSummary,
  LivePrediction,
  MATERIALS,
} from "@/types/detection";
import { WASTE_INFO } from "@/lib/wasteRules";

interface DashboardProps {
  livePrediction: LivePrediction | null;
  refreshKey: number;
  onReset?: () => void;
}

export default function Dashboard({
  livePrediction,
  refreshKey,
  onReset,
}: DashboardProps) {
  const [stats, setStats] = useState<DetectionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/detections", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar estatísticas.");
      const data = (await response.json()) as DetectionsSummary;
      setStats(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro ao carregar dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats, refreshKey]);

  const handleReset = async () => {
    if (!confirm("Zerar todas as detecções da apresentação?")) return;

    setResetting(true);
    try {
      const response = await fetch("/api/detections", { method: "DELETE" });
      if (!response.ok) throw new Error("Falha ao resetar.");
      setStats({
        totals: MATERIALS.map((material) => ({ material, count: 0 })),
        totalDetections: 0,
        lastDetection: null,
      });
      onReset?.();
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : "Erro ao resetar."
      );
    } finally {
      setResetting(false);
    }
  };

  const maxCount = Math.max(
    ...(stats?.totals.map((item) => item.count) ?? [0]),
    1
  );

  const lastMaterial = stats?.lastDetection?.material;

  return (
    <section className="glass-panel flex h-full min-h-[520px] flex-col rounded-2xl p-4 shadow-neon-sm sm:p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-orbitron)] text-xl font-semibold text-neon">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-emerald-100/60">
            Lixeiras e estatísticas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting || loading}
            className="rounded-full border border-red-400/30 px-3 py-1 text-xs text-red-200 transition hover:bg-red-950/30 disabled:opacity-40"
          >
            {resetting ? "..." : "Reset"}
          </button>
          <div className="rounded-full border border-neon/30 px-3 py-1 text-xs text-neon">
            LIVE
          </div>
        </div>
      </div>

      {livePrediction && livePrediction.material && (
        <div className="mb-4">
          <BinResult
            material={livePrediction.material}
            confidence={livePrediction.confidence}
            compact
          />
        </div>
      )}

      {lastMaterial && !livePrediction && (
        <div className="mb-4">
          <BinResult
            material={lastMaterial}
            confidence={stats?.lastDetection?.confidence ?? 0}
            saved
            compact
          />
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard
          label="Total detectado"
          value={loading ? "..." : String(stats?.totalDetections ?? 0)}
        />
        <StatCard
          label="Último material"
          value={
            loading
              ? "..."
              : lastMaterial
                ? WASTE_INFO[lastMaterial].label
                : "—"
          }
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs">
        <BinLegend color="#FACC15" label="Amarela · Reciclável" />
        <BinLegend color="#92400E" label="Marrom · Orgânico" />
        <BinLegend color="#9CA3AF" label="Cinza · Rejeito" />
      </div>

      <div className="flex-1 space-y-4">
        {MATERIALS.map((material) => {
          const item = stats?.totals.find((entry) => entry.material === material);
          const count = item?.count ?? 0;
          const info = WASTE_INFO[material];
          const width = `${Math.max((count / maxCount) * 100, count > 0 ? 8 : 0)}%`;

          return (
            <div key={material}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-emerald-50">
                  {info.emoji} {info.label}
                </span>
                <span className="font-[family-name:var(--font-orbitron)] text-neon">
                  {loading ? "..." : count}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width, backgroundColor: info.binColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {stats?.lastDetection && (
        <p className="mt-5 text-xs text-emerald-100/45">
          Último:{" "}
          {new Date(stats.lastDetection.timestamp).toLocaleString("pt-BR")} —{" "}
          {(stats.lastDetection.confidence * 100).toFixed(0)}% confiança
        </p>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neon/15 bg-black/25 p-3 sm:p-4">
      <p className="text-[10px] uppercase tracking-wider text-emerald-100/50 sm:text-xs">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-orbitron)] text-xl text-neon sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function BinLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
      <div
        className="mx-auto mb-1 h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-emerald-100/60">{label}</span>
    </div>
  );
}
