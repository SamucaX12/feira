"use client";

import { useEffect, useState } from "react";
import { isMobileDevice } from "@/lib/device";

export default function CelularSetup() {
  const [isMobile, setIsMobile] = useState(false);
  const [hostHint, setHostHint] = useState("https://SEU-IP-DO-PC:3000");

  useEffect(() => {
    setIsMobile(isMobileDevice());

    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      setHostHint(window.location.origin);
    }
  }, []);

  if (isMobile) {
    return (
      <div className="glass-panel rounded-xl border border-neon/20 p-4 text-sm text-emerald-100/70">
        <strong className="text-neon">Modo celular ativo.</strong> Use a câmera
        traseira, aponte pro resíduo e toque no material correto. O dashboard
        atualiza embaixo.
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl border border-sky-400/25 bg-sky-950/10 p-4 text-sm text-emerald-100/70">
      <strong className="text-sky-300">Sem webcam? Usa o celular:</strong>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>
          No PC, rode:{" "}
          <code className="text-neon/80">npm run dev:celular</code> ou{" "}
          <code className="text-neon/80">.\scripts\start-celular.ps1</code>
        </li>
        <li>PC e celular na mesma Wi-Fi</li>
        <li>
          No celular abra:{" "}
          <code className="break-all text-neon/80">{hostHint}</code>
        </li>
        <li>Aceite o certificado → toque em <strong>Ativar câmera</strong></li>
      </ol>
    </div>
  );
}
