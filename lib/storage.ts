// Persistenz des kompletten Eingabe-States in localStorage.
// Robust gegen Schema-Erweiterungen: gespeicherte Werte werden über die Defaults gemerged.

import type { AppState } from "./types";
import { buildDefaultState } from "./defaults";

const STORAGE_KEY = "ev-tco:state:v1";

// Tiefen-Merge, der nur bekannte Default-Schlüssel übernimmt (kein Prototype-Pollution-Risiko).
function mergeDeep<T>(base: T, override: unknown): T {
  if (
    typeof base !== "object" ||
    base === null ||
    Array.isArray(base) ||
    typeof override !== "object" ||
    override === null ||
    Array.isArray(override)
  ) {
    // Primitive / Arrays: übernehmen, falls Typ passt.
    return (typeof override === typeof base ? (override as T) : base);
  }

  const result = { ...(base as Record<string, unknown>) };
  const ov = override as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (key in ov) {
      result[key] = mergeDeep(result[key], ov[key]);
    }
  }
  return result as T;
}

export function loadState(): AppState {
  const fallback = buildDefaultState();
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return mergeDeep(fallback, parsed);
  } catch {
    return fallback;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Speicher voll / deaktiviert → still ignorieren.
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorieren
  }
}
