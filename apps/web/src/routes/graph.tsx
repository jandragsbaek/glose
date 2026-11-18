import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { type GraphView, type Source } from "@glose/contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Plus, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { NewNote } from "../components/NewNote.tsx";
import { Research } from "../components/Research.tsx";
import { RewriteNote } from "../components/RewriteNote.tsx";
import { linkingOf, NodePanel, wikilinks } from "../components/GraphNodePanel.tsx";
import { GraphStage } from "../components/GraphStage.tsx";
import { AiKey, SourceList } from "../components/GraphLists.tsx";
import { Page, Panel, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import type { GraphCanvas, GraphCanvasEvents } from "../graph/GraphCanvas.ts";
import {
  findNodes,
  indexGraph,
  holdsAiText,
  labelOf,
  narrowToAiText,
} from "../graph/graphIndex.ts";
import { DRAFT_NODE, newDraftId, pagesOf, proposedLinksOf, withDraft } from "../graph/newNote.ts";
import { useT } from "../i18n/I18n.tsx";
import { graphAtom, sourcesAtom } from "../state/graph.ts";
import { noSessionAtom, sessionAtom } from "../state/sessions.ts";

export const Route = createFileRoute("/graph")({
  component: GraphSection,
  validateSearch: (search: Record<string, unknown>): { readonly node?: string } =>
    typeof search.node === "string" ? { node: search.node } : {},
});

function GraphSection() {
  const t = useT();
  const graph = useAtomValue(graphAtom);
  const refresh = useAtomRefresh(graphAtom);
  const [starting, setStarting] = useState(false);
  return AsyncResult.matchWithError(graph, {
    onInitial: () => <GraphLoading />,
    onError: () => <GraphProblem onRetry={refresh} />,
    onDefect: () => <GraphProblem onRetry={refresh} />,
    onSuccess: ({ value }) =>
      value.nodes.length === 0 && !starting ? (
        <Page
          title={t.graph.title}
          actions={
            <button
              type="button"
              className="button button--primary"
              onClick={() => setStarting(true)}
            >
              <Plus size={16} aria-hidden="true" />
              {t.newNote.open}
            </button>
          }
        >
          <div className="narrow">
            <Panel title={t.graph.title} initial="rubric">
              <div className="panel__body">
                <p className="empty">{t.graph.empty}</p>
              </div>
            </Panel>
          </div>
        </Page>
      ) : (
        <GraphWithSources
          view={value}
          startNew={value.nodes.length === 0}
          onEmpty={() => setStarting(false)}
        />
      ),
  });
}

function GraphWithSources({
  view,
  startNew,
  onEmpty,
}: {
  readonly view: GraphView;
  readonly startNew: boolean;
  readonly onEmpty: () => void;
}) {
  const sources = useAtomValue(sourcesAtom);
  const refresh = useAtomRefresh(sourcesAtom);
  return AsyncResult.matchWithError(sources, {
    onInitial: () => <GraphLoading />,
    onError: () => <GraphProblem onRetry={refresh} />,
    onDefect: () => <GraphProblem onRetry={refresh} />,
    onSuccess: ({ value }) => (
      <GraphPage view={view} sources={value} startNew={startNew} onEmpty={onEmpty} />
    ),
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

type Desk =
  | { readonly kind: "rewrite"; readonly id: string }
  | { readonly kind: "new"; readonly draft: string };

type Wanted =
  | { readonly kind: "rewrite"; readonly id: string; readonly onCanvas: boolean }
  | { readonly kind: "new" };

const NO_LINKS: ReadonlySet<string> = new Set();

function GraphPage({
  view,
  sources,
  startNew,
  onEmpty,
}: {
  readonly view: GraphView;
  readonly sources: ReadonlyArray<Source>;
  readonly startNew: boolean;
  readonly onEmpty: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const { node: selectedId } = Route.useSearch();
  const [canvas, setCanvas] = useState<GraphCanvas | null>(null);
  const [query, setQuery] = useState("");
  const [desk, setDesk] = useState<Desk | null>(() =>
    startNew ? { kind: "new", draft: newDraftId() } : null,
  );
  const [unsaved, setUnsaved] = useState(false);
  const [requested, setRequested] = useState<Wanted | null>(null);
  const [aiOnly, setAiOnly] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [linked, setLinked] = useState<ReadonlySet<string>>(NO_LINKS);
  const [leafWidth, setLeafWidth] = useState(0);
  const [research, setResearch] = useState<{ readonly draft: string; readonly id: string } | null>(
    null,
  );
  const opener = useRef<HTMLButtonElement>(null);
  const newOpener = useRef<HTMLButtonElement>(null);
  const openedOnCanvas = useRef(false);
  const findId = useId();

  const researchId = desk?.kind === "new" && research?.draft === desk.draft ? research.id : null;
  const researchSession = AsyncResult.getOrElse(
    useAtomValue(researchId === null ? noSessionAtom : sessionAtom(researchId)),
    () => null,
  );
  const keptPages =
    researchSession === null
      ? 0
      : pagesOf(researchSession.entries).filter((page) => page.state === "kept").length;
  const proposed =
    researchSession === null
      ? []
      : proposedLinksOf(researchSession.entries).map((link) => link.note);

  const index = indexGraph(view, sources);
  const labels = new Map(view.nodes.map((node) => [node.id, labelOf(node, index)]));
  const selected = selectedId === undefined ? undefined : index.byId.get(selectedId);
  const rewriting = desk?.kind === "rewrite" ? desk.id : null;
  const rewritten = rewriting === null ? undefined : index.byId.get(rewriting);
  const drafting = desk?.kind === "new" ? desk : null;
  const stageView = drafting === null ? view : withDraft(view);
  const stageLabels =
    drafting === null
      ? labels
      : new Map([
          ...labels,
          [DRAFT_NODE, { text: newTitle.trim() || t.newNote.draftNode, call: null }],
        ]);

  const found = findNodes(view, labels, query);
  const unwritten = view.nodes.filter(holdsAiText);
  if (aiOnly && unwritten.length === 0) setAiOnly(false);
  const showAi = aiOnly && unwritten.length > 0;
  const shown = narrowToAiText(found, unwritten, showAi);
  const matches = shown === null ? null : new Set(shown.map((node) => node.id));
  const findings = found === null ? null : shown;

  const select = (id: string | null) =>
    navigate({ to: "/graph", search: id === null ? {} : { node: id } });
  const newChanged = newTitle.trim() !== "" || newText.trim() !== "" || keptPages > 0;
  const dirty = desk?.kind === "rewrite" ? unsaved : desk?.kind === "new" ? newChanged : false;

  const apply = (wanted: Wanted) => {
    setRequested(null);
    setUnsaved(false);
    if (wanted.kind === "rewrite") {
      openedOnCanvas.current = wanted.onCanvas;
      setDesk({ kind: "rewrite", id: wanted.id });
      return;
    }
    setNewTitle("");
    setNewText("");
    setLinked(NO_LINKS);
    setDesk({ kind: "new", draft: newDraftId() });
  };
  const want = (wanted: Wanted) => {
    const same =
      (wanted.kind === "new" && desk?.kind === "new") ||
      (wanted.kind === "rewrite" && desk?.kind === "rewrite" && desk.id === wanted.id);
    if (same) return;
    if (desk !== null && dirty) {
      setRequested(wanted);
      return;
    }
    apply(wanted);
  };
  const rewrite = (id: string, onCanvas = false) => want({ kind: "rewrite", id, onCanvas });
  const closeDesk = () => {
    if (requested !== null) {
      apply(requested);
      return;
    }
    const was = desk?.kind;
    flushSync(() => {
      setDesk(null);
      setUnsaved(false);
    });
    if (view.nodes.length === 0) onEmpty();
    else returnFocus(was);
  };
  const returnFocus = (was: Desk["kind"] | undefined) => {
    if (was === "new") newOpener.current?.focus();
    else if (openedOnCanvas.current) canvas?.focus();
    else opener.current?.focus();
  };
  const show = (id: string) => canvas?.centerOn(id);
  const events: GraphCanvasEvents = {
    onSelect: (id) => {
      if (id !== DRAFT_NODE) void select(id);
    },
    onOpen: (id) => {
      if (id === DRAFT_NODE) return;
      if (index.byId.get(id)?.kind === "source") {
        void navigate({ to: "/sources/$sourceId", params: { sourceId: id } });
        return;
      }
      if (id !== selected?.id) void select(id);
      rewrite(id, true);
    },
  };

  const framing = drafting === null || leafWidth === 0 ? "" : [DRAFT_NODE, ...proposed].join("\n");
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the canvas is imperative: it frames the new Note, and the Notes the AI proposes to link, once they are drawn.
  useEffect(() => {
    if (canvas === null || framing === "") return;
    const ids = framing.split("\n");
    const frame = requestAnimationFrame(() =>
      ids.length === 1 ? canvas.centerOn(ids[0]!) : canvas.frame(ids),
    );
    return () => cancelAnimationFrame(frame);
  }, [canvas, framing]);

  const notes = view.nodes.filter((node) => node.kind === "note").length;
  return (
    <Page
      title={t.graph.title}
      sub={t.graph.counts(notes, view.nodes.length - notes, view.links.length)}
      fill
      actions={
        <>
          <form
            className="graph-find"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const first = findings?.[0];
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
              {findings === null ? "" : t.graph.found(findings.length)}
            </span>
          </form>
          <button
            ref={newOpener}
            type="button"
            className="button button--primary"
            aria-keyshortcuts="N"
            onClick={() => want({ kind: "new" })}
          >
            <Plus size={16} aria-hidden="true" />
            {t.newNote.open}
            <kbd className="key" aria-hidden="true">
              {t.newNote.key}
            </kbd>
          </button>
        </>
      }
    >
      <div className="graph">
        <div
          className={drafting === null ? "graph__work" : "graph__work graph__work--leaf"}
          onKeyDown={(event) => {
            if (
              event.key.toLowerCase() === "n" &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              event.target instanceof HTMLCanvasElement
            ) {
              event.preventDefault();
              want({ kind: "new" });
            }
          }}
        >
          <GraphStage
            view={stageView}
            labels={stageLabels}
            selectedId={drafting === null ? (selected?.id ?? null) : (selected?.id ?? DRAFT_NODE)}
            matches={matches}
            events={events}
            canvas={canvas}
            onCanvas={setCanvas}
            covered={rewritten !== undefined}
            draft={drafting === null ? null : { id: DRAFT_NODE, targets: proposed, linked }}
            insetLeft={drafting === null ? 0 : leafWidth}
            label={t.graph.canvasLabel(view.nodes.length, view.links.length, unwritten.length)}
          >
            <AiKey
              count={unwritten.length}
              notes={notes}
              pressed={showAi}
              onPress={() => setAiOnly(!showAi)}
            />
          </GraphStage>
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
                  setDesk(null);
                  setUnsaved(false);
                  await select(id);
                  requestAnimationFrame(() => returnFocus("rewrite"));
                }}
              />
            </div>
          )}
          {drafting === null ? null : (
            <div
              className="graph__desk graph__desk--leaf"
              ref={(desk) => {
                if (desk === null) return;
                const observer = new ResizeObserver(() => setLeafWidth(desk.offsetWidth));
                observer.observe(desk);
                return () => observer.disconnect();
              }}
            >
              <NewNote
                key={drafting.draft}
                title={newTitle}
                onTitle={setNewTitle}
                text={newText}
                onText={setNewText}
                checked={linked}
                onCheck={(note, on) =>
                  setLinked((now) => {
                    const next = new Set(now);
                    if (on) next.add(note);
                    else next.delete(note);
                    return next;
                  })
                }
                session={researchSession}
                leaving={requested !== null}
                onStay={() => setRequested(null)}
                onClose={closeDesk}
                onSaved={async (id) => {
                  setDesk(null);
                  await select(id);
                  requestAnimationFrame(() => {
                    canvas?.centerOn(id);
                    canvas?.focus();
                  });
                }}
              />
            </div>
          )}
        </div>
        <aside className="graph__side">
          {drafting !== null ? (
            <Research
              draft={drafting.draft}
              session={researchSession}
              title={newTitle}
              text={newText}
              notes={view.nodes.filter((node) => node.kind === "note").map((node) => node.id)}
              onStarted={(draft, id) => setResearch({ draft, id })}
            />
          ) : selected === undefined ? (
            <SourceList index={index} view={view} unwritten={unwritten} onShow={show} />
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
