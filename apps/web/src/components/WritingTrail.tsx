import { type GraphNode, linkKey } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useId, useLayoutEffect, useRef } from "react";

import type { GraphIndex } from "../graph/graphIndex.ts";
import { useT } from "../i18n/I18n.tsx";
import { AiText, MissingLink, NoteText, type WikilinkPart } from "./NoteText.tsx";
import { CallNumber } from "./ui.tsx";

export type TrailOpened = (id: string, from: "graph" | "reader") => void;

export function Trail({
  index,
  numbers,
  trail,
  open,
  focusId,
  onOpen,
  onClear,
}: {
  readonly index: GraphIndex;
  readonly numbers: ReadonlyMap<string, ReadonlyArray<number>>;
  readonly trail: ReadonlyArray<string>;
  readonly open: string | null;
  readonly focusId: string | null;
  readonly onOpen: TrailOpened;
  readonly onClear: () => void;
}) {
  const t = useT();
  const headingId = useId();
  const here = useRef<HTMLLIElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const stops = trail.flatMap((id) => index.byId.get(id) ?? []);
  const reading = stops.find((node) => node.id === open);

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- scroll and focus, not state: the stop just opened comes into view in the strip, its Note starts at the top, and it takes focus when the reader opened it.
  useLayoutEffect(() => {
    if (open === null) return;
    here.current?.scrollIntoView({ block: "nearest" });
    if (page.current !== null) page.current.scrollTop = 0;
    if (focusId === open) {
      page.current?.querySelector<HTMLElement>(".trail__title")?.focus({ preventScroll: true });
    }
  }, [open, focusId]);

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
        <div className="graph-beside__page">
          <TrailStart index={index} numbers={numbers} onOpen={onOpen} />
        </div>
      ) : (
        <>
          <ol className="trail" aria-labelledby={headingId}>
            {stops.map((node, at) =>
              node.id === open ? (
                <li
                  key={node.id}
                  ref={here}
                  className="trail__slip trail__slip--here"
                  aria-current="step"
                >
                  <span className="trail__no trail__no--here" aria-hidden="true">
                    {at + 1}
                  </span>
                  <span className="trail__name">
                    <span className="sr-only">{t.writing.trailOpen(at + 1)} </span>
                    {node.title}
                  </span>
                  <StopCall node={node} index={index} />
                </li>
              ) : (
                <li key={node.id} className="trail__slip">
                  <button
                    type="button"
                    aria-label={t.writing.trailStop(at + 1, node.title)}
                    onClick={() => onOpen(node.id, "reader")}
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
          <div className="graph-beside__page" ref={page}>
            {reading === undefined ? null : (
              <NoteReader
                key={reading.id}
                node={reading}
                index={index}
                numbers={numbers.get(reading.id) ?? []}
                onOpen={onOpen}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function StopCall({
  node,
  index,
}: {
  readonly node: GraphNode;
  readonly index: GraphIndex;
}) {
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
  readonly onOpen: TrailOpened;
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
  readonly onOpen: TrailOpened;
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
      <Link
        key={part.at}
        to="/graph"
        search={{ node: target.id }}
        className="graph__wikilink"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          onOpen(target.id, "reader");
        }}
      >
        {part.label}
      </Link>
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
        <LinkList
          title={t.graph.notesFromSource}
          nodes={fromSource}
          index={index}
          onOpen={onOpen}
        />
      )}
      {others.length === 0 ? null : (
        <LinkList
          title={t.graph.linkCount(others.length)}
          nodes={others}
          index={index}
          onOpen={onOpen}
        />
      )}
    </article>
  );
}

function LinkList({
  title,
  nodes,
  index,
  onOpen,
}: {
  readonly title: string;
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly index: GraphIndex;
  readonly onOpen: TrailOpened;
}) {
  return (
    <div className="trail__links">
      <h4 className="subhead">{title}</h4>
      <ul className="graph__list">
        {nodes.map((other) => (
          <li key={other.id}>
            <button
              type="button"
              className="graph-beside__pick"
              data-kind={other.kind}
              onClick={() => onOpen(other.id, "reader")}
            >
              <span className="trail__name">{other.title}</span>
              <StopCall node={other} index={index} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
