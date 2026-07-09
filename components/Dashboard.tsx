"use client";

import { useCallback, useEffect, useState } from "react";
import BinResult from "@/components/BinResult";
import { BIN_META, BinKey } from "@/lib/binStats";
import { WASTE_INFO } from "@/lib/wasteRules";
import {
  DetectionsSummary,
  LivePrediction,
  MATERIALS,
} from "@/types/detection";

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
        recent: [],
        byBin: { amarela: 0, marrom: 0, cinza: 0 },
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
  const byBin = stats?.byBin ?? { amarela: 0, marrom: 0, cinza: 0 };
  const maxBin = Math.max(byBin.amarela, byBin.marrom, byBin.cinza, 1);

  return (
    <section className="card-elevated flex h-full min-h-[520px] flex-col rounded-3xl p-4 sm:p-5 lg:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon/15 text-sm">
              📊
            </span>
            <h2 className="section-title">Painel ao Vivo</h2>
          </div>
          <p className="mt-1.5 text-xs text-emerald-100/55 sm:text-sm">
            Estatísticas e lixeiras
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting || loading}
            className="rounded-full border border-red-400/25 px-3 py-1.5 text-[10px] text-red-200 transition hover:bg-red-950/30 disabled:opacity-40 sm:text-xs"
          >
            {resetting ? "..." : "Zerar"}
          </button>
          <span className="rounded-full border border-neon/30 bg-neon/10 px-2.5 py-1 text-[10px] font-semibold text-neon sm:text-xs">
            LIVE
          </span>
        </div>
      </div>

      {livePrediction && livePrediction.material && (
        <div className="mb-4 animate-fade-in">
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
          icon="♻️"
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
          icon="🎯"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/35 bg-red-950/25 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-5 space-y-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-100/45">
          Por lixeira
        </p>
        {(Object.keys(BIN_META) as BinKey[]).map((key) => {
          const meta = BIN_META[key];
          const count = byBin[key];
          const width = `${Math.max((count / maxBin) * 100, count > 0 ? 10 : 0)}%`;

          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-emerald-50">
                  {meta.emoji} {meta.label}
                </span>
                <span className="font-[family-name:var(--font-orbitron)] text-neon">
                  {loading ? "..." : count}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-black/45">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width, backgroundColor: meta.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-100/45">
          Por material
        </p>
        {MATERIALS.map((material) => {
          const item = stats?.totals.find((entry) => entry.material === material);
          const count = item?.count ?? 0;
          const info = WASTE_INFO[material];
          if (count === 0 && !loading) return null;
          const width = `${Math.max((count / maxCount) * 100, count > 0 ? 8 : 0)}%`;

          return (
            <div key={material}>
              <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-emerald-100/80">
                  {info.emoji} {info.label}
                </span>
                <span className="font-[family-name:var(--font-orbitron)] text-neon/90">
                  {loading ? "..." : count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width, backgroundColor: info.binColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {stats?.recent && stats.recent.length > 0 && (
        <div className="mt-5 border-t border-white/8 pt-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-emerald-100/45">
            Últimas detecções
          </p>
          <ul className="max-h-32 space-y-1.5 overflow-y-auto">
            {stats.recent.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-black/25 px-3 py-2 text-xs"
              >
                <span className="text-emerald-100/75">
                  {WASTE_INFO[item.material].emoji}{" "}
                  {WASTE_INFO[item.material].label}
                </span>
                <span className="tabular-nums text-emerald-100/45">
                  {(item.confidence * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats?.lastDetection && (
        <p className="mt-4 text-[10px] text-emerald-100/40">
          Último registro:{" "}
          {new Date(stats.lastDetection.timestamp).toLocaleString("pt-BR")}
        </p>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-neon/12 bg-black/30 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-[10px] uppercase tracking-wider text-emerald-100/45 sm:text-xs">
          {label}
        </p>
      </div>
      <p className="mt-2 font-[family-name:var(--font-orbitron)] text-xl text-neon sm:text-2xl">
        {value}
      </p>
    </div>
  );
}
