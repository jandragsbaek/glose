import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import {
  DEFAULT_TEXT,
  foldOf,
  LEAF_FOLDED_PADDING,
  leafWidthOf,
  measureOf,
  useWritingText,
} from "../theme/writingText.ts";
import type { ProseHandle } from "./ProseEditor.tsx";
import { keepPlace, type PlaceInText, placeInProof, placeInText } from "./deskPlace.ts";
import { graphWasOpen, rememberGraph, useGraphFits, useGraphKey } from "./WritingGraph.tsx";
import { isMac } from "./WritingDeskBar.tsx";

function useDeskWidth(desk: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState<number | null>(null);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- an observer, not state: the desk's width comes from the window and the Graph beside it, outside React.
  useLayoutEffect(() => {
    const node = desk.current;
    if (node === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [desk]);
  return width;
}

export function useDeskText(
  desk: React.RefObject<HTMLElement | null>,
  mode: "write" | "proof",
  focus: boolean,
) {
  const text = useWritingText();
  const width = useDeskWidth(desk);
  if (mode !== "write") {
    const fold = width === null ? "none" : foldOf(width, leafWidthOf(DEFAULT_TEXT));
    return {
      className: "writing-desk",
      "data-fold": fold === "none" ? undefined : fold,
    };
  }
  const leaf = leafWidthOf(text);
  const fold = width === null ? "none" : foldOf(width, leaf);
  return {
    className: "writing-desk writing-text",
    "data-face": text.face,
    "data-fold": focus || fold === "none" ? undefined : fold,
    style: {
      "--prose-size": `${text.size}px`,
      "--leaf-width": `${leaf}px`,
      "--leaf-folded": `${measureOf(text) + LEAF_FOLDED_PADDING}px`,
    } as React.CSSProperties,
  };
}

export function useFocusKeys(enabled: boolean, focus: boolean, onToggle: () => void, mac: boolean) {
  const toggle = useEffectEvent(onToggle);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a key listener, not state: Ctrl+Shift+F (⇧⌘F) turns Focus on and off in Write, and Esc leaves it once no slip took the key.
  useEffect(() => {
    if (!enabled) return;
    const listen = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("dialog")) return;
      const keys =
        event.key.toLowerCase() === "f" &&
        event.shiftKey &&
        !event.altKey &&
        (mac ? event.metaKey : event.ctrlKey);
      const leave = focus && event.key === "Escape" && !event.defaultPrevented;
      if (!keys && !leave) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", listen);
    return () => window.removeEventListener("keydown", listen);
  }, [enabled, focus, mac]);
}

export function useFocusPage(focus: boolean) {
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the page outside the desk, not state: in Focus the rail and the status bar step aside.
  useLayoutEffect(() => {
    if (!focus) return;
    const root = document.documentElement;
    root.dataset.writingFocus = "";
    return () => {
      delete root.dataset.writingFocus;
    };
  }, [focus]);
}

export function FocusFoot({
  saved,
  words,
  onLeave,
}: {
  readonly saved: string;
  readonly words: number;
  readonly onLeave: () => void;
}) {
  const t = useT();
  return (
    <div className="focus-foot">
      <span className="focus-foot__state" role="status">
        {t.writing.focusState(saved, words)}
      </span>
      <button
        type="button"
        className="button button--small focus-foot__leave"
        aria-keyshortcuts="Escape"
        onClick={onLeave}
      >
        {t.writing.leaveFocus}
        <kbd className="key" aria-hidden="true">
          {t.settings.closeKey}
        </kbd>
      </button>
    </div>
  );
}

export function useDeskLayout({
  pieceId,
  savedId,
  mode,
  setMode,
  editor,
  editorBox,
  leaf,
  graphReady,
}: {
  readonly pieceId: string;
  readonly savedId: React.RefObject<string>;
  readonly mode: "write" | "proof";
  readonly setMode: (mode: "write" | "proof") => void;
  readonly editor: React.RefObject<ProseHandle | null>;
  readonly editorBox: React.RefObject<HTMLDivElement | null>;
  readonly leaf: React.RefObject<HTMLElement | null>;
  readonly graphReady: boolean;
}) {
  const [graphOpen, setGraphOpen] = useState(() => graphWasOpen(pieceId));
  const [focus, setFocus] = useState(false);
  const graphFits = useGraphFits();
  const deskBox = useRef<HTMLDivElement | null>(null);
  const deskText = useDeskText(deskBox, mode, focus);
  const place = useRef<PlaceInText | null>(null);

  const holdPlace = (refocus: boolean) => {
    const kept =
      mode === "write"
        ? placeInText(editor.current, editorBox.current)
        : placeInProof(leaf.current);
    place.current = {
      pos: kept?.pos ?? null,
      anchor: kept?.anchor ?? null,
      offset: kept?.offset ?? 0,
      refocus,
    };
  };
  const showGraph = (open: boolean) => {
    setGraphOpen(open);
    rememberGraph(savedId.current, open);
  };
  const toggleGraph = () => {
    if (focus) {
      holdPlace(true);
      setFocus(false);
      if (!graphOpen) showGraph(true);
      return;
    }
    holdPlace(graphOpen && document.activeElement?.closest(".graph-beside") != null);
    showGraph(!graphOpen);
  };
  const toggleFocus = () => {
    if (mode !== "write") return;
    holdPlace(true);
    setFocus(!focus);
  };
  const chooseMode = (next: "write" | "proof") => {
    if (next === "proof") setFocus(false);
    setMode(next);
  };
  const besideOpen = graphFits && graphOpen && graphReady && !focus;
  useGraphKey(graphFits && graphReady, toggleGraph, isMac());
  useFocusKeys(mode === "write", focus, toggleFocus, isMac());
  useFocusPage(focus);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- scroll and focus, not state: the line the writer was at stays where it was when the desk changes width, and focus comes back to the text from a closing panel or from Focus.
  useLayoutEffect(() => {
    const kept = place.current;
    place.current = null;
    if (kept === null) return;
    keepPlace(kept, editor.current, editorBox.current);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => keepPlace(kept, editor.current, editorBox.current)),
    );
    if (kept.refocus && (focus || !besideOpen)) {
      if (mode === "write") editor.current?.focus();
      else document.querySelector<HTMLElement>(".desk-bar__graph")?.focus();
    }
  }, [besideOpen, mode, editor, editorBox, focus]);

  return { focus, besideOpen, graphFits, toggleGraph, toggleFocus, chooseMode, deskBox, deskText };
}
