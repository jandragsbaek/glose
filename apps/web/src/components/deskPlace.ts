import type { ProseHandle } from "./ProseEditor.tsx";

export interface PlaceInText {
  readonly pos: number | null;
  readonly anchor: Range | null;
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
  return { pos, anchor: null, offset: box.getBoundingClientRect().top + posTop - top };
};

const rangeTop = (range: Range) => (range.getClientRects()[0] ?? range.getBoundingClientRect()).top;

const textAt = (leaf: HTMLElement, top: number): Range | null => {
  const box = leaf.getBoundingClientRect();
  const x = box.left + parseFloat(getComputedStyle(leaf).paddingLeft) + 2;
  for (let y = Math.max(top, box.top) + 4; y < Math.min(box.bottom, top + 120); y += 6) {
    const point = document.caretPositionFromPoint(x, y);
    if (point === null || !leaf.contains(point.offsetNode)) continue;
    const range = document.createRange();
    range.setStart(point.offsetNode, point.offset);
    return range;
  }
  return null;
};

export const placeInProof = (leaf: HTMLElement | null) => {
  const scroller = scrollerOf(leaf);
  if (leaf === null || scroller === null) return null;
  const top = viewTop(scroller);
  const anchor = textAt(leaf, top);
  if (anchor === null) return null;
  return { pos: null, anchor, offset: rangeTop(anchor) - top };
};

export const keepPlace = (
  kept: PlaceInText,
  editor: ProseHandle | null,
  box: HTMLElement | null,
) => {
  if (kept.anchor !== null) {
    const scroller = scrollerOf(kept.anchor.startContainer.parentElement);
    if (scroller === null) return;
    scroller.scrollTop += rangeTop(kept.anchor) - viewTop(scroller) - kept.offset;
    return;
  }
  const scroller = scrollerOf(box);
  if (kept.pos === null || editor === null || box === null || scroller === null) return;
  const posTop = editor.topOf(kept.pos);
  if (posTop === null) return;
  scroller.scrollTop += box.getBoundingClientRect().top + posTop - viewTop(scroller) - kept.offset;
};
