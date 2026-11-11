import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { type GraphNode, type GraphView, linkKey, type Source } from "@glose/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Maximize, Minus, Plus, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { MissingLink, NoteText } from "../components/NoteText.tsx";
import { CallNumber, Page, Panel, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import { callNumber } from "../domain/source.ts";
import { GraphCanvas, type GraphCanvasEvents, type NodeLabel } from "../graph/GraphCanvas.ts";
import { useT } from "../i18n/I18n.tsx";
import { cardsAtom } from "../state/cards.ts";
import { graphAtom, sourcesAtom } from "../state/graph.ts";

/** `?node=` names the selected node, so Back returns to the Note read before. */
export const Route = createFileRoute("/graph")({
  component: GraphSection,
  validateSearch: (search: Record<string, unknown>): { readonly node?: string } =>
    typeof search.node === "string" ? { node: search.node } : {},
});

function GraphSection() {
  const t = useT();
  const graph = useAtomValue(graphAtom);
  const refresh = useAtomRefresh(graphAtom);
  return AsyncResult.matchWithError(graph, {
    onInitial: () => <GraphLoading />,
    onError: () => <GraphProblem onRetry={refresh} />,
    onDefect: () => <GraphProblem onRetry={refresh} />,
    onSuccess: ({ value }) =>
      value.nodes.length === 0 ? (
        <Page title={t.graph.title}>
          <div className="narrow">
            <Panel title={t.graph.title} initial="rubric">
              <div className="panel__body">
                <p className="empty">{t.graph.empty}</p>
              </div>
            </Panel>
          </div>
        </Page>
      ) : (
        <GraphWithSources view={value} />
      ),
  });
}

/** Source nodes wear their call number, which needs the Sources' bibliographic data. */
function GraphWithSources({ view }: { readonly view: GraphView }) {
  const sources = useAtomValue(sourcesAtom);
  const refresh = useAtomRefresh(sourcesAtom);
  return AsyncResult.matchWithError(sources, {
    onInitial: () => <GraphLoading />,
    onError: () => <GraphProblem onRetry={refresh} />,
    onDefect: () => <GraphProblem onRetry={refresh} />,
    onSuccess: ({ value }) => <GraphPage view={view} sources={value} />,
  });
}

function GraphLoading() {
  const t = useT();
  return (
    <Page title={t.graph.title}>
      <SkeletonPanel />
    </Page>
  );
}

function GraphProblem({ onRetry }: { readonly onRetry: () => void }) {
  const t = useT();
  return (
    <Page title={t.graph.title}>
      <div className="narrow">
        <StorageProblem onRetry={onRetry} />
      </div>
    </Page>
  );
}

/** The Graph and what one node holds, joined: Links in both directions, Sources by id. */
interface GraphIndex {
  readonly byId: ReadonlyMap<string, GraphNode>;
  readonly byKey: ReadonlyMap<string, GraphNode>;
  readonly sources: ReadonlyMap<string, Source>;
  readonly linked: ReadonlyMap<string, ReadonlyArray<GraphNode>>;
}

const indexGraph = (view: GraphView, sources: ReadonlyArray<Source>): GraphIndex => {
  const byId = new Map(view.nodes.map((node) => [node.id, node]));
  const linked = new Map<string, Set<GraphNode>>(view.nodes.map((node) => [node.id, new Set()]));
  for (const link of view.links) {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (from === undefined || to === undefined) continue;
    linked.get(from.id)?.add(to);
    linked.get(to.id)?.add(from);
  }
  return {
    byId,
    byKey: new Map(view.nodes.map((node) => [linkKey(node.id), node])),
    sources: new Map(sources.map((source) => [source.id, source])),
    linked: new Map(
      Array.from(linked, ([id, nodes]) => [
        id,
        Array.from(nodes).sort((a, b) => a.title.localeCompare(b.title)),
      ]),
    ),
  };
};

const labelOf = (node: GraphNode, index: GraphIndex): NodeLabel => {
  const source = index.sources.get(node.id);
  return {
    text: node.title,
    call: node.kind === "source" && source !== undefined ? callNumber(source) : null,
  };
};

function GraphPage({
  view,
  sources,
}: {
  readonly view: GraphView;
  readonly sources: ReadonlyArray<Source>;
}) {
  const t = useT();
  const navigate = useNavigate();
  const { node: selectedId } = Route.useSearch();
  const [canvas, setCanvas] = useState<GraphCanvas | null>(null);
  const [query, setQuery] = useState("");
  const findId = useId();

  const index = indexGraph(view, sources);
  const labels = new Map(view.nodes.map((node) => [node.id, labelOf(node, index)]));
  const selected = selectedId === undefined ? undefined : index.byId.get(selectedId);

  const needle = query.trim().toLocaleLowerCase();
  const found =
    needle === ""
      ? null
      : view.nodes.filter((node) =>
          [node.title, labels.get(node.id)?.call ?? ""].some((text) =>
            text.toLocaleLowerCase().includes(needle),
          ),
        );
  const matches = found === null ? null : new Set(found.map((node) => node.id));

  const select = (id: string | null) =>
    navigate({ to: "/graph", search: id === null ? {} : { node: id } });
  /** A node chosen outside the canvas (side panel, search) is brought into view. */
  const show = (id: string) => canvas?.centerOn(id);
  const events: GraphCanvasEvents = {
    onSelect: (id) => void select(id),
    onOpen: (id) => {
      if (index.byId.get(id)?.kind === "source") {
        void navigate({ to: "/sources/$sourceId", params: { sourceId: id } });
      }
    },
  };

  const notes = view.nodes.filter((node) => node.kind === "note").length;
  return (
    <Page
      title={t.graph.title}
      sub={t.graph.counts(notes, view.nodes.length - notes, view.links.length)}
      fill
      actions={
        <form
          className="graph-find"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const first = found?.[0];
            if (first === undefined) return;
            void select(first.id);
            show(first.id);
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
      }
    >
      <div className="graph">
        <GraphStage
          view={view}
          labels={labels}
          selectedId={selected?.id ?? null}
          matches={matches}
          events={events}
          canvas={canvas}
          onCanvas={setCanvas}
        />
        <aside className="graph__side">
          {selected === undefined ? (
            <SourceList index={index} view={view} onShow={show} />
          ) : (
            <NodePanel
              key={selected.id}
              node={selected}
              index={index}
              onShow={show}
              onClose={() => void select(null)}
            />
          )}
        </aside>
      </div>
    </Page>
  );
}

function GraphStage({
  view,
  labels,
  selectedId,
  matches,
  events,
  canvas,
  onCanvas,
}: {
  readonly view: GraphView;
  readonly labels: ReadonlyMap<string, NodeLabel>;
  readonly selectedId: string | null;
  readonly matches: ReadonlySet<string> | null;
  readonly events: GraphCanvasEvents;
  /** The page steers the canvas too, from the side panel and the search. */
  readonly canvas: GraphCanvas | null;
  readonly onCanvas: (canvas: GraphCanvas | null) => void;
}) {
  const t = useT();
  const element = useRef<HTMLCanvasElement>(null);
  const opened = useRef(false);
  const notes = view.nodes.length;

  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- the canvas is an imperative renderer that owns DOM listeners and an animation loop; it lives exactly as long as this element.
  useEffect(() => {
    if (element.current === null) return;
    const instance = new GraphCanvas(element.current);
    onCanvas(instance);
    return () => {
      instance.destroy();
      onCanvas(null);
    };
  }, [onCanvas]);

  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- pushes React's data into the imperative canvas; it keeps node positions across updates.
  useEffect(() => {
    if (canvas === null) return;
    canvas.setEvents(events);
    canvas.setData(view, labels);
    canvas.setSelected(selectedId);
    canvas.setMatches(matches);
    // A link to `/graph?node=…` opens with that node in view.
    if (!opened.current && selectedId !== null) canvas.centerOn(selectedId);
    opened.current = true;
  }, [canvas, events, view, labels, selectedId, matches]);

  return (
    <div className="graph__stage">
      <canvas
        ref={element}
        className="graph__canvas"
        tabIndex={0}
        role="img"
        aria-label={t.graph.canvasLabel(notes, view.links.length)}
      />
      <div className="graph__controls">
        <button
          type="button"
          className="button graph__control"
          aria-label={t.graph.zoomIn}
          title={t.graph.zoomIn}
          onClick={() => canvas?.zoomBy(1.5)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="button graph__control"
          aria-label={t.graph.zoomOut}
          title={t.graph.zoomOut}
          onClick={() => canvas?.zoomBy(1 / 1.5)}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="button graph__control"
          aria-label={t.graph.fit}
          title={t.graph.fit}
          onClick={() => canvas?.fit()}
        >
          <Maximize size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function SourceList({
  index,
  view,
  onShow,
}: {
  readonly index: GraphIndex;
  readonly view: GraphView;
  readonly onShow: (id: string) => void;
}) {
  const t = useT();
  const sources = view.nodes
    .filter((node) => node.kind === "source")
    .sort((a, b) => a.id.localeCompare(b.id));
  return (
    <Panel title={t.graph.sources} initial="rubric">
      <div className="panel__body">
        <p className="graph__help">{t.graph.help}</p>
        <ul className="graph__list">
          {sources.map((node) => {
            const source = index.sources.get(node.id);
            return (
              <li key={node.id}>
                {source === undefined ? null : <CallNumber source={source} />}
                <NodeLink id={node.id} className="graph__link" onShow={onShow}>
                  {node.title}
                </NodeLink>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}

function NodePanel({
  node,
  index,
  onShow,
  onClose,
}: {
  readonly node: GraphNode;
  readonly index: GraphIndex;
  readonly onShow: (id: string) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const isSource = node.kind === "source";
  const source = index.sources.get(isSource ? node.id : (node.sourceId ?? ""));
  const linked = index.linked.get(node.id) ?? [];
  const fromSource = linked.filter((other) => other.sourceId === node.id);
  const others = isSource ? linked.filter((other) => other.sourceId !== node.id) : linked;
  return (
    <Panel
      title={isSource ? t.graph.source : t.graph.note}
      initial={isSource ? "lapis" : "rubric"}
      meta={
        <button
          type="button"
          className="graph__close"
          aria-label={t.graph.close}
          title={t.graph.close}
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
        </button>
      }
    >
      <div className="panel__body graph__node">
        <h3 className="graph__title">{node.title}</h3>
        {isSource ? (
          source === undefined ? null : (
            <p className="graph__source">
              <CallNumber source={source} />
              <span>{[source.givenName, source.familyName].filter(Boolean).join(" ")}</span>
            </p>
          )
        ) : source === undefined ? (
          <p className="graph__source graph__source--none">{t.graph.noSource}</p>
        ) : (
          <p className="graph__source">
            <CallNumber source={source} />
            <NodeLink id={source.id} className="graph__link" onShow={onShow}>
              {source.title}
            </NodeLink>
          </p>
        )}
        <NoteText
          markdown={node.body}
          aiText={node.aiText}
          renderLink={(part) => {
            const target = index.byKey.get(linkKey(part.target));
            return target === undefined ? (
              <MissingLink key={part.at} name={part.target} label={part.label} />
            ) : (
              <NodeLink key={part.at} id={target.id} className="graph__wikilink" onShow={onShow}>
                {part.label}
              </NodeLink>
            );
          }}
        />
        {isSource ? (
          <p>
            <Link to="/sources/$sourceId" params={{ sourceId: node.id }} className="button">
              {t.graph.openSource}
            </Link>
          </p>
        ) : (
          <NoteCards noteId={node.id} />
        )}
      </div>
      {isSource && fromSource.length > 0 ? (
        <div className="panel__body">
          <h4 className="subhead">{t.graph.notesFromSource}</h4>
          <NodeList nodes={fromSource} onShow={onShow} />
        </div>
      ) : null}
      <div className="panel__body">
        <h4 className="subhead">{t.graph.linkCount(others.length)}</h4>
        {others.length === 0 ? (
          <p className="empty">{t.graph.noLinks}</p>
        ) : (
          <NodeList nodes={others} onShow={onShow} />
        )}
      </div>
    </Panel>
  );
}

function NodeList({
  nodes,
  onShow,
}: {
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly onShow: (id: string) => void;
}) {
  return (
    <ul className="graph__list">
      {nodes.map((other) => (
        <li key={other.id}>
          <NodeLink id={other.id} className="graph__link" kind={other.kind} onShow={onShow}>
            {other.title}
          </NodeLink>
        </li>
      ))}
    </ul>
  );
}

/** How many Cards a Note has, and the way to make more. */
function NoteCards({ noteId }: { readonly noteId: string }) {
  const t = useT();
  const cards = useAtomValue(cardsAtom);
  const count = AsyncResult.getOrElse(
    AsyncResult.map(
      cards,
      (all) =>
        all.filter((card) => card.from !== null && linkKey(card.from) === linkKey(noteId)).length,
    ),
    () => null,
  );
  return (
    <p className="button-row">
      <Link to="/notes/$noteId/cards" params={{ noteId }} className="button">
        {t.graph.makeCards}
      </Link>
      {count === null ? null : <span className="status">{t.graph.cardCount(count)}</span>}
    </p>
  );
}

/** A link to a node in the Graph: it selects the node, and Back returns to the one before. */
function NodeLink({
  id,
  kind,
  className,
  onShow,
  children,
}: {
  readonly id: string;
  readonly kind?: GraphNode["kind"];
  readonly className: string;
  readonly onShow: (id: string) => void;
  readonly children: ReactNode;
}) {
  return (
    <Link
      to="/graph"
      search={{ node: id }}
      className={className}
      data-kind={kind}
      onClick={() => onShow(id)}
    >
      {children}
    </Link>
  );
}
