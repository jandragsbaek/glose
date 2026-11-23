import { useEffect, useId, useRef, useState } from "react";

import { PENCIL_GROUPS, type PencilGroup, pencilKnows } from "../domain/pencil.ts";
import { useT } from "../i18n/I18n.tsx";
import { isMac } from "./WritingDeskBar.tsx";
import type { PencilText } from "./prosePencil.ts";

const GROUPS_KEY = "glose:pencil-groups";
const keptKey = (pieceId: string) => `glose:pencil-kept:${pieceId}`;

const readGroups = (): ReadonlySet<PencilGroup> => {
  try {
    const saved = window.localStorage.getItem(GROUPS_KEY);
    if (saved === null) return new Set(PENCIL_GROUPS);
    const list: unknown = JSON.parse(saved);
    return new Set(
      Array.isArray(list) ? PENCIL_GROUPS.filter((group) => list.includes(group)) : PENCIL_GROUPS,
    );
  } catch {
    return new Set(PENCIL_GROUPS);
  }
};

const readKept = (pieceId: string): ReadonlySet<string> => {
  try {
    const list: unknown = JSON.parse(window.localStorage.getItem(keptKey(pieceId)) ?? "[]");
    return new Set(Array.isArray(list) ? list.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
};

const write = (key: string, value: ReadonlyArray<string>) => {
  try {
    if (value.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const movePencilMemory = (from: string, to: string) => {
  if (from === to) return;
  const kept = readKept(from);
  if (kept.size === 0) return;
  write(keptKey(to), [...kept]);
  write(keptKey(from), []);
};

export function useDeskPencil(piece: React.RefObject<string>, language: string) {
  const t = useT();
  const [on, setOn] = useState(readGroups);
  const [kept, setKept] = useState(() => readKept(piece.current));
  const [count, setCount] = useState(0);
  const slip = useRef<HTMLDetailsElement | null>(null);
  const pencilT = t.writing.pencil;
  const text: PencilText = {
    name: pencilT.name,
    groups: pencilT.groups,
    rules: pencilT.rules,
    why: pencilT.why,
    judgement: pencilT.judgement,
    tryOther: pencilT.tryOther,
    tryKeys: isMac() ? "⇧⌘A" : "Ctrl+Shift+A",
    keep: pencilT.keep,
    settings: pencilT.settings,
  };
  const toggle = (group: PencilGroup) => {
    const next = new Set(on);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setOn(next);
    write(
      GROUPS_KEY,
      PENCIL_GROUPS.filter((each) => next.has(each)),
    );
    if (next.size === 0) setCount(0);
  };
  const keep = (key: string) => {
    const next = new Set(kept);
    next.add(key);
    setKept(next);
    write(keptKey(piece.current), [...next]);
  };
  const openSettings = () => {
    const node = slip.current;
    if (node === null) return;
    node.open = true;
    node.querySelector<HTMLElement>("summary")?.focus();
  };
  return {
    editorProps: {
      pencil: {
        on,
        kept,
        text,
        onKeep: keep,
        onSettings: openSettings,
        onCount: setCount,
      },
    },
    button: (
      <PencilButton
        slip={slip}
        on={on}
        count={on.size === 0 ? null : count}
        known={pencilKnows(language)}
        onToggle={toggle}
      />
    ),
  };
}

function PencilButton({
  slip,
  on,
  count,
  known,
  onToggle,
}: {
  readonly slip: React.RefObject<HTMLDetailsElement | null>;
  readonly on: ReadonlySet<PencilGroup>;
  readonly count: number | null;
  readonly known: boolean;
  readonly onToggle: (group: PencilGroup) => void;
}) {
  const t = useT();
  const id = useId();
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- listeners, not state: the open slip closes on a click outside it or on Esc, as a menu does.
  useEffect(() => {
    const close = (event: Event) => {
      const node = slip.current;
      if (node === null || !node.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        node.open = false;
        node.querySelector<HTMLElement>("summary")?.focus();
      } else if (!node.contains(event.target as Node)) {
        node.open = false;
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [slip]);
  const groups = known
    ? PENCIL_GROUPS
    : PENCIL_GROUPS.filter((g) => g === "repetition" || g === "mechanics");
  return (
    <details className="pencil" ref={slip}>
      <summary className="button pencil__button" data-on={on.size > 0 ? "" : undefined}>
        {t.writing.pencil.name}
        {count === null ? (
          <span className="pencil__count">{t.writing.pencil.off}</span>
        ) : (
          <>
            <span className="pencil__count" aria-hidden="true">
              {count}
            </span>
            <span className="sr-only">: {t.writing.pencil.countLabel(count)}</span>
          </>
        )}
      </summary>
      <div className="pencil__panel" role="group" aria-labelledby={`${id}-head`}>
        <p className="pencil__head">
          <span id={`${id}-head`} className="pencil__title">
            {t.writing.pencil.name}
          </span>
          <span className="pencil__lead">{t.writing.pencil.lead}</span>
        </p>
        {groups.map((group) => (
          <label key={group} className="pencil__group">
            <span>
              <span className="pencil__group-name">{t.writing.pencil.groups[group]}</span>
              <span className="pencil__group-text">{t.writing.pencil.groupText[group]}</span>
            </span>
            <input type="checkbox" checked={on.has(group)} onChange={() => onToggle(group)} />
          </label>
        ))}
        <p className="pencil__note">
          {known
            ? t.writing.pencil.when(isMac() ? "⌘." : "Ctrl+.")
            : t.writing.pencil.otherLanguage}
        </p>
      </div>
    </details>
  );
}
