import type { TmImageModule } from "@/types/tm";

const TFJS_CDNS = [
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.4/dist/tf.min.js",
  "https://unpkg.com/@tensorflow/tfjs@1.7.4/dist/tf.min.js",
];

const TM_CDNS = [
  "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js",
  "https://unpkg.com/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js",
];

function getTmImage(): TmImageModule | null {
  return (window as Window & { tmImage?: TmImageModule }).tmImage ?? null;
}

function waitForTmImage(timeoutMs = 10000): Promise<TmImageModule> {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const check = () => {
      const tmImage = getTmImage();
      if (tmImage) {
        resolve(tmImage);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error("Biblioteca Teachable Machine não carregou."));
        return;
      }
      window.setTimeout(check, 80);
    };

    check();
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${src}"]`
    ) as HTMLScriptElement | null;

    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Falha ao carregar: ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Falha ao carregar: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadFromCdn(urls: string[]): Promise<void> {
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      await loadScript(url);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("CDN indisponível.");
}

let tmImagePromise: Promise<TmImageModule> | null = null;

export async function loadTmImageModule(): Promise<TmImageModule> {
  if (typeof window === "undefined") {
    throw new Error("Teachable Machine só funciona no navegador.");
  }

  const cached = getTmImage();
  if (cached) return cached;

  if (!tmImagePromise) {
    tmImagePromise = (async () => {
      await loadFromCdn(TFJS_CDNS);
      await loadFromCdn(TM_CDNS);
      return waitForTmImage();
    })();
  }

  return tmImagePromise;
}

export function resetTmImageCache() {
  tmImagePromise = null;
}
