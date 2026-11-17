import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";

import { useT } from "../i18n/I18n.tsx";
import { chooseAppearance, useAppearance } from "../theme/appearance.ts";
import { type Appearance, type Mode, MODES, type ThemeId, THEMES } from "../theme/paint.ts";
import { Panel } from "./ui.tsx";

const MODE_ICONS: Record<Mode, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

export function AppearancePanel() {
  const t = useT();
  const id = useId();
  const painted = useAppearance();
  return (
    <Panel title={t.appearance.title} initial="accent" level={3}>
      <div className="panel__body appearance">
        <fieldset className="appearance__group">
          <legend className="appearance__legend">{t.appearance.mode}</legend>
          <div className="segmented appearance__modes">
            {MODES.map((mode) => {
              const Icon = MODE_ICONS[mode];
              return (
                <label key={mode}>
                  <input
                    type="radio"
                    name={`${id}-mode`}
                    checked={painted.mode === mode}
                    onChange={() => void chooseAppearance({ mode })}
                  />
                  <span>
                    <Icon className="appearance__mode-icon" aria-hidden="true" />
                    {t.appearance.modes[mode]}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="field__hint appearance__now" aria-live="polite">
            {painted.mode === "system" ? t.appearance.systemNow[painted.appearance] : ""}
          </p>
        </fieldset>
        <fieldset className="appearance__group">
          <legend className="appearance__legend">{t.appearance.theme}</legend>
          <div className="bindings">
            {THEMES.map((theme) => (
              <label key={theme} className="binding">
                <input
                  type="radio"
                  name={`${id}-theme`}
                  checked={painted.theme === theme}
                  onChange={() => void chooseAppearance({ theme })}
                />
                <span className="binding__specimen" aria-hidden="true">
                  <Leaf theme={theme} appearance="light" />
                  <Leaf theme={theme} appearance="dark" />
                </span>
                <span className="binding__name">{t.appearance.themes[theme]}</span>
              </label>
            ))}
          </div>
          <p className="field__hint">{t.appearance.hint}</p>
        </fieldset>
      </div>
    </Panel>
  );
}

function Leaf({ theme, appearance }: { readonly theme: ThemeId; readonly appearance: Appearance }) {
  return (
    <span className="binding__leaf" data-theme={theme} data-appearance={appearance}>
      {appearance === "light" ? (
        <span className="binding__spine">
          <span className="binding__band" />
          <span className="binding__band" />
        </span>
      ) : null}
      <span className="binding__page">
        <span className="binding__initial" />
        <span className="binding__line binding__line--ink" />
        <span className="binding__line binding__line--mute" />
        <span className="binding__line binding__line--accent" />
        <span className="binding__button" />
      </span>
    </span>
  );
}
