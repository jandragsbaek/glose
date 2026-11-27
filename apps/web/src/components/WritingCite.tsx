import { type GraphNode, linkKey, type Source } from "@glose/contracts";
import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { byText, noteExcerpt, rankOf, slipIndex } from "../domain/writing.ts";
import { useT } from "../i18n/I18n.tsx";
import { CallNumber } from "./ui.tsx";
import { isMac } from "./WritingDeskBar.tsx";

const MAX_MATCHES = 40;

export interface CiteTarget {
  readonly from: number;
  readonly to: number;
  readonly top: number;
  readonly editing: { readonly target: string; readonly location: string | null } | null;
  readonly focusPage: boolean;
  readonly typed: boolean;
  readonly opened: number;
}

export type CloseReason = "escape" | "outside";

type Match = {
  readonly node: GraphNode;
  readonly source: Source | null;
  readonly key: string;
  readonly rank: number;
};

export function CiteSlip({
  target,
  nodes,
  sources,
  cited,
  onCite,
  onRemove,
  onClose,
}: {
  readonly target: CiteTarget;
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly sources: ReadonlyArray<Source>;
  readonly cited: ReadonlyArray<string>;
  readonly onCite: (target: string, page: string | null) => void;
  readonly onRemove: () => void;
  readonly onClose: (reason: CloseReason) => void;
}) {
  const t = useT();
  const listId = useId();
  const findId = useId();
  const pageId = useId();
  const hintId = useId();
  const slip = useRef<HTMLDivElement | null>(null);
  const pageField = useRef<HTMLInputElement | null>(null);
  const editing = target.editing;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(editing?.target ?? null);
  const [page, setPage] = useState(editing?.location ?? "");
  const [inherited, setInherited] = useState(editing?.location != null);

  const { entries, sourceOf } = slipIndex(nodes, sources);
  const current = linkKey(editing?.target ?? "");
  const first = new Set(cited.map(linkKey));
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches: ReadonlyArray<Match> = entries
    .flatMap((entry): ReadonlyArray<Match> => {
      if (entry.node.kind === "person") return [];
      const rank = rankOf(words, entry);
      return rank === null
        ? []
        : [{ node: entry.node, source: entry.source, key: entry.key, rank }];
    })
    .sort(
      (a, b) =>
        (words.length === 0 ? Number(b.key === current) - Number(a.key === current) : 0) ||
        a.rank - b.rank ||
        Number(!first.has(a.key)) - Number(!first.has(b.key)) ||
        Number(a.node.kind === "source") - Number(b.node.kind === "source") ||
        byText(a.node.id, b.node.id),
    )
    .slice(0, MAX_MATCHES);
  const picked = matches.find((match) => match.key === linkKey(active ?? ""))?.node ?? null;
  const missing =
    editing !== null && picked === null && linkKey(active ?? "") === current
      ? editing.target
      : null;
  const chosen = picked ?? (missing === null ? (matches[0]?.node ?? null) : null);
  const ownPage = chosen?.kind === "note" ? chosen.page : null;
  const chosenVideo = chosen !== null && sourceOf(chosen)?.kind === "video";
  const carried = inherited && chosen !== null && linkKey(chosen.id) !== current;
  const pageText = (carried ? "" : page).trim();
  const typedPage = pageText === "" ? null : pageText;

  const close = useRef(onClose);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: the outside-click listener, made once, calls the newest close.
  useEffect(() => {
    close.current = onClose;
  });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- DOM, not state: a click outside the slip closes it, as a popover does.
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || slip.current?.contains(target)) return;
      if (target.closest(".prose-editor__ref, .gloss__head") !== null) return;
      close.current("outside");
    };
    const listen = window.setTimeout(() => document.addEventListener("mousedown", outside), 0);
    slip.current?.scrollIntoView({ block: "nearest" });
    return () => {
      window.clearTimeout(listen);
      document.removeEventListener("mousedown", outside);
    };
  }, []);

  const move = (step: number) => {
    if (matches.length === 0) return;
    const at = matches.findIndex((match) => match.node.id === chosen?.id);
    const next = matches[(at + step + matches.length) % matches.length];
    if (next === undefined) return;
    setActive(next.node.id);
    document.getElementById(`${listId}-${matches.indexOf(next)}`)?.scrollIntoView({
      block: "nearest",
    });
  };

  const cite = () => {
    const target = chosen?.id ?? missing;
    if (target === null) return;
    onCite(target, typedPage);
  };

  const activeIndex = matches.findIndex((match) => match.node.id === chosen?.id);
  const shortcut = isMac() ? "↵" : "Enter";

  return (
    <div
      ref={slip}
      className="cite-slip"
      role="dialog"
      aria-label={t.writing.citeTitle}
      style={{ top: target.top }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose("escape");
        }
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          cite();
        }}
      >
        <div className="cite-slip__find">
          <Search className="cite-slip__icon" aria-hidden="true" />
          <label className="sr-only" htmlFor={findId}>
            {t.writing.citeSearch}
          </label>
          <input
            id={findId}
            className="cite-slip__input"
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            aria-expanded={matches.length > 0}
            aria-controls={listId}
            aria-activedescendant={activeIndex < 0 ? undefined : `${listId}-${activeIndex}`}
            placeholder={t.writing.citeFind}
            autoFocus={!target.focusPage}
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
        {matches.length === 0 ? (
          <p className="cite-slip__empty" role="status">
            {t.writing.citeEmpty}
          </p>
        ) : (
          <ul
            className="cite-slip__list"
            id={listId}
            role="listbox"
            aria-label={t.writing.citeSearch}
          >
            {matches.map(({ node, source }, index) => (
              <li
                key={node.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={node.id === chosen?.id}
                className="cite-slip__option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (
                    editing === null &&
                    (typedPage !== null || (node.kind === "note" && node.page !== null))
                  ) {
                    onCite(node.id, typedPage);
                    return;
                  }
                  setActive(node.id);
                  pageField.current?.focus();
                }}
                onDoubleClick={() => onCite(node.id, typedPage)}
              >
                <span className="cite-slip__title">
                  {node.kind === "source" ? node.title : node.id}
                </span>
                {source === null ? null : (
                  <CallNumber source={source} page={node.kind === "note" ? node.page : null} />
                )}
                <span className="cite-slip__excerpt">
                  {node.kind === "source"
                    ? t.writing.citeSource
                    : noteExcerpt(node.body, words) || t.writing.citeNote}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="cite-slip__foot">
          <label className="cite-slip__page-label" htmlFor={pageId}>
            {chosenVideo ? t.watch.time : t.writing.citePage}
          </label>
          <input
            ref={pageField}
            id={pageId}
            className="input cite-slip__page"
            inputMode="text"
            autoComplete="off"
            autoFocus={target.focusPage}
            aria-describedby={hintId}
            placeholder={ownPage ?? ""}
            value={carried ? "" : page}
            onChange={(event) => {
              setPage(event.target.value);
              setInherited(false);
            }}
          />
          <p
            className={
              ownPage === null && typedPage === null && chosen !== null
                ? "cite-slip__hint cite-slip__hint--missing"
                : "cite-slip__hint"
            }
            id={hintId}
          >
            {chosen === null || typedPage !== null
              ? null
              : chosen.kind === "source"
                ? chosenVideo
                  ? t.watch.citeTimeSource
                  : t.writing.citePageSource
                : ownPage === null
                  ? chosenVideo
                    ? t.watch.citeTimeMissing
                    : t.writing.citePageMissing
                  : t.writing.citePageFromNote(t.source.page(ownPage, chosenVideo))}
          </p>
          {editing === null ? null : (
            <button type="button" className="button button--quiet" onClick={onRemove}>
              {t.writing.citeRemove}
            </button>
          )}
          <button
            type="submit"
            className="button button--primary"
            disabled={chosen === null && missing === null}
          >
            {editing === null ? t.writing.citeAction : t.writing.citeSave}
            <kbd className="key" aria-hidden="true">
              {shortcut}
            </kbd>
          </button>
        </div>
      </form>
    </div>
  );
}
