import { useSyncExternalStore } from "react";

import {
  type Appearance,
  type Choice,
  MODES,
  PAINT_CONFIG,
  type Painted,
  paint,
  THEMES,
  type ThemeId,
} from "./paint.ts";

export interface AppearanceView extends Painted {
  readonly settled: boolean;
}

const listeners = new Set<() => void>();
const paintListeners = new Set<() => void>();
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let painted = paint(PAINT_CONFIG);
let chosen: Choice = { theme: painted.theme, mode: painted.mode };
let view: AppearanceView = { ...painted, settled: true };

const notify = () => {
  const next = {
    ...chosen,
    appearance: painted.appearance,
    settled: chosen.theme === painted.theme && chosen.mode === painted.mode,
  };
  if (
    next.theme === view.theme &&
    next.mode === view.mode &&
    next.appearance === view.appearance &&
    next.settled === view.settled
  ) {
    return;
  }
  view = next;
  for (const listener of listeners) listener();
};

const settle = (next: Painted) => {
  const changed = next.theme !== painted.theme || next.appearance !== painted.appearance;
  painted = next;
  if (changed) for (const listener of paintListeners) listener();
  notify();
};

const appearanceOf = (choice: Choice, systemDark?: boolean): Appearance => {
  if (choice.mode !== "system") return choice.mode;
  return (systemDark ?? darkQuery.matches) ? "dark" : "light";
};

let heading: { readonly theme: ThemeId; readonly appearance: Appearance } | null = null;

const show = (systemDark?: boolean) => {
  const target = { theme: chosen.theme, appearance: appearanceOf(chosen, systemDark) };
  const shown = heading ?? painted;
  if (target.theme === shown.theme && target.appearance === shown.appearance) {
    if (heading === null) settle(paint(PAINT_CONFIG, chosen, systemDark));
    return;
  }
  const apply = () => {
    heading = null;
    settle(paint(PAINT_CONFIG, chosen, systemDark));
  };
  const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (quiet || document.startViewTransition === undefined) {
    apply();
    return;
  }
  heading = target;
  const transition = document.startViewTransition(apply);
  for (const done of [transition.ready, transition.finished, transition.updateCallbackDone]) {
    done.catch(() => undefined);
  }
};

const remember = (choice: Choice) => {
  try {
    window.localStorage.setItem(PAINT_CONFIG.key, JSON.stringify(choice));
    return true;
  } catch {
    return false;
  }
};

const stored = (): Choice | null => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PAINT_CONFIG.key) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    const theme = THEMES.find((id) => "theme" in value && value.theme === id);
    const mode = MODES.find((id) => "mode" in value && value.mode === id);
    return theme === undefined || mode === undefined ? null : { theme, mode };
  } catch {
    return null;
  }
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

darkQuery.addEventListener("change", () => {
  if (chosen.mode === "system") show();
});

window.addEventListener("storage", (event) => {
  if (event.key !== PAINT_CONFIG.key) return;
  chosen = stored() ?? PAINT_CONFIG.fallback;
  notify();
  show();
});

window.addEventListener("load", () => void tellDesktop(chosen), { once: true });

export async function chooseAppearance(choice: Partial<Choice>) {
  const next = { theme: choice.theme ?? chosen.theme, mode: choice.mode ?? chosen.mode };
  chosen = next;
  notify();
  remember(next);
  const systemDark = await tellDesktop(next);
  if (chosen === next) show(systemDark);
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

const read = () => view;

export function useAppearance(): AppearanceView {
  return useSyncExternalStore(subscribeAppearance, read, read);
}
