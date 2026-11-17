import type { ProseHandle } from "./ProseEditor.tsx";

export interface PlaceInText {
  readonly pos: number | null;
  readonly offset: number;
  readonly refocus: boolean;
}

const scrollerOf = (element: Element | null): HTMLElement | null => {
  for (let at = element?.parentElement ?? null; at !== null; at = at.parentElement) {
    const overflow = getComputedStyle(at).overflowY;
    if (overflow === "auto" || overflow === "scroll") return at;
  }
  return null;
};

const viewTop = (scroller: HTMLElement) =>
  Math.max(
    scroller.getBoundingClientRect().top,
    document.querySelector(".desk-bar")?.getBoundingClientRect().bottom ?? 0,
  );

export const placeInText = (editor: ProseHandle | null, box: HTMLElement | null) => {
  const scroller = scrollerOf(box);
  if (editor === null || box === null || scroller === null) return null;
  const top = viewTop(scroller);
  const caret = editor.focusedCaret();
  const caretTop = caret === null ? null : editor.topOf(caret);
  const caretY = caretTop === null ? null : box.getBoundingClientRect().top + caretTop;
  const seen =
    caretY !== null && caretY >= top && caretY <= scroller.getBoundingClientRect().bottom;
  const pos = seen ? caret : editor.posAtHeight(top + 8);
  const posTop = pos === null ? null : editor.topOf(pos);
  if (pos === null || posTop === null) return null;
  return { pos, offset: box.getBoundingClientRect().top + posTop - top };
};

export const keepPlace = (
  kept: PlaceInText,
  editor: ProseHandle | null,
  box: HTMLElement | null,
) => {
  const scroller = scrollerOf(box);
  if (kept.pos === null || editor === null || box === null || scroller === null) return;
  const posTop = editor.topOf(kept.pos);
  if (posTop === null) return;
  scroller.scrollTop += box.getBoundingClientRect().top + posTop - viewTop(scroller) - kept.offset;
};
