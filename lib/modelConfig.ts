export function getTeachableMachineModelUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_TM_MODEL_URL?.trim();
  if (fromEnv) return fromEnv;

  return "";
}

export function isTeachableMachineConfigured(): boolean {
  const url = getTeachableMachineModelUrl();
  if (!url) return false;
  return !url.includes("COLE_SEU") && !url.includes("MODEL_ID");
}
