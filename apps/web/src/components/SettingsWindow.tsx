import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import {
  type LucideIcon,
  Folder,
  Globe,
  Languages,
  MessageSquareText,
  Palette,
  CloudUpload,
  X,
} from "lucide-react";
import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";

import { LANGUAGES, useT } from "../i18n/I18n.tsx";
import { KEYS, setLanguageAtom, settingsAtom } from "../state/graph.ts";
import { AppearancePanel } from "./AppearancePanel.tsx";
import { BackupPanel } from "./Backup.tsx";
import { ChatGptConnection } from "./ChatGptConnection.tsx";
import { Panel } from "./ui.tsx";
import { SiteFolderSheet } from "./WritingSheets.tsx";

export const SETTINGS_SECTIONS = [
  "language",
  "appearance",
  "graph-folder",
  "backup",
  "chatgpt",
  "site",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const SECTION_ICONS: Record<SettingsSection, LucideIcon> = {
  language: Languages,
  appearance: Palette,
  "graph-folder": Folder,
  backup: CloudUpload,
  chatgpt: MessageSquareText,
  site: Globe,
};

const isSection = (value: unknown): value is SettingsSection =>
  SETTINGS_SECTIONS.some((section) => section === value);

export const validateSettingsSearch = (
  search: Record<string, unknown>,
): { readonly settings?: SettingsSection } =>
  isSection(search.settings) ? { settings: search.settings } : {};

export function useOpenSettings() {
  const navigate = useNavigate();
  return (section: SettingsSection) =>
    void navigate({ to: ".", search: (prev) => ({ ...prev, settings: section }) });
}

export function useSettingsOpen() {
  return useSearch({ strict: false, select: (search) => search.settings !== undefined });
}

export function OpenSettingsButton({
  section,
  className,
  children,
}: {
  readonly section: SettingsSection;
  readonly className: string;
  readonly children: ReactNode;
}) {
  const open = useOpenSettings();
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      onClick={() => open(section)}
    >
      {children}
    </button>
  );
}

