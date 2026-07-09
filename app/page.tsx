"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import Dashboard from "@/components/Dashboard";
import { LivePrediction } from "@/types/detection";
import { isTeachableMachineConfigured } from "@/lib/modelConfig";

const AutoScanner = dynamic(() => import("@/components/AutoScanner"), {
  ssr: false,
  loading: () => (
    <div className="glass-panel flex min-h-[420px] items-center justify-center rounded-2xl p-6">
      <p className="text-neon animate-pulse">Carregando scanner...</p>
    </div>
  ),
});

const CREATORS = [
  "Samuel Costa Nunes",
  "Daniel da Silva Machado",
  "João Rafael Vieira de Souza",
];

const useAiModel = isTeachableMachineConfigured();

export default function HomePage() {
  const [livePrediction, setLivePrediction] = useState<LivePrediction | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDetectionSaved = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-3 py-5 sm:gap-6 sm:px-4 sm:py-8 md:px-6">
      <header className="glass-panel overflow-hidden rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-[10px] uppercase tracking-[0.35em] text-neon/70 sm:text-xs">
              Feira de Ciências 2026 · Turma 91
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-widest text-emerald-100/50 sm:text-sm">
              Inteligência Artificial com Reciclagem
            </p>
            <h1 className="neon-text mt-2 font-[family-name:var(--font-orbitron)] text-2xl font-bold text-neon sm:text-3xl md:text-4xl">
              EcoScan AI
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100/75 md:text-base">
              Sistema de visão computacional que identifica resíduos em tempo real
              e indica a lixeira correta — contribuindo para um futuro mais
              sustentável.
            </p>
          </div>

          <div className="rounded-xl border border-neon/20 bg-black/30 p-4 text-center md:min-w-[220px] md:text-left">
            <p className="text-[10px] uppercase tracking-wider text-neon/60">
              Criadores
            </p>
            <ul className="mt-2 space-y-1 text-xs text-emerald-100/80 sm:text-sm">
              {CREATORS.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
          <span className="rounded-full border border-neon/30 bg-neon/10 px-3 py-1 text-xs text-neon">
            {useAiModel ? "IA Teachable Machine" : "Detecção automática"}
          </span>
          <span className="rounded-full border border-sky-400/30 bg-sky-950/20 px-3 py-1 text-xs text-sky-200">
            Notebook e celular
          </span>
          <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs text-yellow-200">
            Lixeira Amarela
          </span>
          <span className="rounded-full border border-amber-700/30 bg-amber-900/20 px-3 py-1 text-xs text-amber-200">
            Lixeira Marrom
          </span>
          <span className="rounded-full border border-gray-400/30 bg-gray-500/10 px-3 py-1 text-xs text-gray-300">
            Lixeira Cinza
          </span>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <AutoScanner
          onPredictionChange={setLivePrediction}
          onDetectionSaved={handleDetectionSaved}
        />

        <Dashboard
          livePrediction={livePrediction}
          refreshKey={refreshKey}
          onReset={() => setRefreshKey((value) => value + 1)}
        />
      </div>

      <footer className="glass-panel space-y-3 rounded-xl p-5 text-xs text-emerald-100/55 sm:text-sm">
        <div>
          <strong className="text-neon/80">Como funciona:</strong> aponte a
          câmera para o resíduo → a IA detecta o material → o sistema mostra em
          qual lixeira descartar e confirma o descarte correto.
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 leading-relaxed">
          <strong className="text-emerald-100/70">Termos:</strong> este projeto
          foi desenvolvido exclusivamente para fins educacionais e demonstração na
          Feira de Ciências. Não se destina a uso comercial ou pessoal. O objetivo
          é demonstrar o impacto da inteligência artificial na ciência e na
          conscientização ambiental sobre reciclagem.
        </div>
        <p className="text-center text-emerald-100/40">
          Esperamos que gostem do nosso trabalho.
        </p>
      </footer>
    </main>
  );
}
