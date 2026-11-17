import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { useT } from "../i18n/I18n.tsx";

export interface ReaderNotice {
  readonly text: string;
  readonly reopen: string | null;
}

export interface Selected {
  readonly below: boolean;
  readonly n: number;
  readonly start: number;
  readonly end: number;
  readonly top: number;
  readonly left: number;
}

export interface SelectionRead {
  readonly selected: Selected | null;
  readonly problem: "outside" | "clipped" | null;
}

const NOTHING: SelectionRead = { selected: null, problem: null };

export const readSelectionIn = (
  leaf: HTMLElement | null,
  column: HTMLElement | null,
): SelectionRead => {
  const selection = window.getSelection();
  if (selection === null || selection.isCollapsed || selection.rangeCount === 0 || leaf === null) {
    return NOTHING;
  }
  const range = selection.getRangeAt(0);
  const startNode =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement;
  const text = startNode?.closest<HTMLElement>("[data-unit-text]");
  if (text == null || !leaf.contains(text)) {
    const outside =
      startNode != null && leaf.contains(startNode) && selection.toString().trim() !== "";
    return { selected: null, problem: outside ? "outside" : null };
  }
  const n = Number(text.dataset.unitText);
  const before = document.createRange();
  before.setStart(text, 0);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const within = document.createRange();
  within.setStart(range.startContainer, range.startOffset);
  const clipped = !text.contains(range.endContainer);
  if (clipped) within.setEnd(text, text.childNodes.length);
  else within.setEnd(range.endContainer, range.endOffset);
  if (within.toString().trim() === "") return NOTHING;
  const box = within.getBoundingClientRect();
  const frame = leaf.getBoundingClientRect();
  const scroller = column?.getBoundingClientRect().top ?? 0;
  const unitTop = text.getBoundingClientRect().top;
  const afterHeading =
    text.closest(".unit")?.previousElementSibling?.classList.contains("article__heading") === true;
  const below = box.top - scroller < 64 || (afterHeading && box.top - unitTop < 12);
  return {
    selected: {
      n,
      start,
      end: start + within.toString().length,
      top: below ? box.bottom - frame.top : box.top - frame.top,
      left: box.left - frame.left + box.width / 2,
      below,
    },
    problem: clipped ? "clipped" : null,
  };
};

export function MarkBar({
  selected,
  busy,
  place,
  onMark,
}: {
  readonly selected: Selected;
  readonly busy: boolean;
  readonly place: (bar: HTMLDivElement | null) => void;
  readonly onMark: (thenDeeper: boolean) => void;
}) {
  const t = useT();
  return (
    <div
      className="markbar"
      ref={place}
      role="toolbar"
      aria-label={t.reader.markBar}
      data-below={selected.below ? "" : undefined}
      style={{ top: selected.top, left: selected.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        className="markbar__button"
        disabled={busy}
        aria-keyshortcuts="M"
        onClick={() => onMark(false)}
      >
        {busy ? t.reader.marking : t.reader.mark}
        <kbd className="markbar__key" aria-hidden="true">
          {t.reader.markKey}
        </kbd>
      </button>
      <span className="markbar__rule" aria-hidden="true" />
      <button
        type="button"
        className="markbar__button"
        disabled={busy}
        aria-keyshortcuts="D"
        onClick={() => onMark(true)}
      >
        {t.reader.markDeeper}
        <kbd className="markbar__key" aria-hidden="true">
          {t.reader.deeperKey}
        </kbd>
      </button>
    </div>
  );
}

export function ReaderFoot({
  notice,
  onReopen,
  children,
}: {
  readonly notice: ReaderNotice | null;
  readonly onReopen: (key: string) => void;
  readonly children: ReactNode;
}) {
  const t = useT();
  return (
    <div className="reader__foot">
      <p className="reader__notice" role="status">
        {notice === null ? null : (
          <>
            <TriangleAlert className="reader__notice-icon" aria-hidden="true" />
            {notice.text}
            {notice.reopen === null ? null : (
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  if (notice.reopen !== null) onReopen(notice.reopen);
                }}
              >
                {t.reader.margin.reopen}
              </button>
            )}
          </>
        )}
      </p>
      {children}
    </div>
  );
}
