/**
 * URL pública do site (para QR code e compartilhamento).
 * Em produção, defina NEXT_PUBLIC_SITE_URL na Vercel (ex: https://feira.vercel.app)
 */
export function isValidSiteUrl(value: string | undefined | null): boolean {
  if (!value) return false;

  const trimmed = value.trim();
  if (trimmed.length < 10) return false;

  // Rejeita placeholder ou nome da variável colado por engano na Vercel
  if (/^[A-Z][A-Z0-9_]*$/.test(trimmed)) return false;
  if (
    trimmed.includes("seu-projeto") ||
    trimmed.includes("seu_link") ||
    trimmed.includes("COLE_SEU") ||
    trimmed === "NEXT_PUBLIC_SITE_URL"
  ) {
    return false;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getConfiguredSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv && isValidSiteUrl(fromEnv)) {
    return normalizeSiteUrl(fromEnv);
  }
  return "";
}

export function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (isValidSiteUrl(origin)) return origin;
  }

  const configured = getConfiguredSiteUrl();
  if (configured) return configured;

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return "";
}
