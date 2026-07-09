"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { getSiteUrl } from "@/lib/siteUrl";

interface ShareQrCodeProps {
  compact?: boolean;
}

export default function ShareQrCode({ compact = false }: ShareQrCodeProps) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(getSiteUrl());
  }, []);

  const copyLink = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* fallback silencioso */
    }
  }, [url]);

  const downloadQr = useCallback(async () => {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg || !url) return;

    setDownloading(true);
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(blob);

      const image = new Image();
      image.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Falha ao gerar imagem"));
        image.src = svgUrl;
      });

      const padding = 24;
      const size = compact ? 200 : 280;
      const canvas = document.createElement("canvas");
      canvas.width = size + padding * 2;
      canvas.height = size + padding * 2;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, padding, padding, size, size);

      URL.revokeObjectURL(svgUrl);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "ecoscan-ai-qrcode.png";
      link.click();
    } finally {
      setDownloading(false);
    }
  }, [compact, url]);

  if (!url) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-white/8 bg-black/25">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-neon/20" />
      </div>
    );
  }

  const displayHost = url.replace(/^https?:\/\//, "");

  return (
    <div
      className={`rounded-2xl border border-neon/20 bg-black/35 ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">📱</span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neon/70 sm:text-xs">
            Acesse pelo celular
          </p>
          <p className="text-xs text-emerald-100/50">
            Escaneie o QR Code
          </p>
        </div>
      </div>

      <div
        ref={qrWrapRef}
        className={`mx-auto mt-4 flex items-center justify-center rounded-xl bg-white p-3 shadow-lg ${
          compact ? "max-w-[148px]" : "max-w-[200px] sm:max-w-[220px]"
        }`}
      >
        <QRCode
          value={url}
          size={compact ? 120 : 168}
          level="M"
          bgColor="#ffffff"
          fgColor="#0a0f0d"
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        />
      </div>

      <p
        className="mt-3 break-all text-center font-[family-name:var(--font-orbitron)] text-[10px] text-neon/80 sm:text-xs"
        title={url}
      >
        {displayHost}
      </p>

      <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-xl border border-neon/30 bg-neon/10 px-3 py-2.5 text-xs font-semibold text-neon transition hover:bg-neon/20 active:scale-[0.98]"
        >
          {copied ? "✓ Link copiado!" : "Copiar link"}
        </button>
        {!compact && (
          <button
            type="button"
            onClick={() => void downloadQr()}
            disabled={downloading}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-xs font-semibold text-emerald-100/80 transition hover:bg-black/50 active:scale-[0.98] disabled:opacity-50"
          >
            {downloading ? "Gerando..." : "Baixar QR"}
          </button>
        )}
      </div>

        {!compact && (
          <p className="mt-3 text-center text-[10px] leading-relaxed text-emerald-100/40">
            Aponte a câmera do celular · abra no Chrome · toque em Ativar câmera
            {" · "}
            <a href="/qr" className="text-neon/60 underline-offset-2 hover:underline">
              tela cheia
            </a>
          </p>
        )}
    </div>
  );
}
