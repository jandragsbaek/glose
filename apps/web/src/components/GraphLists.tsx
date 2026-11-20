import type { GraphNode, GraphView } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { type GraphIndex, holdsAiText, toTend } from "../graph/graphIndex.ts";
import { useT } from "../i18n/I18n.tsx";
import { CallNumber, Panel } from "./ui.tsx";

export function SourceList({
  index,
  view,
  unwritten,
  onShow,
}: {
  readonly index: GraphIndex;
  readonly view: GraphView;
  readonly unwritten: ReadonlyArray<GraphNode>;
  readonly onShow: (id: string) => void;
}) {
  const t = useT();
  const sources = view.nodes
    .filter((node) => node.kind === "source")
    .sort((a, b) => a.id.localeCompare(b.id));
  const people = view.nodes
    .filter((node) => node.kind === "person")
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <div className="graph__panels">
      {unwritten.length === 0 ? null : (
        <ToRewrite notes={unwritten} index={index} onShow={onShow} />
      )}
      <ToTend view={view} onShow={onShow} />
      <Panel title={t.graph.sources} initial={unwritten.length === 0 ? "rubric" : "accent"}>
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
      {people.length === 0 ? null : (
        <Panel title={t.people.people} initial="accent" meta={people.length}>
          <div className="panel__body">
            <ul className="graph__list">
              {people.map((node) => (
                <li key={node.id}>
                  <NodeLink id={node.id} className="graph__link" kind="person" onShow={onShow}>
                    {node.title}
                  </NodeLink>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}
    </div>
  );
}

function ToRewrite({
  notes,
  index,
  onShow,
}: {
  readonly notes: ReadonlyArray<GraphNode>;
  readonly index: GraphIndex;
  readonly onShow: (id: string) => void;
}) {
  const t = useT();
  const ordered = [...notes].sort(
    (a, b) =>
      (a.sourceId ?? "\uffff").localeCompare(b.sourceId ?? "\uffff") ||
      a.title.localeCompare(b.title),
  );
  return (
    <Panel title={t.graph.toRewrite} initial="rubric" meta={t.graph.noteCount(notes.length)}>
      <div className="panel__body">
        <p className="graph__help">{t.graph.toRewriteHelp}</p>
        <ul className="graph__list">
          {ordered.map((node) => {
            const source = index.sources.get(node.sourceId ?? "");
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

const TO_TEND_SHOWN = 8;

function ToTend({
  view,
  onShow,
}: {
  readonly view: GraphView;
  readonly onShow: (id: string) => void;
}) {
  const t = useT();
  const g = t.graph.growth;
  const notes = toTend(view);
  if (notes.length === 0) return null;
  const shown = notes.slice(0, TO_TEND_SHOWN);
  return (
    <Panel title={g.toTend} initial="accent" meta={t.graph.noteCount(notes.length)}>
      <div className="panel__body">
        <p className="graph__help">{g.toTendHelp}</p>
        <ul className="graph__list">
          {shown.map((node) => (
            <li key={node.id}>
              <NodeLink id={node.id} className="graph__link" onShow={onShow}>
                {node.title}
              </NodeLink>{" "}
              <span className="status">
                {g.names[node.growth ?? "seed"]} · {g.lastTended(node.tended)}
              </span>
            </li>
          ))}
        </ul>
        {notes.length > shown.length ? (
          <p className="graph__help">{g.more(notes.length - shown.length)}</p>
        ) : null}
      </div>
    </Panel>
  );
}

export function AiKey({
  count,
  notes,
  pressed,
  onPress,
}: {
  readonly count: number;
  readonly notes: number;
  readonly pressed: boolean;
  readonly onPress: () => void;
}) {
  const t = useT();
  if (notes === 0) return null;
  return (
    <div className="graph__key" data-keep-clear="" role="status">
      {count === 0 ? (
        <p className="graph__key-done">
          <Check size={15} aria-hidden="true" />
          {t.graph.allYours}
        </p>
      ) : (
        <button
          type="button"
          className="graph__key-toggle"
          aria-pressed={pressed}
          aria-label={t.graph.aiKeyLabel(count)}
          title={t.graph.aiKeyHint}
          onClick={onPress}
        >
          <span className="graph__ring" aria-hidden="true" />
          {t.graph.aiKey(count)}
        </button>
      )}
    </div>
  );
}

export function NodeList({
  nodes,
  onShow,
}: {
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly onShow: (id: string) => void;
}) {
  const t = useT();
  return (
    <ul className="graph__list">
      {nodes.map((other) => (
        <li key={other.id}>
          <NodeLink id={other.id} className="graph__link" kind={other.kind} onShow={onShow}>
            {other.title}
            {holdsAiText(other) ? (
              <>
                <span className="graph__ring" aria-hidden="true" title={t.graph.holdsAi} />
                <span className="sr-only">{` (${t.graph.holdsAi})`}</span>
              </>
            ) : null}
          </NodeLink>
        </li>
      ))}
    </ul>
  );
}

export function NodeLink({
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
