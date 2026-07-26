// Motion tokens for Framer Motion (JS). CSS transitions read the --duration-*
// vars directly via Tailwind's duration-* classes; Framer needs numeric seconds,
// so we read the SAME CSS tokens here (single source of truth) with fallbacks.
// The easing array mirrors the --ease-out token. Motion components import these
// presets and never write raw numbers/curves.

function readSeconds(varName: string, fallbackMs: number): number {
  const fallback = fallbackMs / 1000;
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return fallback;
  return raw.endsWith('ms') ? n / 1000 : n;
}

let cached: { fast: number; base: number; slow: number } | null = null;
function durations() {
  cached ??= {
    fast: readSeconds('--duration-fast', 120),
    base: readSeconds('--duration-base', 220),
    slow: readSeconds('--duration-slow', 360),
  };
  return cached;
}

export const EASE_OUT = [0.22, 1, 0.36, 1] as const; // mirrors --ease-out

export function tween(speed: 'fast' | 'base' | 'slow' = 'base') {
  return { duration: durations()[speed], ease: EASE_OUT };
}

// Same tokens in milliseconds, for JS timers that must outlast a CSS animation
// (e.g. removing a toast after its leave animation finishes).
export function durationMs(speed: 'fast' | 'base' | 'slow' = 'base'): number {
  return durations()[speed] * 1000;
}

// A gentle spring so a card reads as *travelling* to its new column, not snapping.
export const CARD_TRAVEL = {
  type: 'spring',
  stiffness: 520,
  damping: 42,
  mass: 1,
} as const;
