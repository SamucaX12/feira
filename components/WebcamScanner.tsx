"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LivePrediction } from "@/types/detection";

import { getTeachableMachineModelUrl } from "@/lib/modelConfig";

const CONFIDENCE_THRESHOLD = 0.9;
const STABLE_MS = 2000;
const POST_COOLDOWN_MS = 5000;

const TFJS_CDN =
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const TM_IMAGE_CDN =
  "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js";

interface TmImageModule {
  load: (
    modelURL: string,
    metadataURL: string
  ) => Promise<{
    predict: (element: HTMLVideoElement) => Promise<
      Array<{ className: string; probability: number }>
    >;
  }>;
  Webcam: new (
    width: number,
    height: number,
    flip: boolean
  ) => {
    setup: () => Promise<void>;
    play: () => Promise<void>;
    stop: () => void;
    canvas: HTMLCanvasElement;
  };
}

interface WebcamScannerProps {
  onPredictionChange: (prediction: LivePrediction | null) => void;
  onDetectionSaved: () => void;
}

interface StableTrack {
  label: string;
  confidence: number;
  since: number;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadTmImage(): Promise<TmImageModule> {
  await loadScript(TFJS_CDN);
  await loadScript(TM_IMAGE_CDN);

  const tmImage = (window as Window & { tmImage?: TmImageModule }).tmImage;
  if (!tmImage) {
    throw new Error("Biblioteca Teachable Machine não disponível no navegador.");
  }

  return tmImage;
}

export default function WebcamScanner({
  onPredictionChange,
  onDetectionSaved,
}: WebcamScannerProps) {
  const webcamRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<Awaited<ReturnType<TmImageModule["load"]>> | null>(
    null
  );
  const loopRef = useRef<number | null>(null);
  const stableRef = useRef<StableTrack | null>(null);
  const lastSavedRef = useRef<{ label: string; at: number } | null>(null);
  const savingRef = useRef(false);

  const [status, setStatus] = useState("Inicializando câmera e modelo...");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDetection = useCallback(
    async (material: string, confidence: number) => {
      if (savingRef.current) return;

      const now = Date.now();
      const last = lastSavedRef.current;
      if (last && last.label === material && now - last.at < POST_COOLDOWN_MS) {
        return;
      }

      savingRef.current = true;
      try {
        const response = await fetch("/api/detections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ material, confidence }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Falha ao salvar detecção.");
        }

        lastSavedRef.current = { label: material, at: now };
        stableRef.current = null;
        setStatus(`Registrado: ${material} (${(confidence * 100).toFixed(1)}%)`);
        onDetectionSaved();
      } catch (saveError) {
        console.error(saveError);
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Erro ao salvar no MongoDB."
        );
      } finally {
        savingRef.current = false;
      }
    },
    [onDetectionSaved]
  );

  const runPredictionLoop = useCallback(async () => {
    const model = modelRef.current;
    const webcamEl = webcamRef.current?.querySelector("video") as
      | HTMLVideoElement
      | undefined;

    if (!model || !webcamEl) return;

    const prediction = await model.predict(webcamEl);
    const top = prediction.reduce((best, current) =>
      current.probability > best.probability ? current : best
    );

    onPredictionChange({
      material: top.className,
      confidence: top.probability,
    });

    const now = Date.now();

    if (top.probability >= CONFIDENCE_THRESHOLD) {
      const current = stableRef.current;

      if (current && current.label === top.className) {
        const elapsed = now - current.since;
        setStatus(
          `Confirmando ${top.className}... ${Math.min(
            100,
            Math.round((elapsed / STABLE_MS) * 100)
          )}%`
        );

        if (elapsed >= STABLE_MS) {
          await saveDetection(top.className, top.probability);
        }
      } else {
        stableRef.current = {
          label: top.className,
          confidence: top.probability,
          since: now,
        };
        setStatus(`Analisando ${top.className}...`);
      }
    } else {
      stableRef.current = null;
      setStatus(`Aguardando objeto (${(top.probability * 100).toFixed(1)}%)`);
    }

    loopRef.current = window.setTimeout(() => {
      void runPredictionLoop();
    }, 250);
  }, [onPredictionChange, saveDetection]);

  useEffect(() => {
    let mounted = true;
    let webcam: InstanceType<TmImageModule["Webcam"]> | null = null;

    async function bootstrap() {
      try {
        const modelBaseUrl = getTeachableMachineModelUrl();
        if (!modelBaseUrl) {
          throw new Error("NEXT_PUBLIC_TM_MODEL_URL não configurada.");
        }

        setStatus("Carregando TensorFlow.js e Teachable Machine...");
        const tmImage = await loadTmImage();

        setStatus("Carregando modelo...");
        const modelURL = `${modelBaseUrl.replace(/\/?$/, "/")}model.json`;
        const metadataURL = `${modelBaseUrl.replace(/\/?$/, "/")}metadata.json`;
        const model = await tmImage.load(modelURL, metadataURL);
        if (!mounted) return;

        modelRef.current = model;
        setStatus("Solicitando acesso à webcam...");

        webcam = new tmImage.Webcam(640, 480, true);

        if (!webcamRef.current) return;
        await webcam.setup();
        await webcam.play();
        webcamRef.current.innerHTML = "";
        webcamRef.current.appendChild(webcam.canvas);

        if (!mounted) return;

        setIsReady(true);
        setStatus("Scanner ativo — aponte um resíduo para a câmera");
        void runPredictionLoop();
      } catch (bootError) {
        console.error(bootError);
        if (mounted) {
          setError(
            bootError instanceof Error
              ? bootError.message
              : "Falha ao iniciar webcam/modelo."
          );
          setStatus("Erro na inicialização");
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
      if (loopRef.current) {
        clearTimeout(loopRef.current);
      }
      webcam?.stop();
      modelRef.current = null;
    };
  }, [runPredictionLoop]);

  return (
    <section className="glass-panel relative overflow-hidden rounded-2xl p-5 shadow-neon-sm md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-orbitron)] text-xl font-semibold text-neon">
            Scanner IA
          </h2>
          <p className="mt-1 text-sm text-emerald-100/60">
            Webcam + TensorFlow.js (Teachable Machine)
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            isReady
              ? "border border-neon/40 text-neon"
              : "border border-yellow-400/30 text-yellow-200"
          }`}
        >
          {isReady ? "ONLINE" : "BOOT"}
        </span>
      </div>

      <div className="scan-grid relative overflow-hidden rounded-xl border border-neon/20 bg-black/50">
        <div ref={webcamRef} className="relative min-h-[360px] w-full" />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-4 rounded-xl border border-neon/30" />
          <div className="absolute left-4 right-4 h-0.5 animate-scan bg-neon shadow-neon" />
          <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-neon/80">
            TF.js · debounce 2s · conf &gt; 90%
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm text-emerald-100/80">{status}</p>
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <p className="text-xs text-emerald-100/45">
          Modelo:{" "}
          <code className="break-all text-neon/70">
            {getTeachableMachineModelUrl()}
          </code>
        </p>
      </div>
    </section>
  );
}
