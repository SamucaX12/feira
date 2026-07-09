"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BinResult from "@/components/BinResult";
import { classifyFromVideoFrame } from "@/lib/colorClassifier";
import { cameraBlockedReason, isMobileDevice } from "@/lib/device";
import { getTeachableMachineModelUrl, isTeachableMachineConfigured } from "@/lib/modelConfig";
import { loadTmImageModule } from "@/lib/tmLoader";
import { getWasteInfo, normalizeMaterial } from "@/lib/wasteRules";
import { LivePrediction, MaterialType } from "@/types/detection";
import type { TmImageModule } from "@/types/tm";

const SAVE_THRESHOLD = 0.5;
const SHOW_THRESHOLD = 0.3;
const STABLE_MS = 1200;
const POST_COOLDOWN_MS = 3500;
const SCAN_INTERVAL_MS = 300;

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
  const modelRef = useRef<Awaited<ReturnType<TmImageModule["load"]>> | null>(null);
  const loopRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const stableRef = useRef<StableTrack | null>(null);
  const lastSavedRef = useRef<{ material: MaterialType; at: number } | null>(null);
  const savingRef = useRef(false);
  const scanModeRef = useRef<ScanMode>("loading");

  const tmConfigured = isTeachableMachineConfigured();
  const [scanMode, setScanMode] = useState<ScanMode>(tmConfigured ? "loading" : "color");
  const [isMobile, setIsMobile] = useState(false);
  const [needsTap, setNeedsTap] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("Toque para ativar a câmera");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ label: string; confidence: number } | null>(
    null
  );
  const [current, setCurrent] = useState<{
    material: MaterialType;
    confidence: number;
  } | null>(null);
  const [lastSaved, setLastSaved] = useState<{
    material: MaterialType;
    confidence: number;
  } | null>(null);

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
        setLastSaved({ material, confidence });
        setStatus("Descarte registrado com sucesso!");
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

  const processPrediction = useCallback(
    async (rawMaterial: string, confidence: number) => {
      setPreview({ label: rawMaterial, confidence });

      const material = normalizeMaterial(rawMaterial);

      if (!material || confidence < SHOW_THRESHOLD) {
        stableRef.current = null;
        setCurrent(null);
        onPredictionChange(null);
        setStatus(
          material
            ? `Vendo ${rawMaterial} (${(confidence * 100).toFixed(0)}%) — aproxime mais`
            : "Aponte a câmera para o resíduo..."
        );
        return;
      }

      setCurrent({ material, confidence });
      onPredictionChange({ material, confidence });

      if (confidence < SAVE_THRESHOLD) {
        setStatus(
          `${getWasteInfo(material)?.label ?? material} (${(confidence * 100).toFixed(0)}%) — segure firme`
        );
        return;
      }

      const now = Date.now();
      const track = stableRef.current;

      if (track && track.material === material) {
        const elapsed = now - track.since;
        setStatus(
          `Confirmando ${material}... ${Math.min(100, Math.round((elapsed / STABLE_MS) * 100))}%`
        );
        if (elapsed >= STABLE_MS) {
          await saveDetection(material, confidence);
        }
      } else {
        stableRef.current = { material, confidence, since: now };
        setStatus(`Detectando: ${material} (${(confidence * 100).toFixed(0)}%)`);
      }
    },
    [onPredictionChange, saveDetection]
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
            const top = prediction.reduce((best, item) =>
              item.probability > best.probability ? item : best
            );
            await processPrediction(top.className, top.probability);
          } else if (canvas) {
            const result = classifyFromVideoFrame(video, canvas);
            if (result) {
              await processPrediction(result.material, result.confidence);
            } else {
              stableRef.current = null;
              setCurrent(null);
              setPreview(null);
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
  }, [onPredictionChange, processPrediction, stopScanLoop]);

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
      setError(
        "Modo backup ativo — centralize o objeto com boa luz."
      );
      return "color";
    }
  }, [tmConfigured]);

  const startCamera = useCallback(async () => {
    setError(null);
    setStatus("Pedindo acesso à câmera...");

    try {
      stopScanLoop();
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
      scanModeRef.current = mode;
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
            ? "Permissão negada. Libere a câmera nas configurações do navegador."
            : cameraError.message
          : "Não foi possível acessar a câmera.";

      setError(message);
      setStatus("Erro na câmera");
      setNeedsTap(true);
    }
  }, [loadAiModel, startScanLoop, stopScanLoop]);

  useEffect(() => {
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
    : preview
      ? `${preview.label} · ${(preview.confidence * 100).toFixed(0)}%`
      : null;

  return (
    <section className="glass-panel relative overflow-hidden rounded-2xl p-4 shadow-neon-sm sm:p-5 md:p-6">
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-orbitron)] text-lg font-semibold text-neon sm:text-xl">
            Scanner Inteligente
          </h2>
          <p className="mt-1 text-xs text-emerald-100/60 sm:text-sm">{modeLabel}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            isReady
              ? "border border-neon/40 text-neon"
              : "border border-yellow-400/30 text-yellow-200"
          }`}
        >
          {isReady ? "LIVE" : "BOOT"}
        </span>
      </div>

      <div className="scan-grid relative overflow-hidden rounded-xl border border-neon/20 bg-black/50">
        <video
          ref={videoRef}
          className={`aspect-[4/3] min-h-[220px] w-full object-cover sm:min-h-[320px] ${
            isMobile ? "" : "scale-x-[-1]"
          }`}
          playsInline
          autoPlay
          muted
        />

        {needsTap && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4">
            <button
              type="button"
              onClick={() => void startCamera()}
              className="rounded-2xl border border-neon bg-neon/15 px-6 py-4 text-base font-semibold text-neon shadow-neon-sm active:scale-95"
            >
              Ativar câmera
            </button>
            <p className="max-w-xs text-center text-xs text-emerald-100/60">
              Aponte para PET, alumínio, papel ou papelão
            </p>
          </div>
        )}

        {isReady && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-3 rounded-xl border border-neon/30 sm:inset-4" />
            <div className="absolute left-3 right-3 h-0.5 animate-scan bg-neon shadow-neon sm:left-4 sm:right-4" />
            {overlayLabel && (
              <div className="absolute left-3 right-3 top-3 rounded-lg bg-black/80 px-3 py-2 text-center sm:left-4 sm:right-4 sm:top-4">
                <p className="text-[10px] uppercase tracking-wider text-neon/70">
                  {current ? "Detectado" : "Analisando"}
                </p>
                <p className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-white sm:text-base">
                  {overlayLabel}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-emerald-100/80">{status}</p>

      {current && (
        <div className="mt-4">
          <BinResult material={current.material} confidence={current.confidence} />
        </div>
      )}

      {lastSaved && !current && (
        <div className="mt-4">
          <BinResult
            material={lastSaved.material}
            confidence={lastSaved.confidence}
            saved
          />
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
          {error}
        </p>
      )}
    </section>
  );
}
