import {
  type GraphNode,
  type GraphView,
  linkKey,
  type ResolvedReference,
  type Source,
} from "@glose/contracts";
import { Search } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from "react";

import type { GraphCanvas, GraphCanvasEvents } from "../graph/GraphCanvas.ts";
import { findNodes, type GraphIndex, indexGraph, labelOf } from "../graph/graphIndex.ts";
import { useT } from "../i18n/I18n.tsx";
import { GraphStage } from "./GraphStage.tsx";
import { AiText, MissingLink, NoteText, type WikilinkPart } from "./NoteText.tsx";
import { CallNumber } from "./ui.tsx";

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

const citedNodes = (references: ReadonlyArray<ResolvedReference>) => {
  const numbers = new Map<string, Array<number>>();
  for (const reference of references) {
    const id = reference.noteId ?? reference.source?.id ?? null;
    if (id === null) continue;
    numbers.set(id, [...(numbers.get(id) ?? []), reference.number]);
  }
  return numbers;
};

type Opened = (id: string, from: "graph" | "reader") => void;

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
  const [query, setQuery] = useState("");
  const findId = useId();

  const index = indexGraph(view, sources);
  const labels = new Map(view.nodes.map((node) => [node.id, labelOf(node, index)]));
  const numbers = citedNodes(references);
  const cited = Array.from(numbers.keys());
  const found = findNodes(view, labels, query);
  const matches = found === null ? null : new Set(found.map((node) => node.id));

  const openNode: Opened = (target, from) => {
    onOpen(target);
    if (from === "reader") canvas?.centerOn(target);
  };
  const events: GraphCanvasEvents = {
    onSelect: (target) => {
      if (target !== null) openNode(target, "graph");
    },
    onOpen: (target) => openNode(target, "graph"),
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
        label={t.writing.graphCanvasLabel(view.nodes.length, view.links.length)}
      >
        <form
          className="graph-find graph-beside__find"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const first = found?.[0];
            if (first !== undefined) openNode(first.id, "reader");
          }}
        >
          <label htmlFor={findId} className="sr-only">
            {t.graph.findLabel}
          </label>
          <Search className="graph-find__icon" aria-hidden="true" />
          <input
            id={findId}
            className="input graph-find__input"
            type="search"
            value={query}
            placeholder={t.graph.findPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="graph-find__count" aria-live="polite">
            {found === null ? "" : t.graph.found(found.length)}
          </span>
        </form>
      </GraphStage>
      <Trail
        index={index}
        numbers={numbers}
        trail={trail}
        open={open}
        onOpen={openNode}
        onClear={onClear}
      />
    </aside>
  );
}

