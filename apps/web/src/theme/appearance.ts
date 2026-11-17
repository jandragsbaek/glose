import { useSyncExternalStore } from "react";

import { type Mode, PAINT_CONFIG, type Painted, paint, type ThemeId } from "./paint.ts";

const listeners = new Set<() => void>();
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let painted = paint(PAINT_CONFIG);

const groundColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue("--ground").trim();

const tellDesktop = () => window.gloseDesktop?.appearance.set(painted.mode, groundColor());

const repaint = () => {
  const before = painted;
  painted = paint(PAINT_CONFIG);
  if (
    before.theme === painted.theme &&
    before.mode === painted.mode &&
    before.appearance === painted.appearance
  ) {
    return;
  }
  tellDesktop();
  for (const listener of listeners) listener();
};

const crossfade = (change: () => void) => {
  const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (quiet || document.startViewTransition === undefined) change();
  else document.startViewTransition(change);
};

darkQuery.addEventListener("change", () => {
  if (painted.mode === "system") crossfade(repaint);
});

window.addEventListener("storage", (event) => {
  if (event.key === PAINT_CONFIG.key) repaint();
});

tellDesktop();

export function chooseAppearance(choice: { readonly theme?: ThemeId; readonly mode?: Mode }) {
  const next = { theme: choice.theme ?? painted.theme, mode: choice.mode ?? painted.mode };
  try {
    window.localStorage.setItem(PAINT_CONFIG.key, JSON.stringify(next));
  } catch {
    return;
  }
  crossfade(repaint);
}

export function subscribeAppearance(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => painted;

export function useAppearance(): Painted {
  return useSyncExternalStore(subscribeAppearance, snapshot, snapshot);
}
