export const THEMES = ["lapis", "murex", "sepia"] as const;
export type ThemeId = (typeof THEMES)[number];

export const MODES = ["light", "dark", "system"] as const;
export type Mode = (typeof MODES)[number];

export type Appearance = "light" | "dark";

export interface Choice {
  readonly theme: ThemeId;
  readonly mode: Mode;
}

export interface Painted extends Choice {
  readonly appearance: Appearance;
}

export interface PaintConfig {
  readonly key: string;
  readonly themes: ReadonlyArray<string>;
  readonly modes: ReadonlyArray<string>;
  readonly fallback: Choice;
}

export const PAINT_CONFIG: PaintConfig = {
  key: "glose:appearance",
  themes: THEMES,
  modes: MODES,
  fallback: { theme: "lapis", mode: "system" },
};

export function paint(config: PaintConfig, choice?: Choice, systemDark?: boolean): Painted {
  let stored: unknown = choice ?? null;
  if (choice === undefined) {
    try {
      stored = JSON.parse(window.localStorage.getItem(config.key) ?? "null");
    } catch {
      stored = null;
    }
  }
  const field = (name: "theme" | "mode", allowed: ReadonlyArray<string>) => {
    const value =
      typeof stored === "object" && stored !== null && name in stored
        ? (stored as Record<string, unknown>)[name]
        : undefined;
    return typeof value === "string" && allowed.includes(value) ? value : config.fallback[name];
  };
  const theme = field("theme", config.themes) as ThemeId;
  const mode = field("mode", config.modes) as Mode;
  const appearance: Appearance =
    mode === "system"
      ? (systemDark ?? window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light"
      : mode;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.appearance = appearance;
  return { theme, mode, appearance };
}

export const PAINT_SCRIPT = `(${paint.toString()})(${JSON.stringify(PAINT_CONFIG)});`;