function Trail({
  index,
  numbers,
  trail,
  open,
  onOpen,
  onClear,
}: {
  readonly index: GraphIndex;
  readonly numbers: ReadonlyMap<string, ReadonlyArray<number>>;
  readonly trail: ReadonlyArray<string>;
  readonly open: string | null;
  readonly onOpen: Opened;
  readonly onClear: () => void;
}) {
  const t = useT();
  const headingId = useId();
  const openSlip = useRef<HTMLLIElement>(null);
  const focusOpen = useRef(false);
  const stops = trail.flatMap((id) => index.byId.get(id) ?? []);

  const fromReader: Opened = (id, from) => {
    focusOpen.current = from === "reader";
    onOpen(id, from);
  };

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- scroll and focus, not state: the Note just opened comes into view, and takes focus when the reader opened it.
  useLayoutEffect(() => {
    const slip = openSlip.current;
    if (slip === null || open === null) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    slip.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    if (focusOpen.current) {
      slip.querySelector<HTMLElement>(".trail__title")?.focus({ preventScroll: true });
    }
    focusOpen.current = false;
  }, [open]);

  return (
    <section className="graph-beside__reader" aria-labelledby={headingId}>
      <div className="graph-beside__head">
        <h2 className="graph-beside__title" id={headingId}>
          {t.writing.trailTitle}
        </h2>
        {stops.length === 0 ? null : (
          <>
            <span className="graph-beside__count">{t.writing.trailCount(stops.length)}</span>
            <button type="button" className="button button--quiet" onClick={onClear}>
              {t.writing.clearTrail}
            </button>
          </>
        )}
      </div>
      {stops.length === 0 ? (
        <TrailStart index={index} numbers={numbers} onOpen={fromReader} />
      ) : (
        <ol className="trail">
          {stops.map((node, at) =>
            node.id === open ? (
              <li
                key={node.id}
                ref={openSlip}
                className="trail__open"
                aria-current="step"
                aria-label={t.writing.trailOpen(at + 1)}
              >
                <span className="trail__no trail__no--here" aria-hidden="true">
                  {at + 1}
                </span>
                <NoteReader
                  node={node}
                  index={index}
                  numbers={numbers.get(node.id) ?? []}
                  onOpen={fromReader}
                />
              </li>
            ) : (
              <li key={node.id} className="trail__slip">
                <button
                  type="button"
                  aria-label={t.writing.trailStop(at + 1, node.title)}
                  onClick={() => fromReader(node.id, "reader")}
                >
                  <span className="trail__no" aria-hidden="true">
                    {at + 1}
                  </span>
                  <span className="trail__name">{node.title}</span>
                  <StopCall node={node} index={index} />
                </button>
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}

function StopCall({ node, index }: { readonly node: GraphNode; readonly index: GraphIndex }) {
  const source = index.sources.get(node.kind === "source" ? node.id : (node.sourceId ?? ""));
  return source === undefined ? null : <CallNumber source={source} />;
}

function TrailStart({
  index,
  numbers,
  onOpen,
}: {
  readonly index: GraphIndex;
  readonly numbers: ReadonlyMap<string, ReadonlyArray<number>>;
  readonly onOpen: Opened;
}) {
  const t = useT();
  const cited = Array.from(numbers.keys()).flatMap((id) => index.byId.get(id) ?? []);
  return (
    <div className="graph-beside__start">
      <p className="graph-beside__lead">{t.writing.trailEmptyLead}</p>
      <p className="empty">{t.writing.trailEmptyBody}</p>
      <h3 className="subhead">{t.writing.citedHere}</h3>
      {cited.length === 0 ? (
        <p className="empty">{t.writing.noneCited}</p>
      ) : (
        <ul className="graph-beside__cited">
          {cited.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                className="graph-beside__pick"
                onClick={() => onOpen(node.id, "reader")}
              >
                <span className="trail__name">{node.title}</span>
                <StopCall node={node} index={index} />
              </button>
              <span className="graph-beside__as">
                {t.writing.citedAs(numbers.get(node.id) ?? [])}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteReader({
  node,
  index,
  numbers,
  onOpen,
}: {
  readonly node: GraphNode;
  readonly index: GraphIndex;
  readonly numbers: ReadonlyArray<number>;
  readonly onOpen: Opened;
}) {
  const t = useT();
  const isSource = node.kind === "source";
  const source = index.sources.get(isSource ? node.id : (node.sourceId ?? ""));
  const linked = index.linked.get(node.id) ?? [];
  const fromSource = isSource ? linked.filter((other) => other.sourceId === node.id) : [];
  const others = isSource ? linked.filter((other) => other.sourceId !== node.id) : linked;
  const title = (
    <h3 className="trail__title" tabIndex={-1}>
      {node.title}
    </h3>
  );
  const renderLink = (part: WikilinkPart): ReactNode => {
    const target = index.byKey.get(linkKey(part.target));
    return target === undefined ? (
      <MissingLink key={part.at} name={part.target} label={part.label} />
    ) : (
      <button
        key={part.at}
        type="button"
        className="graph__wikilink trail__link"
        onClick={() => onOpen(target.id, "reader")}
      >
        {part.label}
      </button>
    );
  };
  return (
    <article className="trail__note">
      {source === undefined ? (
        isSource ? null : (
          <p className="graph__source graph__source--none">{t.graph.noSource}</p>
        )
      ) : (
        <p className="graph__source trail__source">
          <CallNumber source={source} page={isSource ? null : node.page} />
          {isSource ? (
            <span>{[source.givenName, source.familyName].filter(Boolean).join(" ")}</span>
          ) : (
            <button
              type="button"
              className="trail__source-link"
              onClick={() => onOpen(source.id, "reader")}
            >
              {source.title}
            </button>
          )}
        </p>
      )}
      {node.aiTitle ? <AiText scope="title">{title}</AiText> : title}
      {numbers.length === 0 ? null : <p className="trail__cited">{t.writing.citedAs(numbers)}</p>}
      <NoteText
        markdown={node.body}
        aiText={node.aiText && !node.aiTitle}
        renderLink={renderLink}
      />
      {fromSource.length === 0 ? null : (
        <LinkList title={t.graph.notesFromSource} nodes={fromSource} onOpen={onOpen} />
      )}
      <LinkList title={t.graph.linkCount(others.length)} nodes={others} onOpen={onOpen} />
    </article>
  );
}

function LinkList({
  title,
  nodes,
  onOpen,
}: {
  readonly title: string;
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly onOpen: Opened;
}) {
  const t = useT();
  return (
    <div className="trail__links">
      <h4 className="subhead">{title}</h4>
      {nodes.length === 0 ? (
        <p className="empty">{t.graph.noLinks}</p>
      ) : (
        <ul className="graph__list">
          {nodes.map((other) => (
            <li key={other.id}>
              <button
                type="button"
                className="graph__link trail__pick"
                data-kind={other.kind}
                onClick={() => onOpen(other.id, "reader")}
              >
                {other.title}
              </button>
            </li>
          ))}
        </ul>
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
      event.preventDefault();
      event.stopPropagation();
      toggle();
    };
    window.addEventListener("keydown", listen, { capture: true });
    return () => window.removeEventListener("keydown", listen, { capture: true });
  }, [enabled, mac]);
};
