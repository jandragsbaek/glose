import { useAtomSet } from "@effect/atom-react";
import type { Language } from "@glose/contracts";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  Layers,
  Library,
  type LucideIcon,
  NotebookPen,
  Settings2,
  Waypoints,
} from "lucide-react";

import { LANGUAGES, useT } from "../i18n/I18n.tsx";
import { KEYS, setLanguageAtom } from "../state/vault.ts";
import { useOpenSettings, useSettingsOpen } from "./SettingsWindow.tsx";

function RailLink({
  to,
  icon: Icon,
  label,
  also,
}: {
  readonly to: "/" | "/sources" | "/graph" | "/writing" | "/recall";
  readonly icon: LucideIcon;
  readonly label: string;
  readonly also?: string;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const here = also !== undefined && pathname.startsWith(also);
  return (
    <Link
      to={to}
      className="rail__link"
      activeOptions={{ exact: to === "/" }}
      aria-current={here ? "page" : undefined}
    >
      <Icon className="rail__icon" aria-hidden="true" />
      {label}
    </Link>
  );
}

function SettingsRailButton({ label }: { readonly label: string }) {
  const open = useOpenSettings();
  const isOpen = useSettingsOpen();
  return (
    <button
      type="button"
      className="rail__link"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      data-current={isOpen ? "" : undefined}
      onClick={() => open("language")}
    >
      <Settings2 className="rail__icon" aria-hidden="true" />
      {label}
    </button>
  );
}

export function LanguageSwitch({
  value,
  onChange,
  className,
}: {
  readonly value: Language;
  readonly onChange: (language: Language) => void;
  readonly className: string;
}) {
  const t = useT();
  return (
    <fieldset className={className}>
      <legend className="sr-only">{t.nav.language}</legend>
      {LANGUAGES.map((language) => (
        <label key={language} title={t.languages[language]}>
          <input
            type="radio"
            name="interface-language"
            value={language}
            checked={value === language}
            onChange={() => onChange(language)}
          />
          <span aria-hidden="true">{t.languageCodes[language]}</span>
          <span className="sr-only">{t.languages[language]}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function Rail({ language }: { readonly language: Language }) {
  const t = useT();
  const setLanguage = useAtomSet(setLanguageAtom);
  return (
    <nav className="rail" aria-label={t.nav.label}>
      <span className="call rail__mark" aria-label={t.app.name}>
        {t.app.mark}
      </span>
      <RailLink to="/" icon={CalendarDays} label={t.nav.today} />
      <RailLink to="/sources" icon={Library} label={t.nav.sources} />
      <span className="rail__rule" aria-hidden="true" />
      <RailLink to="/graph" icon={Waypoints} label={t.nav.graph} also="/people/" />
      <RailLink to="/writing" icon={NotebookPen} label={t.nav.writingProjects} />
      <RailLink to="/recall" icon={Layers} label={t.nav.recall} />
      <div className="rail__foot">
        <LanguageSwitch
          className="lang-switch"
          value={language}
          onChange={(next) =>
            setLanguage({ payload: { language: next }, reactivityKeys: KEYS.settings })
          }
        />
        <SettingsRailButton label={t.nav.settings} />
      </div>
    </nav>
  );
}
