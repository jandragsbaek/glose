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
import { type ReactNode, useId, useRef, useState } from "react";

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
  return section === undefined ? null : <SettingsDialog start={section} />;
}

const PROBE_BAND = 96;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function sectionNode(leaf: HTMLElement, section: SettingsSection) {
  return leaf.querySelector<HTMLElement>(`[data-section="${section}"]`);
}

function sectionTop(leaf: HTMLElement, node: HTMLElement) {
  return Math.max(0, node.offsetTop - Number.parseFloat(getComputedStyle(leaf).paddingTop));
}

function sectionInView(leaf: HTMLElement): SettingsSection {
  const probe = leaf.scrollTop + PROBE_BAND;
  let found: SettingsSection = SETTINGS_SECTIONS[0];
  for (const section of SETTINGS_SECTIONS) {
    const node = sectionNode(leaf, section);
    if (node !== null && sectionTop(leaf, node) <= probe + 1) found = section;
  }
  return found;
}

function SettingsDialog({ start }: { readonly start: SettingsSection }) {
  const t = useT();
  const navigate = useNavigate();
  const titleId = useId();
  const sectionsId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const veilPressed = useRef(false);
  const travel = useRef<number | null>(null);
  const layout = useRef<ResizeObserver | null>(null);
  const pinnedTop = useRef(0);
  const pinnedHeight = useRef(0);
  const [current, setCurrent] = useState<SettingsSection>(start);
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

  const release = () => {
    layout.current?.disconnect();
    layout.current = null;
    travel.current = null;
  };

  const pin = () => {
    const leaf = leafRef.current;
    const target = leaf === null ? null : sectionNode(leaf, start);
    if (leaf === null || target === null) return;
    leaf.scrollTop = Math.min(sectionTop(leaf, target), leaf.scrollHeight - leaf.clientHeight);
    pinnedTop.current = leaf.scrollTop;
    pinnedHeight.current = leaf.scrollHeight;
  };

  const openDialog = (node: HTMLDialogElement | null) => {
    dialogRef.current = node;
    const leaf = leafRef.current;
    if (node === null || node.open || leaf === null) return;
    node.showModal();
    pin();
    (sectionNode(leaf, start) ?? leaf).focus({ preventScroll: true });
    layout.current = new ResizeObserver(pin);
    if (leaf.firstElementChild !== null) layout.current.observe(leaf.firstElementChild);
  };

  const goTo = (section: SettingsSection) => {
    release();
    setCurrent(section);
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, settings: section }),
      replace: true,
    });
    const leaf = leafRef.current;
    const node = leaf === null ? null : sectionNode(leaf, section);
    if (leaf === null || node === null) return;
    node.focus({ preventScroll: true });
    const top = Math.min(sectionTop(leaf, node), leaf.scrollHeight - leaf.clientHeight);
    if (Math.abs(top - leaf.scrollTop) < 1) return;
    travel.current = top;
    leaf.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  return (
    <dialog
      className="settings-window"
      data-closing={closing ? "" : undefined}
      aria-labelledby={titleId}
      ref={openDialog}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return;
        release();
        leave();
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
                  aria-current={section === current ? "true" : undefined}
                  aria-controls={`${sectionsId}-${section}`}
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
        <div
          ref={leafRef}
          className="settings-window__body"
          tabIndex={-1}
          onWheel={release}
          onPointerDown={release}
          onKeyDown={(event) => {
            if (travel.current !== null) {
              event.currentTarget.scrollTo({ top: travel.current, behavior: "instant" });
            }
            release();
          }}
          onFocus={(event) => {
            const section = event.target.closest<HTMLElement>("[data-section]")?.dataset.section;
            if (layout.current === null && travel.current === null && isSection(section)) {
              setCurrent(section);
            }
          }}
          onScroll={(event) => {
            const leaf = event.currentTarget;
            if (layout.current !== null && Math.abs(leaf.scrollTop - pinnedTop.current) > 1) {
              if (leaf.scrollHeight === pinnedHeight.current) release();
              else pin();
            }
            if (travel.current === null && layout.current === null) setCurrent(sectionInView(leaf));
          }}
          onScrollEnd={() => {
            travel.current = null;
          }}
        >
          <SettingsPanels idPrefix={sectionsId} />
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

function SettingsPanels({ idPrefix }: { readonly idPrefix: string }) {
  const t = useT();
  const settings = useAtomValue(settingsAtom);
  const setLanguage = useAtomSet(setLanguageAtom);
  const current = AsyncResult.getOrElse(
    AsyncResult.map(settings, (view) => view.settings),
    () => null,
  );
  return (
    <div className="settings-window__column">
      <div
        data-section="language"
        id={`${idPrefix}-language`}
        tabIndex={-1}
        role="group"
        aria-label={sectionTitle(t, "language")}
      >
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
      </div>
      <div
        data-section="appearance"
        id={`${idPrefix}-appearance`}
        tabIndex={-1}
        role="group"
        aria-label={sectionTitle(t, "appearance")}
      >
        <AppearancePanel />
      </div>
      <div
        data-section="graph-folder"
        id={`${idPrefix}-graph-folder`}
        tabIndex={-1}
        role="group"
        aria-label={sectionTitle(t, "graph-folder")}
      >
        <Panel title={t.settings.graphFolder} initial="rubric" level={3}>
          <div className="panel__body field">
            <code className="call settings-window__path">{current?.graphFolder}</code>
            <p className="field__hint">{t.settings.graphFolderHint}</p>
          </div>
        </Panel>
      </div>
      <div
        data-section="backup"
        id={`${idPrefix}-backup`}
        tabIndex={-1}
        role="group"
        aria-label={sectionTitle(t, "backup")}
      >
        <BackupPanel />
      </div>
      <div
        data-section="chatgpt"
        id={`${idPrefix}-chatgpt`}
        tabIndex={-1}
        role="group"
        aria-label={sectionTitle(t, "chatgpt")}
      >
        <Panel title={t.chatgpt.title} initial="rubric" level={3}>
          <div className="panel__body stack">
            <p className="field__hint">{t.chatgpt.intro}</p>
            <ChatGptConnection />
          </div>
        </Panel>
      </div>
      <div
        data-section="site"
        id={`${idPrefix}-site`}
        tabIndex={-1}
        role="group"
        aria-label={sectionTitle(t, "site")}
      >
        <SitePanel folder={current?.siteFolder ?? null} />
      </div>
    </div>
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
