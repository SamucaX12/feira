"use client";

import ShareQrCode from "@/components/ShareQrCode";
import Link from "next/link";

const SCHOOL =
  "Escola Municipal Ensino Fundamental Professor Alcides Conter";

export default function QrPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="card-elevated w-full max-w-md rounded-3xl p-6 sm:p-8">
        <p className="text-center text-[10px] uppercase tracking-[0.3em] text-neon/60">
          {SCHOOL}
        </p>
        <h1 className="neon-text mt-2 text-center font-[family-name:var(--font-orbitron)] text-2xl font-bold text-neon sm:text-3xl">
          EcoScan AI
        </h1>
        <p className="mt-2 text-center text-sm text-emerald-100/60">
          Escaneie para abrir o sistema
        </p>

        <div className="mt-6">
          <ShareQrCode />
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-neon/70 underline-offset-4 hover:text-neon hover:underline"
        >
          ← Voltar ao site
        </Link>
      </div>
    </main>
  );
}
