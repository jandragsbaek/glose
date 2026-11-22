import { type GraphNode, linkKey, type Source } from "@glose/contracts";
import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { noteExcerpt, rankOf } from "../domain/writing.ts";
import { useT } from "../i18n/I18n.tsx";
import { CallNumber } from "./ui.tsx";
import { isMac } from "./WritingDeskBar.tsx";

const MAX_MATCHES = 40;
const KIND_ORDER: Record<GraphNode["kind"], number> = { person: 0, note: 1, source: 2 };

type Choice =
  | { readonly id: string; readonly node: GraphNode; readonly source: Source | null }
  | { readonly id: string; readonly node: null; readonly source: null };

export function LinkSlip({
  top,
  initialQuery,
  self,
  nodes,
  sources,
  onLink,
  onClose,
}: {
  readonly top: number;
  readonly initialQuery: string;
  readonly self: string;
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly sources: ReadonlyArray<Source>;
  readonly onLink: (target: string) => void;
  readonly onClose: (query: string, back: boolean) => void;
}) {
  const t = useT();
  const listId = useId();
  const findId = useId();
  const slip = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState<string | null>(null);

  const sourceById = new Map(sources.map((source) => [linkKey(source.id), source]));
  const sourceOf = (node: GraphNode) =>
    sourceById.get(linkKey(node.kind === "source" ? node.id : (node.sourceId ?? ""))) ?? null;
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = nodes
    .flatMap((node) => {
      if (linkKey(node.id) === linkKey(self)) return [];
      const source = sourceOf(node);
      const about =
        source === null ? "" : `${source.givenName ?? ""} ${source.familyName} ${source.title}`;
      const rank = rankOf(
        words,
        `${node.id} ${node.title}`.toLocaleLowerCase(),
        about.toLocaleLowerCase(),
        node.body.toLocaleLowerCase(),
      );
      return rank === null ? [] : [{ node, source, rank }];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        KIND_ORDER[a.node.kind] - KIND_ORDER[b.node.kind] ||
        a.node.title.localeCompare(b.node.title),
    )
    .slice(0, MAX_MATCHES);
  const typed = query.trim();
  const named = nodes.some((node) => linkKey(node.id) === linkKey(typed));
  const options: ReadonlyArray<Choice> = [
    ...matches.map((match) => ({ ...match, id: match.node.id })),
    ...(typed === "" || named ? [] : [{ id: typed, node: null, source: null }]),
  ];
  const chosen = options.find((option) => option.id === active) ?? options[0] ?? null;
  const activeIndex = chosen === null ? -1 : options.indexOf(chosen);

  const close = useRef(onClose);
  const latestQuery = useRef(query);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: the outside-click listener, made once, calls the newest close.
  useEffect(() => {
    close.current = onClose;
    latestQuery.current = query;
  });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- DOM, not state: a click outside the slip closes it, as a popover does.
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && slip.current?.contains(event.target)) return;
      close.current(latestQuery.current, false);
    };
    const listen = window.setTimeout(() => document.addEventListener("mousedown", outside), 0);
    slip.current?.scrollIntoView({ block: "nearest" });
    return () => {
      window.clearTimeout(listen);
      document.removeEventListener("mousedown", outside);
    };
  }, []);

  const move = (step: number) => {
    if (options.length === 0) return;
    const next = options[(activeIndex + step + options.length) % options.length];
    if (next === undefined) return;
    setActive(next.id);
    document.getElementById(`${listId}-${options.indexOf(next)}`)?.scrollIntoView({
      block: "nearest",
    });
  };

  return (
    <div
      ref={slip}
      className="cite-slip link-slip"
      role="dialog"
      aria-label={t.links.title}
      style={{ top }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose(query, true);
        }
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && slip.current?.contains(next)) return;
        if (next !== null) onClose(query, false);
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (chosen !== null) onLink(chosen.id);
        }}
      >
        <div className="cite-slip__find">
          <Search className="cite-slip__icon" aria-hidden="true" />
          <label className="sr-only" htmlFor={findId}>
            {t.links.find}
          </label>
          <input
            id={findId}
            className="cite-slip__input"
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            aria-expanded={options.length > 0}
            aria-controls={options.length > 0 ? listId : undefined}
            aria-activedescendant={activeIndex < 0 ? undefined : `${listId}-${activeIndex}`}
            placeholder={t.links.find}
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                move(event.key === "ArrowDown" ? 1 : -1);
              }
            }}
          />
        </div>
        <p className="sr-only" role="status">
          {t.graph.found(options.length)}
        </p>
        {options.length === 0 ? (
          <p className="cite-slip__empty">{t.links.empty}</p>
        ) : (
          <ul className="cite-slip__list" id={listId} role="listbox" aria-label={t.links.find}>
            {options.map(({ id, node, source }, index) => (
              <li
                key={id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={id === chosen?.id}
                className="cite-slip__option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onLink(id)}
              >
                {node === null ? (
                  <span className="cite-slip__title">{t.links.missing(id)}</span>
                ) : (
                  <>
                    <span className="cite-slip__title">{node.title}</span>
                    {source === null ? (
                      <span className="link-slip__kind">{t.links.kinds[node.kind]}</span>
                    ) : (
                      <CallNumber source={source} page={node.kind === "note" ? node.page : null} />
                    )}
                    <span className="cite-slip__excerpt">
                      {node.kind === "source"
                        ? t.links.kinds.source
                        : noteExcerpt(node.body, words)}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="cite-slip__foot link-slip__foot">
          <button type="submit" className="button button--primary" disabled={chosen === null}>
            {t.links.action}
            <kbd className="key" aria-hidden="true">
              {isMac() ? "↵" : "Enter"}
            </kbd>
          </button>
        </div>
      </form>
    </div>
  );
}
