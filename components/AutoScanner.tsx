"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BinResult from "@/components/BinResult";
import PredictionBars from "@/components/PredictionBars";
import { classifyFromVideoFrame } from "@/lib/colorClassifier";
import { cameraBlockedReason, isMobileDevice } from "@/lib/device";
import {
  getTeachableMachineModelUrl,
  isTeachableMachineConfigured,
} from "@/lib/modelConfig";
import {
  resolvePrediction,
  TemporalVoteTracker,
  type ResolvedPrediction,
} from "@/lib/predictionEngine";
import { loadTmImageModule } from "@/lib/tmLoader";
import { getWasteInfo, normalizeMaterial } from "@/lib/wasteRules";
import { LivePrediction, MaterialType } from "@/types/detection";
import type { TmImageModule } from "@/types/tm";
import VoiceToggle from "@/components/VoiceToggle";
import {
  initVoiceEngine,
  speakMaterialFeedback,
} from "@/lib/voiceFeedback";

const SHOW_THRESHOLD = 0.28;
const STABLE_MS = 1400;
const POST_COOLDOWN_MS = 3500;
const SCAN_INTERVAL_MS = 280;

interface AutoScannerProps {
  onPredictionChange: (prediction: LivePrediction | null) => void;
  onDetectionSaved: () => void;
}

interface StableTrack {
  material: MaterialType;
  confidence: number;
  since: number;
}

type ScanMode = "tm" | "color" | "loading";

