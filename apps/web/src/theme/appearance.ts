import { useSyncExternalStore } from "react";

import {
  type Appearance,
  type Choice,
  PAINT_CONFIG,
  type Painted,
  paint,
  type ThemeId,
} from "./paint.ts";

const listeners = new Set<() => void>();
const paintListeners = new Set<() => void>();
let painted = paint(PAINT_CONFIG);
let chosen: Choice = { theme: painted.theme, mode: painted.mode };
let snapshot: Painted = painted;

const notify = () => {
  const next = { ...chosen, appearance: painted.appearance };
  if (
    next.theme === snapshot.theme &&
    next.mode === snapshot.mode &&
    next.appearance === snapshot.appearance
  ) {
    return;
  }
  snapshot = next;
  for (const listener of listeners) listener();
};

const settle = (next: Painted) => {
  const changed = next.theme !== painted.theme || next.appearance !== painted.appearance;
  painted = next;
  if (changed) for (const listener of paintListeners) listener();
  notify();
};

const remember = (choice: Choice) => {
  try {
    window.localStorage.setItem(PAINT_CONFIG.key, JSON.stringify(choice));
    return true;
  } catch {
    return false;
  }
};

const crossfade = (change: () => void) => {
  const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (quiet || document.startViewTransition === undefined) {
    change();
    return;
  }
  document.startViewTransition(change).ready.catch(() => undefined);
};

const groundOf = (theme: ThemeId, appearance: Appearance) => {
  const probe = document.createElement("span");
  probe.hidden = true;
  probe.dataset.theme = theme;
  probe.dataset.appearance = appearance;
  document.body.append(probe);
  const ground = getComputedStyle(probe).getPropertyValue("--ground").trim();
  probe.remove();
  return ground;
};

const tellDesktop = async (choice: Choice): Promise<boolean | undefined> => {
  const desktop = window.gloseDesktop?.appearance;
  if (desktop === undefined) return undefined;
  const grounds = { light: groundOf(choice.theme, "light"), dark: groundOf(choice.theme, "dark") };
  return desktop.set(choice.mode, grounds).catch(() => undefined);
};

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (chosen.mode === "system") crossfade(() => settle(paint(PAINT_CONFIG, chosen)));
});

window.addEventListener("storage", (event) => {
  if (event.key !== PAINT_CONFIG.key) return;
  crossfade(() => {
    const next = paint(PAINT_CONFIG);
    chosen = { theme: next.theme, mode: next.mode };
    settle(next);
  });
});

void tellDesktop(chosen);

export async function chooseAppearance(choice: Partial<Choice>) {
  const next = { theme: choice.theme ?? chosen.theme, mode: choice.mode ?? chosen.mode };
  chosen = next;
  notify();
  remember(next);
  const systemDark = await tellDesktop(next);
  if (chosen !== next) return;
  crossfade(() => settle(paint(PAINT_CONFIG, next, systemDark)));
}

export function subscribePaint(listener: () => void) {
  paintListeners.add(listener);
  return () => {
    paintListeners.delete(listener);
  };
}

function subscribeAppearance(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const read = () => snapshot;

export function useAppearance(): Painted {
  return useSyncExternalStore(subscribeAppearance, read, read);
}
