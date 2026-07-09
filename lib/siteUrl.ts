/**
 * URL pública do site (para QR code e compartilhamento).
 * Em produção, defina NEXT_PUBLIC_SITE_URL na Vercel (ex: https://ecoscan-ai.vercel.app)
 */
export function getConfiguredSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "";
}

export function getSiteUrl(): string {
  const configured = getConfiguredSiteUrl();
  if (configured) return configured;

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return "";
}
