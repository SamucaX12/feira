export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isSecureCameraContext(): boolean {
  if (typeof window === "undefined") return true;
  return window.isSecureContext;
}

export function cameraBlockedReason(): string | null {
  if (typeof window === "undefined") return null;
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Seu navegador não suporta câmera. Use Chrome ou Safari atualizado.";
  }
  if (!isSecureCameraContext()) {
    return "Câmera no celular exige HTTPS. Rode npm run dev:celular no PC e abra o link https:// que aparecer no terminal.";
  }
  return null;
}