export function SettingsWindow() {
  const section = useSearch({ strict: false, select: (search) => search.settings });
  return section === undefined ? null : <SettingsDialog shown={section} />;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function showFromTop(leaf: HTMLElement | null, section: SettingsSection) {
  if (leaf === null) return;
  leaf.scrollTop = 0;
  leaf.querySelector<HTMLElement>(`[data-section="${section}"]`)?.focus({ preventScroll: true });
}

function SettingsDialog({ shown }: { readonly shown: SettingsSection }) {
  const t = useT();
  const navigate = useNavigate();
  const titleId = useId();
  const pagesId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const veilPressed = useRef(false);
  const [closing, setClosing] = useState(false);

  const leave = () =>
    void navigate({
      to: ".",
      search: ({ settings: _closed, ...rest }) => rest,
      replace: true,
    });

  const close = () => {
    if (reducedMotion()) dialogRef.current?.close();
    else setClosing(true);
  };

  const openDialog = (node: HTMLDialogElement | null) => {
    dialogRef.current = node;
    if (node !== null && !node.open) node.showModal();
  };

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- scroll and focus, not state: a page can take focus only once it is no longer hidden, so the shown page starts at the top and takes focus after it renders.
  useLayoutEffect(() => showFromTop(leafRef.current, shown), [shown]);

  const goTo = (section: SettingsSection) => {
    if (section === shown) showFromTop(leafRef.current, section);
    else
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, settings: section }),
        replace: true,
      });
  };

  return (
    <dialog
      className="settings-window"
      data-closing={closing ? "" : undefined}
      aria-labelledby={titleId}
      ref={openDialog}
      onClose={(event) => {
        if (event.target === event.currentTarget) leave();
      }}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        close();
      }}
      onPointerDown={(event) => {
        veilPressed.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        if (veilPressed.current && event.target === event.currentTarget) close();
        veilPressed.current = false;
      }}
      onPointerCancel={() => {
        veilPressed.current = false;
      }}
      onAnimationEnd={(event) => {
        if (closing && event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <nav className="settings-window__spine" aria-label={t.settings.sections}>
        <ul>
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section];
            return (
              <li key={section}>
                <button
                  type="button"
                  className="settings-window__section-link"
                  aria-current={section === shown ? "page" : undefined}
                  aria-controls={`${pagesId}-${section}`}
                  onClick={() => goTo(section)}
                >
                  <Icon className="settings-window__icon" aria-hidden="true" />
                  {sectionTitle(t, section)}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="settings-window__leaf">
        <header className="settings-window__head">
          <h2 id={titleId}>{t.settings.title}</h2>
          <button
            type="button"
            className="button button--quiet settings-window__close"
            aria-label={t.settings.close}
            aria-keyshortcuts="Escape"
            onClick={close}
          >
            <kbd className="key" aria-hidden="true">
              {t.settings.closeKey}
            </kbd>
            <X className="settings-window__close-icon" aria-hidden="true" />
          </button>
        </header>
        <div ref={leafRef} className="settings-window__body">
          <SettingsPages idPrefix={pagesId} shown={shown} />
        </div>
      </div>
    </dialog>
  );
}

function sectionTitle(t: ReturnType<typeof useT>, section: SettingsSection) {
  switch (section) {
    case "language":
      return t.settings.language;
    case "appearance":
      return t.appearance.title;
    case "graph-folder":
      return t.settings.graphFolder;
    case "backup":
      return t.backup.title;
    case "chatgpt":
      return t.chatgpt.title;
    case "site":
      return t.settings.site;
  }
}

function SettingsPage({
  section,
  idPrefix,
  shown,
  children,
}: {
  readonly section: SettingsSection;
  readonly idPrefix: string;
  readonly shown: SettingsSection;
  readonly children: ReactNode;
}) {
  const t = useT();
  return (
    <div
      className="settings-window__page"
      data-section={section}
      id={`${idPrefix}-${section}`}
      tabIndex={-1}
      role="group"
      aria-label={sectionTitle(t, section)}
      hidden={section !== shown}
    >
      {children}
    </div>
  );
}

function SettingsPages({
  idPrefix,
  shown,
}: {
  readonly idPrefix: string;
  readonly shown: SettingsSection;
}) {
  const t = useT();
  const settings = useAtomValue(settingsAtom);
  const setLanguage = useAtomSet(setLanguageAtom);
  const current = AsyncResult.getOrElse(
    AsyncResult.map(settings, (view) => view.settings),
    () => null,
  );
  return (
    <>
      <SettingsPage section="language" idPrefix={idPrefix} shown={shown}>
        <Panel title={t.settings.language} initial="rubric" level={3}>
          <div className="panel__body">
            <fieldset className="fieldset settings-window__fieldset">
              <legend className="sr-only">{t.settings.language}</legend>
              <div className="choice-list">
                {LANGUAGES.map((language) => (
                  <label key={language} className="choice">
                    <input
                      type="radio"
                      name="settings-language"
                      value={language}
                      checked={current?.language === language}
                      onChange={() =>
                        setLanguage({ payload: { language }, reactivityKeys: KEYS.settings })
                      }
                    />
                    <span lang={language}>{t.languages[language]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Panel>
      </SettingsPage>
      <SettingsPage section="appearance" idPrefix={idPrefix} shown={shown}>
        <AppearancePanel />
      </SettingsPage>
      <SettingsPage section="graph-folder" idPrefix={idPrefix} shown={shown}>
        <Panel title={t.settings.graphFolder} initial="rubric" level={3}>
          <div className="panel__body field">
            <code className="call settings-window__path">{current?.graphFolder}</code>
            <p className="field__hint">{t.settings.graphFolderHint}</p>
          </div>
        </Panel>
      </SettingsPage>
      <SettingsPage section="backup" idPrefix={idPrefix} shown={shown}>
        <BackupPanel />
      </SettingsPage>
      <SettingsPage section="chatgpt" idPrefix={idPrefix} shown={shown}>
        <Panel title={t.chatgpt.title} initial="rubric" level={3}>
          <div className="panel__body stack">
            <p className="field__hint">{t.chatgpt.intro}</p>
            <ChatGptConnection />
          </div>
        </Panel>
      </SettingsPage>
      <SettingsPage section="site" idPrefix={idPrefix} shown={shown}>
        <SitePanel folder={current?.siteFolder ?? null} />
      </SettingsPage>
    </>
  );
}

function SitePanel({ folder }: { readonly folder: string | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const done = () => {
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  };
  return (
    <Panel title={t.settings.site} initial="accent" level={3}>
      <div className="panel__body field">
        {folder === null ? (
          <p className="empty">{t.settings.siteNotChosen}</p>
        ) : (
          <code className="call settings-window__path">{folder}</code>
        )}
        <p className="field__hint">{t.settings.siteHint}</p>
        <p>
          <button ref={opener} type="button" className="button" onClick={() => setOpen(true)}>
            {t.writing.chooseSite}
          </button>
        </p>
      </div>
      {open ? <SiteFolderSheet initial={folder ?? ""} onDone={done} onClose={done} /> : null}
    </Panel>
  );
}
