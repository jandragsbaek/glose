import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { type GraphNode, type GraphView, linkKey, type Source } from "@glose/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Search, X } from "lucide-react";
import { type ReactNode, type Ref, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { AiText, MissingLink, NoteText, type WikilinkPart } from "../components/NoteText.tsx";
import { type Linking, RewriteNote } from "../components/RewriteNote.tsx";
import { GraphStage } from "../components/GraphStage.tsx";
import { CallNumber, Page, Panel, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import type { GraphCanvas, GraphCanvasEvents } from "../graph/GraphCanvas.ts";
import { findNodes, type GraphIndex, indexGraph, labelOf } from "../graph/graphIndex.ts";
import { useT } from "../i18n/I18n.tsx";
import { cardsAtom } from "../state/cards.ts";
import { graphAtom, sourcesAtom } from "../state/graph.ts";

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
  const [rewriting, setRewriting] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [requested, setRequested] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const findId = useId();

  const index = indexGraph(view, sources);
  const labels = new Map(view.nodes.map((node) => [node.id, labelOf(node, index)]));
  const selected = selectedId === undefined ? undefined : index.byId.get(selectedId);
  const rewritten = rewriting === null ? undefined : index.byId.get(rewriting);

  const found = findNodes(view, labels, query);
  const matches = found === null ? null : new Set(found.map((node) => node.id));

  const select = (id: string | null) =>
    navigate({ to: "/graph", search: id === null ? {} : { node: id } });
  const openDesk = (id: string) => {
    setRequested(null);
    setUnsaved(false);
    setRewriting(id);
  };
  const rewrite = (id: string) => {
    if (rewriting !== null && rewriting !== id && unsaved) setRequested(id);
    else openDesk(id);
  };
  const closeDesk = () => {
    if (requested !== null) {
      openDesk(requested);
      return;
    }
    flushSync(() => {
      setRewriting(null);
      setUnsaved(false);
    });
    opener.current?.focus();
  };
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
        <div className="graph__work">
          <GraphStage
            view={view}
            labels={labels}
            selectedId={selected?.id ?? null}
            matches={matches}
            events={events}
            canvas={canvas}
            onCanvas={setCanvas}
            covered={rewritten !== undefined}
          />
          {rewritten === undefined ? null : (
            <div className="graph__desk">
              <RewriteNote
                key={rewritten.id}
                node={rewritten}
                source={index.sources.get(rewritten.sourceId ?? "")}
                linking={linkingOf(rewritten, view, index)}
                renderLink={wikilinks(index, show)}
                leaving={requested !== null}
                onStay={() => setRequested(null)}
                onChanged={setUnsaved}
                onClose={closeDesk}
                onSaved={async (id) => {
                  setRewriting(null);
                  setUnsaved(false);
                  await select(id);
                  requestAnimationFrame(() => opener.current?.focus());
                }}
              />
            </div>
          )}
        </div>
        <aside className="graph__side">
          {selected === undefined ? (
            <SourceList index={index} view={view} onShow={show} />
          ) : (
            <NodePanel
              key={selected.id}
              node={selected}
              index={index}
              rewriting={selected.id === rewritten?.id}
              onShow={show}
              opener={opener}
              onRewrite={() => rewrite(selected.id)}
              onClose={() => void select(null)}
            />
          )}
        </aside>
      </div>
    </Page>
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
  rewriting,
  opener,
  onShow,
  onRewrite,
  onClose,
}: {
  readonly node: GraphNode;
  readonly index: GraphIndex;
  readonly rewriting: boolean;
  readonly opener: Ref<HTMLButtonElement>;
  readonly onShow: (id: string) => void;
  readonly onRewrite: () => void;
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
      initial={isSource ? "accent" : "rubric"}
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
        {node.aiTitle ? (
          <AiText scope="title">
            <h3 className="graph__title">{node.title}</h3>
          </AiText>
        ) : (
          <h3 className="graph__title">{node.title}</h3>
        )}
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
            <CallNumber source={source} page={node.page} />
            <NodeLink id={source.id} className="graph__link" onShow={onShow}>
              {source.title}
            </NodeLink>
          </p>
        )}
        {rewriting ? null : (
          <NoteText
            markdown={node.body}
            aiText={node.aiText && !node.aiTitle}
            renderLink={wikilinks(index, onShow)}
          />
        )}
        {rewriting ? null : isSource ? (
          <p>
            <Link to="/sources/$sourceId" params={{ sourceId: node.id }} className="button">
              {t.graph.openSource}
            </Link>
          </p>
        ) : (
          <NoteCards noteId={node.id} aiText={node.aiText} opener={opener} onRewrite={onRewrite} />
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

function NoteCards({
  noteId,
  aiText,
  opener,
  onRewrite,
}: {
  readonly noteId: string;
  readonly aiText: boolean;
  readonly opener: Ref<HTMLButtonElement>;
  readonly onRewrite: () => void;
}) {
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
      <button
        ref={opener}
        type="button"
        className={aiText ? "button button--primary" : "button"}
        onClick={onRewrite}
      >
        {aiText ? t.graph.rewrite : t.graph.edit}
      </button>
      <Link to="/notes/$noteId/cards" params={{ noteId }} className="button">
        {t.graph.makeCards}
      </Link>
      {count === null ? null : <span className="status">{t.graph.cardCount(count)}</span>}
    </p>
  );
}

const wikilinks =
  (index: GraphIndex, onShow: (id: string) => void) =>
  (part: WikilinkPart): ReactNode => {
    const target = index.byKey.get(linkKey(part.target));
    return target === undefined ? (
      <MissingLink key={part.at} name={part.target} label={part.label} />
    ) : (
      <NodeLink key={part.at} id={target.id} className="graph__wikilink" onShow={onShow}>
        {part.label}
      </NodeLink>
    );
  };

function linkingOf(node: GraphNode, view: GraphView, index: GraphIndex): Linking {
  const from = view.links
    .filter((link) => link.to === node.id && link.from !== node.id)
    .map((link) => index.byId.get(link.from));
  return {
    notes: from.filter((other) => other?.kind === "note").length,
    sources: from.filter((other) => other?.kind === "source").length,
  };
}

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