export default function AutoScanner({
  onPredictionChange,
  onDetectionSaved,
}: AutoScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<Awaited<ReturnType<TmImageModule["load"]>> | null>(
    null
  );
  const loopRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const stableRef = useRef<StableTrack | null>(null);
  const lastSavedRef = useRef<{ material: MaterialType; at: number } | null>(
    null
  );
  const savingRef = useRef(false);
  const voteTrackerRef = useRef(new TemporalVoteTracker());

  const tmConfigured = isTeachableMachineConfigured();
  const [scanMode, setScanMode] = useState<ScanMode>(
    tmConfigured ? "loading" : "color"
  );
  const [isMobile, setIsMobile] = useState(false);
  const [needsTap, setNeedsTap] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("Toque para ativar a câmera");
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedPrediction | null>(null);
  const [current, setCurrent] = useState<{
    material: MaterialType;
    confidence: number;
  } | null>(null);
  const [lastSaved, setLastSaved] = useState<{
    material: MaterialType;
    confidence: number;
  } | null>(null);
  const [confirmProgress, setConfirmProgress] = useState(0);

  const stopScanLoop = useCallback(() => {
    scanningRef.current = false;
    if (loopRef.current) {
      clearTimeout(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  const saveDetection = useCallback(
    async (material: MaterialType, confidence: number) => {
      if (savingRef.current) return;

      const now = Date.now();
      const last = lastSavedRef.current;
      if (last && last.material === material && now - last.at < POST_COOLDOWN_MS) {
        return;
      }

      savingRef.current = true;
      setStatus(`Registrando ${material}...`);

      try {
        const response = await fetch("/api/detections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ material, confidence }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Falha ao salvar.");
        }

        lastSavedRef.current = { material, at: now };
        stableRef.current = null;
        voteTrackerRef.current.reset();
        setConfirmProgress(0);
        setLastSaved({ material, confidence });
        setStatus("Descarte registrado com sucesso!");
        speakMaterialFeedback(material);
        onDetectionSaved();
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Erro ao salvar."
        );
      } finally {
        savingRef.current = false;
      }
    },
    [onDetectionSaved]
  );

  const processResolved = useCallback(
    async (result: ResolvedPrediction) => {
      setResolved(result);

      const material = result.material;

      if (!material || result.confidence < SHOW_THRESHOLD) {
        stableRef.current = null;
        voteTrackerRef.current.reset();
        setCurrent(null);
        setConfirmProgress(0);
        onPredictionChange(null);
        setStatus("Aponte a câmera para o resíduo com fundo limpo...");
        return;
      }

      setCurrent({ material, confidence: result.confidence });
      onPredictionChange({ material, confidence: result.confidence });

      if (result.isAmbiguous) {
        stableRef.current = null;
        voteTrackerRef.current.reset();
        setConfirmProgress(0);
        setStatus(
          result.ambiguityHint ??
            `${getWasteInfo(material)?.label} (${(result.confidence * 100).toFixed(0)}%) — ajuste o ângulo`
        );
        return;
      }

      if (!result.readyToConfirm) {
        stableRef.current = null;
        setConfirmProgress(0);
        setStatus(
          `${getWasteInfo(material)?.label} (${(result.confidence * 100).toFixed(0)}%) — segure firme`
        );
        return;
      }

      voteTrackerRef.current.push(material, result.confidence);
      const consensus = voteTrackerRef.current.getConsensus();

      if (!consensus || consensus.material !== material) {
        setConfirmProgress(0);
        setStatus(`Analisando ${material}... mantenha parado`);
        return;
      }

      const now = Date.now();
      const track = stableRef.current;

      if (track && track.material === material) {
        const elapsed = now - track.since;
        const progress = Math.min(100, Math.round((elapsed / STABLE_MS) * 100));
        setConfirmProgress(progress);
        setStatus(`Confirmando ${material}... ${progress}%`);
        if (elapsed >= STABLE_MS) {
          await saveDetection(material, consensus.confidence);
        }
      } else {
        stableRef.current = { material, confidence: consensus.confidence, since: now };
        setConfirmProgress(0);
        setStatus(`Detectando: ${material} (${(consensus.confidence * 100).toFixed(0)}%)`);
      }
    },
    [onPredictionChange, saveDetection]
  );

  const processColorFallback = useCallback(
    async (rawMaterial: string, confidence: number) => {
      const material = normalizeMaterial(rawMaterial);
      if (!material) {
        await processResolved({
          material: null,
          confidence: 0,
          rawLabel: rawMaterial,
          topCandidates: [],
          isAmbiguous: false,
          ambiguityHint: null,
          readyToConfirm: confidence >= 0.55,
        });
        return;
      }

      await processResolved({
        material,
        confidence,
        rawLabel: rawMaterial,
        topCandidates: [{ material, confidence, label: rawMaterial }],
        isAmbiguous: false,
        ambiguityHint: null,
        readyToConfirm: confidence >= 0.58,
      });
    },
    [processResolved]
  );

  const startScanLoop = useCallback(() => {
    stopScanLoop();
    scanningRef.current = true;

    const tick = async () => {
      if (!scanningRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= 2) {
        try {
          if (modelRef.current) {
            const prediction = await modelRef.current.predict(video);
            const resolvedResult = resolvePrediction(prediction);
            await processResolved(resolvedResult);
          } else if (canvas) {
            const result = classifyFromVideoFrame(video, canvas);
            if (result) {
              await processColorFallback(result.material, result.confidence);
            } else {
              stableRef.current = null;
              voteTrackerRef.current.reset();
              setCurrent(null);
              setResolved(null);
              setConfirmProgress(0);
              onPredictionChange(null);
              setStatus("Centralize o objeto na câmera...");
            }
          }
        } catch (scanError) {
          console.error(scanError);
          setStatus("Analisando imagem...");
        }
      }

      if (scanningRef.current) {
        loopRef.current = window.setTimeout(() => {
          void tick();
        }, SCAN_INTERVAL_MS);
      }
    };

    void tick();
  }, [onPredictionChange, processColorFallback, processResolved, stopScanLoop]);

  const loadAiModel = useCallback(async (): Promise<ScanMode> => {
    if (!tmConfigured) return "color";

    try {
      setStatus("Carregando IA Teachable Machine...");
      const tmImage = await loadTmImageModule();
      const base = getTeachableMachineModelUrl().replace(/\/?$/, "/");
      modelRef.current = await tmImage.load(
        `${base}model.json`,
        `${base}metadata.json`
      );
      setError(null);
      return "tm";
    } catch (loadError) {
      console.warn("TM fallback:", loadError);
      modelRef.current = null;
      setError("Modo backup ativo — use boa luz e fundo limpo.");
      return "color";
    }
  }, [tmConfigured]);

  const startCamera = useCallback(async () => {
    setError(null);
    setStatus("Pedindo acesso à câmera...");

    try {
      stopScanLoop();
      voteTrackerRef.current.reset();
      stableRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const mode = await loadAiModel();
      setScanMode(mode);
      setIsReady(true);
      setNeedsTap(false);
      setStatus(
        mode === "tm"
          ? "IA ativa — aponte para o resíduo"
          : "Scanner ativo — aponte para o resíduo"
      );
      startScanLoop();
    } catch (cameraError) {
      const message =
        cameraError instanceof Error
          ? cameraError.name === "NotAllowedError"
            ? "Permissão negada. Libere a câmera nas configurações."
            : cameraError.message
          : "Não foi possível acessar a câmera.";

      setError(message);
      setStatus("Erro na câmera");
      setNeedsTap(true);
    }
  }, [loadAiModel, startScanLoop, stopScanLoop]);

  useEffect(() => {
    initVoiceEngine();
    const mobile = isMobileDevice();
    setIsMobile(mobile);

    const blocked = cameraBlockedReason();
    if (blocked) {
      setError(blocked);
      setNeedsTap(false);
      setStatus("Câmera bloqueada");
      return;
    }

    if (!mobile) {
      void startCamera();
    }

    return () => {
      stopScanLoop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [startCamera, stopScanLoop]);

  const modeLabel =
    scanMode === "tm"
      ? "IA Teachable Machine"
      : scanMode === "color"
        ? "Detecção visual"
        : "Carregando IA...";

  const overlayLabel = current
    ? `${current.material} · ${(current.confidence * 100).toFixed(0)}%`
    : resolved?.rawLabel
      ? `${resolved.rawLabel} · ${(resolved.confidence * 100).toFixed(0)}%`
      : null;

  return (
    <section className="card-elevated relative overflow-hidden rounded-3xl p-4 sm:p-5 lg:p-6">
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon/15 text-sm">
              📷
            </span>
            <h2 className="font-[family-name:var(--font-orbitron)] text-lg font-semibold text-neon sm:text-xl">
              Scanner Inteligente
            </h2>
          </div>
          <p className="mt-1.5 text-xs text-emerald-100/55 sm:text-sm">{modeLabel}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider sm:text-xs ${
            isReady
              ? "border border-neon/40 bg-neon/10 text-neon"
              : "border border-yellow-400/30 bg-yellow-950/30 text-yellow-200"
          }`}
        >
          {isReady ? "● Live" : "Boot"}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <VoiceToggle />
        <span className="badge border-violet-400/25 bg-violet-950/20 text-violet-200">
          ♿ Acessível por voz
        </span>
      </div>

      <div className="scan-grid relative overflow-hidden rounded-2xl border border-neon/25 bg-black/60 shadow-inner">
        <video
          ref={videoRef}
          className={`aspect-[4/3] min-h-[240px] w-full object-cover sm:min-h-[340px] lg:min-h-[380px] ${
            isMobile ? "" : "scale-x-[-1]"
          }`}
          playsInline
          autoPlay
          muted
        />

        {needsTap && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 p-5 backdrop-blur-sm">
            <div className="rounded-2xl border border-neon/20 bg-black/40 p-5 text-center">
              <p className="text-4xl">📸</p>
              <p className="mt-2 text-sm font-medium text-white">
                Pronto para escanear
              </p>
              <p className="mt-1 text-xs text-emerald-100/55">
                PET, alumínio, papel, papelão e mais
              </p>
            </div>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="btn-primary w-full max-w-xs text-base"
            >
              Ativar câmera
            </button>
          </div>
        )}

        {isReady && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-4 rounded-xl border-2 border-dashed border-neon/35 sm:inset-6" />
            <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-neon/20 sm:left-6 sm:right-6" />
            <div className="absolute left-4 right-4 h-0.5 animate-scan bg-neon shadow-neon sm:left-6 sm:right-6" />
            {overlayLabel && (
              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-neon/25 bg-black/85 px-4 py-3 backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-4">
                <p className="text-[10px] uppercase tracking-wider text-neon/70">
                  {current ? "Material detectado" : "Analisando"}
                </p>
                <p className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-white sm:text-base">
                  {overlayLabel}
                </p>
                {confirmProgress > 0 && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/50">
                    <div
                      className="h-full rounded-full bg-neon transition-all duration-200"
                      style={{ width: `${confirmProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-black/25 px-4 py-3">
        <p className="text-sm leading-relaxed text-emerald-100/85">{status}</p>
      </div>

      {resolved && resolved.topCandidates.length > 1 && (
        <div className="mt-4 rounded-xl border border-white/8 bg-black/25 p-4">
          <PredictionBars
            candidates={resolved.topCandidates}
            highlight={current?.material ?? null}
          />
        </div>
      )}

      {current && (
        <div className="mt-4 animate-fade-in">
          <BinResult material={current.material} confidence={current.confidence} />
        </div>
      )}

      {lastSaved && !current && (
        <div className="mt-4 animate-fade-in">
          <BinResult
            material={lastSaved.material}
            confidence={lastSaved.confidence}
            saved
            showHygiene
            showVoiceButton
          />
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      )}
    </section>
  );
}
