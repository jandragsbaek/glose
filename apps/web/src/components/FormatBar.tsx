import { Bold, Heading2, Heading3, Italic, type LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

import { useT } from "../i18n/I18n.tsx";
import { isMac } from "./WritingDeskBar.tsx";

export type FormatCommand = "h2" | "h3" | "strong" | "em";

export interface FormatState {
  readonly top: number;
  readonly bottom: number;
  readonly below: boolean;
  readonly left: number;
  readonly level: number;
  readonly strong: boolean;
  readonly em: boolean;
}

const BUTTONS: ReadonlyArray<{
  readonly command: FormatCommand;
  readonly icon: LucideIcon;
  readonly keys: { readonly mac: string; readonly other: string };
  readonly aria: string;
}> = [
  { command: "h2", icon: Heading2, keys: { mac: "⌥⌘2", other: "Ctrl+Shift+2" }, aria: "2" },
  { command: "h3", icon: Heading3, keys: { mac: "⌥⌘3", other: "Ctrl+Shift+3" }, aria: "3" },
  { command: "strong", icon: Bold, keys: { mac: "⌘B", other: "Ctrl+B" }, aria: "B" },
  { command: "em", icon: Italic, keys: { mac: "⌘I", other: "Ctrl+I" }, aria: "I" },
];

export function FormatBar({
  state,
  onFormat,
  onCite,
}: {
  readonly state: FormatState;
  readonly onFormat: (command: FormatCommand) => void;
  readonly onCite: () => void;
}) {
  const t = useT();
  const mac = isMac();
  const bar = useRef<HTMLDivElement | null>(null);
  const below = state.below;
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- layout, not state: the bar is kept inside the text column once its width is known.
  useLayoutEffect(() => {
    const node = bar.current;
    const room = node?.parentElement?.clientWidth;
    if (node === null || room === undefined) return;
    node.style.left = `${Math.max(0, Math.min(state.left, room - node.offsetWidth))}px`;
  });
  const shortcut = (key: string) =>
    key.length === 1 && key >= "0" && key <= "9"
      ? mac
        ? `Meta+Alt+${key}`
        : `Control+Shift+${key}`
      : `${mac ? "Meta" : "Control"}+${key}`;
  const pressed: Record<FormatCommand, boolean> = {
    h2: state.level === 2,
    h3: state.level === 3,
    strong: state.strong,
    em: state.em,
  };
  return (
    <div
      ref={bar}
      className={below ? "format-bar format-bar--below" : "format-bar"}
      role="toolbar"
      aria-label={t.writing.formatLabel}
      style={{ top: below ? state.bottom + 4 : state.top, left: state.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {BUTTONS.map(({ command, icon: Icon, keys, aria }) => {
        const key = mac ? keys.mac : keys.other;
        return (
          <button
            key={command}
            type="button"
            className="format-bar__button"
            aria-pressed={pressed[command]}
            aria-keyshortcuts={shortcut(aria)}
            aria-label={t.writing.format[command]}
            title={`${t.writing.format[command]} · ${key}`}
            onClick={() => onFormat(command)}
          >
            <Icon className="format-bar__icon" aria-hidden="true" />
          </button>
        );
      })}
      <span className="format-bar__rule" aria-hidden="true" />
      <button
        type="button"
        className="format-bar__button format-bar__button--cite"
        aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
        title={`${t.writing.cite} · ${mac ? "⌘K" : "Ctrl+K"}`}
        onClick={onCite}
      >
        {t.writing.citeShort}
      </button>
    </div>
  );
}
