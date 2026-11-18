import { useAtomValue } from "@effect/atom-react";
import {
  type GraphNode,
  type GraphView,
  isTimestamp,
  linkKey,
  timestampSeconds,
} from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Play, X } from "lucide-react";
import type { ReactNode, Ref } from "react";

import { type GraphIndex, holdsAiText } from "../graph/graphIndex.ts";
import { useT } from "../i18n/I18n.tsx";
import { cardsAtom } from "../state/cards.ts";
import { NodeLink, NodeList } from "./GraphLists.tsx";
import { AiText, MissingLink, NoteText, type WikilinkPart } from "./NoteText.tsx";
import type { Linking } from "./RewriteNote.tsx";
import { CallNumber, Panel } from "./ui.tsx";

export function NodePanel({
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
            {source.kind === "video" && node.page !== null && isTimestamp(node.page) ? (
              <Link
                to="/sources/$sourceId"
                params={{ sourceId: source.id }}
                search={{ t: timestampSeconds(node.page) ?? 0 }}
                className="graph__watch"
              >
                <Play className="graph__watch-icon" aria-hidden="true" />
                {t.watch.watchFrom(node.page)}
              </Link>
            ) : null}
          </p>
        )}
        {rewriting ? null : isSource ? (
          <p className="graph__actions">
            <Link to="/sources/$sourceId" params={{ sourceId: node.id }} className="button">
              {t.graph.openSource}
            </Link>
          </p>
        ) : (
          <NoteCards
            noteId={node.id}
            aiText={holdsAiText(node)}
            opener={opener}
            onRewrite={onRewrite}
          />
        )}
        {rewriting ? null : (
          <NoteText
            markdown={node.body}
            aiText={node.aiText && !node.aiTitle}
            renderLink={wikilinks(index, onShow)}
          />
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
    <p className="button-row graph__actions">
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

export const wikilinks =
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

export function linkingOf(node: GraphNode, view: GraphView, index: GraphIndex): Linking {
  const from = view.links
    .filter((link) => link.to === node.id && link.from !== node.id)
    .map((link) => index.byId.get(link.from));
  return {
    notes: from.filter((other) => other?.kind === "note").length,
    sources: from.filter((other) => other?.kind === "source").length,
  };
}
