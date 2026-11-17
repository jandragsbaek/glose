import {
  type GraphNode,
  type GraphView,
  type ResolvedReference,
  type Source,
} from "@glose/contracts";
import { Search } from "lucide-react";
import { useEffect, useId, useRef, useEffectEvent, useState, useSyncExternalStore } from "react";

import type { GraphCanvas, GraphCanvasEvents } from "../graph/GraphCanvas.ts";
import { findNodes, type GraphIndex, indexGraph, labelOf } from "../graph/graphIndex.ts";
import { useT } from "../i18n/I18n.tsx";
import { GraphStage } from "./GraphStage.tsx";
import { StopCall, Trail, type TrailOpened } from "./WritingTrail.tsx";

const BESIDE = "(min-width: 1200px)";

const subscribeBeside = (change: () => void) => {
  const query = window.matchMedia(BESIDE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

export const useGraphFits = () =>
  useSyncExternalStore(
    subscribeBeside,
    () => window.matchMedia(BESIDE).matches,
    () => false,
  );

const storageKey = (pieceId: string) => `glose:writing-graph:${pieceId}`;

export const graphWasOpen = (pieceId: string) => {
  try {
    return window.localStorage.getItem(storageKey(pieceId)) === "open";
  } catch {
    return false;
  }
};

export const rememberGraph = (pieceId: string, open: boolean) => {
  try {
    if (open) window.localStorage.setItem(storageKey(pieceId), "open");
    else window.localStorage.removeItem(storageKey(pieceId));
  } catch {}
};

export const moveGraphMemory = (from: string, to: string) => {
  if (from === to || !graphWasOpen(from)) return;
  rememberGraph(from, false);
  rememberGraph(to, true);
};

const citedNodes = (references: ReadonlyArray<ResolvedReference>) => {
  const numbers = new Map<string, Array<number>>();
  for (const reference of references) {
    const id = reference.noteId ?? reference.source?.id ?? null;
    if (id === null) continue;
    numbers.set(id, [...(numbers.get(id) ?? []), reference.number]);
  }
  return numbers;
};

type Opened = TrailOpened;

const FIND_SHOWN = 8;

const FIND_INSET = 52;

const CONTROLS_INSET = 56;

const unique = (ids: ReadonlyArray<string>) => Array.from(new Set(ids));

const nearStops = (trail: ReadonlyArray<string>, id: string) => {
  const at = trail.indexOf(id);
  return trail.slice(Math.max(0, at - 2), at + 2);
};

export function WritingGraph({
  id,
  view,
  sources,
  references,
  trail,
  open,
  onOpen,
  onClear,
}: {
  readonly id: string;
  readonly view: GraphView;
  readonly sources: ReadonlyArray<Source>;
  readonly references: ReadonlyArray<ResolvedReference>;
  readonly trail: ReadonlyArray<string>;
  readonly open: string | null;
  readonly onOpen: (id: string) => void;
  readonly onClear: () => void;
}) {
  const t = useT();
  const [canvas, setCanvas] = useState<GraphCanvas | null>(null);

  const index = indexGraph(view, sources);
  const labels = new Map(view.nodes.map((node) => [node.id, labelOf(node, index)]));
  const numbers = citedNodes(references);
  const cited = Array.from(numbers.keys());
  const [query, setQuery] = useState("");
  const found = findNodes(view, labels, query);
  const matches = found === null ? null : new Set(found.map((node) => node.id));

  const frameTrail = (stops: ReadonlyArray<string>) => {
    if (canvas === null) return;
    if (stops.length === 1) canvas.centerOn(stops[0] ?? "");
    else canvas.frame(stops);
  };
  const [focusId, setFocusId] = useState<string | null>(null);
  const openNode: Opened = (target, from) => {
    setFocusId(from === "reader" ? target : null);
    onOpen(target);
    setQuery("");
    if (from !== "reader") return;
    if (trail.includes(target)) canvas?.reveal(target);
    else frameTrail(nearStops(followTrail(trail, target), target));
  };
  const showHome = () => {
    const home = unique([...cited, ...trail]);
    if (home.length === 0) canvas?.fit();
    else canvas?.frame(home);
  };
  const events: GraphCanvasEvents = {
    onSelect: (target) => {
      if (target !== null) openNode(target, "graph");
    },
    onOpen: (target) => openNode(target, "graph"),
    onFit: showHome,
  };

  return (
    <aside className="graph-beside" id={id} aria-label={t.writing.graphPanel}>
      <GraphStage
        className="graph-beside__stage"
        view={view}
        labels={labels}
        selectedId={open}
        matches={matches}
        events={events}
        canvas={canvas}
        onCanvas={setCanvas}
        trail={trail}
        cited={cited}
        home={cited}
        insetTop={FIND_INSET}
        fitLabel={trail.length > 0 ? t.writing.showTrail : t.writing.showCited}
        onFit={showHome}
        insetLeft={CONTROLS_INSET}
        label={t.writing.graphCanvasLabel(view.nodes.length, view.links.length)}
      >
        <GraphFind
          index={index}
          query={query}
          found={found}
          onQuery={setQuery}
          onOpen={(target) => openNode(target, "reader")}
        />
        <p className="graph-beside__legend" aria-hidden="true" data-keep-clear="">
          {cited.length === 0 ? null : (
            <span className="graph-beside__key graph-beside__key--cited">
              {t.writing.legendCited}
            </span>
          )}
          {open === null ? null : (
            <span className="graph-beside__key graph-beside__key--open">
              {t.writing.legendOpen}
            </span>
          )}
          {trail.length > 1 ? (
            <span className="graph-beside__key graph-beside__key--trail">
              {t.writing.legendTrail}
            </span>
          ) : null}
        </p>
      </GraphStage>
      <Trail
        index={index}
        numbers={numbers}
        trail={trail}
        open={open}
        focusId={focusId}
        onOpen={openNode}
        onClear={onClear}
      />
    </aside>
  );
}

function GraphFind({
  index,
  query,
  found,
  onQuery,
  onOpen,
}: {
  readonly index: GraphIndex;
  readonly query: string;
  readonly found: ReadonlyArray<GraphNode> | null;
  readonly onQuery: (query: string) => void;
  readonly onOpen: (id: string) => void;
}) {
  const t = useT();
  const findId = useId();
  const resultsId = useId();
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const shown = found?.slice(0, FIND_SHOWN) ?? [];
  const move = (from: Element | null, step: 1 | -1) => {
    const buttons = Array.from(results.current?.querySelectorAll("button") ?? []);
    const at = buttons.findIndex((button) => button === from);
    const next = buttons[at + step];
    if (next !== undefined) next.focus();
    else if (step === -1) input.current?.focus();
  };
  return (
    <div className="graph-beside__find">
      <form
        className="graph-find"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const first = found?.[0];
          if (first !== undefined) onOpen(first.id);
        }}
      >
        <label htmlFor={findId} className="sr-only">
          {t.graph.findLabel}
        </label>
        <Search className="graph-find__icon" aria-hidden="true" />
        <input
          ref={input}
          id={findId}
          className="input graph-find__input"
          type="search"
          data-keep-clear=""
          value={query}
          placeholder={t.graph.findPlaceholder}
          aria-controls={found === null ? undefined : resultsId}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              results.current?.querySelector("button")?.focus();
            } else if (event.key === "Escape" && query !== "") {
              event.preventDefault();
              onQuery("");
            }
          }}
        />
        <span className="graph-find__count" aria-live="polite" data-keep-clear="">
          {found === null ? "" : t.graph.found(found.length)}
        </span>
      </form>
      {found === null ? null : found.length === 0 ? (
        <p className="graph-beside__results graph-beside__none">{t.writing.findNone}</p>
      ) : (
        <div className="graph-beside__results">
          <ul
            ref={results}
            id={resultsId}
            aria-label={t.graph.findLabel}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                move(document.activeElement, event.key === "ArrowDown" ? 1 : -1);
              } else if (event.key === "Escape") {
                onQuery("");
                input.current?.focus();
              }
            }}
          >
            {shown.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  className="graph-beside__pick"
                  onClick={() => onOpen(node.id)}
                >
                  <span className="trail__name">{node.title}</span>
                  <StopCall node={node} index={index} />
                </button>
              </li>
            ))}
          </ul>
          {found.length > shown.length ? (
            <p className="graph-beside__more">{t.writing.findMore(found.length - shown.length)}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export const followTrail = (trail: ReadonlyArray<string>, id: string): ReadonlyArray<string> =>
  trail.includes(id) ? trail : [...trail, id];

export const useGraphKey = (enabled: boolean, onToggle: () => void, mac: boolean) => {
  const toggle = useEffectEvent(onToggle);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a key listener, not state: it lives while the desk can show the panel.
  useEffect(() => {
    if (!enabled) return;
    const listen = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "g" || event.altKey || event.shiftKey) return;
      if (!(mac ? event.metaKey : event.ctrlKey)) return;
      if (event.target instanceof Element && event.target.closest(".cite-slip, dialog")) return;
      event.preventDefault();
      event.stopPropagation();
      toggle();
    };
    window.addEventListener("keydown", listen, { capture: true });
    return () => window.removeEventListener("keydown", listen, { capture: true });
  }, [enabled, mac]);
};
