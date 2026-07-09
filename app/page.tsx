"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import Dashboard from "@/components/Dashboard";
import ShareQrCode from "@/components/ShareQrCode";
import { BIN_META } from "@/lib/binStats";
import { LivePrediction } from "@/types/detection";
import { isTeachableMachineConfigured } from "@/lib/modelConfig";

const AutoScanner = dynamic(() => import("@/components/AutoScanner"), {
  ssr: false,
  loading: () => (
    <div className="card-elevated flex min-h-[420px] items-center justify-center rounded-3xl p-6">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full border-2 border-neon/30 border-t-neon" />
        <p className="text-neon">Carregando scanner...</p>
      </div>
    </div>
  ),
});

const SCHOOL =
  "Escola Municipal Ensino Fundamental Professor Alcides Conter";

const CREATORS = [
  { name: "Samuel Costa Nunes", role: "Desenvolvimento & IA" },
  { name: "Daniel da Silva Machado", role: "Testes & Demonstração" },
  { name: "João Rafael Vieira de Souza", role: "Apresentação & Pesquisa" },
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
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-neon/5 to-transparent" />

      <main className="relative mx-auto flex max-w-7xl flex-col gap-5 px-3 py-5 sm:gap-6 sm:px-5 sm:py-8 lg:px-8">
        <header className="card-elevated hero-glow overflow-hidden rounded-3xl p-5 sm:p-7">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="text-center lg:max-w-2xl lg:text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neon/65 sm:text-xs">
                {SCHOOL}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-widest text-emerald-100/45 sm:text-sm">
                Inteligência Artificial com Reciclagem
              </p>
              <h1 className="neon-text mt-3 font-[family-name:var(--font-orbitron)] text-3xl font-bold text-neon sm:text-4xl lg:text-5xl">
                EcoScan AI
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-emerald-100/75 sm:text-base">
                Sistema de visão computacional que identifica resíduos em tempo
                real pela câmera e indica a lixeira correta — amarela, marrom ou
                cinza — contribuindo para um futuro mais sustentável.
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:min-w-[280px]">
              <ShareQrCode />
              <div className="rounded-2xl border border-neon/15 bg-black/35 p-4 sm:p-5">
                <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-neon/60 lg:text-left">
                  Equipe do Projeto
                </p>
                <ul className="mt-3 space-y-3">
                  {CREATORS.map((creator) => (
                    <li
                      key={creator.name}
                      className="rounded-xl border border-white/6 bg-black/25 px-3 py-2.5 text-center lg:text-left"
                    >
                      <p className="text-sm font-medium text-white">{creator.name}</p>
                      <p className="text-xs text-emerald-100/50">{creator.role}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            <span className="badge border-neon/30 bg-neon/10 text-neon">
              {useAiModel ? "IA Teachable Machine" : "Detecção visual"}
            </span>
            <span className="badge border-sky-400/30 bg-sky-950/25 text-sky-200">
              Celular & PC
            </span>
            <span className="badge border-violet-400/25 bg-violet-950/20 text-violet-200">
              ♿ Voz + Acessibilidade
            </span>
            {(Object.keys(BIN_META) as Array<keyof typeof BIN_META>).map(
              (key) => (
                <span
                  key={key}
                  className="badge border-white/10 bg-black/30 text-emerald-100/75"
                >
                  {BIN_META[key].emoji} {BIN_META[key].label}
                </span>
              )
            )}
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-5 lg:gap-6">
          <div className="lg:col-span-3">
            <AutoScanner
              onPredictionChange={setLivePrediction}
              onDetectionSaved={handleDetectionSaved}
            />
          </div>
          <div className="lg:col-span-2">
            <Dashboard
              livePrediction={livePrediction}
              refreshKey={refreshKey}
              onReset={() => setRefreshKey((value) => value + 1)}
            />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <HowStep
            step="1"
            title="Aponte a câmera"
            text="Segure o resíduo com fundo limpo e boa iluminação."
          />
          <HowStep
            step="2"
            title="IA analisa"
            text="O sistema identifica o material e mostra a confiança."
          />
          <HowStep
            step="3"
            title="Descarte certo"
            text="Siga a lixeira indicada — amarela, marrom ou cinza."
          />
        </section>

        <footer className="card-elevated space-y-4 rounded-2xl p-5 text-xs text-emerald-100/55 sm:text-sm">
          <p>
            <strong className="text-neon/80">Projeto educacional</strong> —
            desenvolvido por alunos da {SCHOOL} para demonstrar o uso da
            inteligência artificial na conscientização ambiental e na reciclagem
            correta.
          </p>
          <p className="text-center text-emerald-100/35">
            EcoScan AI · Ciência, Tecnologia e Meio Ambiente
          </p>
        </footer>
      </main>
    </div>
  );
}

function HowStep({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/25 p-4 sm:p-5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neon/15 font-[family-name:var(--font-orbitron)] text-sm font-bold text-neon">
        {step}
      </span>
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/60">{text}</p>
    </div>
  );
}
