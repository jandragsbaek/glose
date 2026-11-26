import { type Ref, useEffect, useEffectEvent, useImperativeHandle, useRef } from "react";

import { scrollerOf } from "./deskPlace.ts";
import { type OverviewRow, overviewPicture, overviewView } from "./overviewMap.ts";
import type { ProseHandle } from "./ProseEditor.tsx";

export interface OverviewHandle {
  readonly refresh: () => void;
}

const STRIP_PX_PER_LEAF_PX = 0.14;
const TAB_REACH_PAST_STRIP = 8;
const LINE_INSET_LEFT = 10;
const LINE_INSET_RIGHT = 6;
const BOOK_BLOCK_LEFT = 4;
const TAB_WIDTH = { section: 16, subsection: 12 } as const;
const GAP_UNDER_DESK_BAR = 20;
const GAP_OVER_WINDOW_FOOT = 20;
const GRAPHITE_SHARE_OF_MUTE = 0.88;
const DRAG_AFTER_PX = 3;
const HEADING_HOVER_PX = 6;
const TITLE_SIZE_OVER_TEXT = 30 / 16;

interface Picture {
  readonly rows: ReadonlyArray<OverviewRow>;
  readonly references: ReadonlyArray<number>;
  readonly height: number;
}

interface Tones {
  readonly paper: string;
  readonly line: string;
  readonly ink: string;
  readonly accent: string;
  readonly mute: string;
}

interface Press {
  readonly y: number;
  readonly at: number;
  readonly top: number;
  readonly boxPerScrolledPixel: number;
  readonly inView: boolean;
  moved: boolean;
}

const isHeading = (row: OverviewRow) => row.kind !== "p";

const paint = (
  context: CanvasRenderingContext2D,
  picture: Picture,
  tones: Tones,
  size: { readonly width: number; readonly height: number; readonly offset: number },
) => {
  const { width, height, offset } = size;
  const y = (top: number) => top * STRIP_PX_PER_LEAF_PX - offset;
  const left = TAB_REACH_PAST_STRIP + LINE_INSET_LEFT;
  const inner = width - left - LINE_INSET_RIGHT;
  const blockLeft = TAB_REACH_PAST_STRIP + BOOK_BLOCK_LEFT;
  const blockTop = Math.max(0, y(0));
  const blockBottom = Math.min(height, y(picture.height));

  context.clearRect(0, 0, width, height);
  context.fillStyle = tones.paper;
  context.fillRect(blockLeft, blockTop, width - blockLeft, blockBottom - blockTop);
  context.fillStyle = tones.line;
  context.fillRect(blockLeft, blockTop, 1, blockBottom - blockTop);

  for (const row of picture.rows) {
    const middle = y(row.top + row.height / 2);
    if (middle < -4 || middle > height + 4) continue;
    if (isHeading(row)) {
      context.fillStyle = tones.accent;
      context.beginPath();
      context.roundRect(
        TAB_REACH_PAST_STRIP - 6,
        middle - 3,
        row.kind === "h3" ? TAB_WIDTH.subsection : TAB_WIDTH.section,
        6,
        1,
      );
      context.fill();
      context.fillStyle = tones.ink;
      context.fillRect(left, middle - 0.75, Math.max(4, row.length * inner), 1.5);
    } else {
      context.globalAlpha = GRAPHITE_SHARE_OF_MUTE;
      context.fillStyle = tones.mute;
      context.fillRect(left, middle - 0.7, Math.max(2, row.length * inner), 1.4);
      context.globalAlpha = 1;
    }
  }

  context.fillStyle = tones.accent;
  for (const reference of picture.references) {
    const middle = y(reference);
    if (middle < 0 || middle > height) continue;
    context.beginPath();
    context.arc(TAB_REACH_PAST_STRIP + 7.5, middle, 1.4, 0, Math.PI * 2);
    context.fill();
  }
};

export function WritingOverview({
  ref,
  editor,
  editorBox,
  leaf,
}: {
  readonly ref: Ref<OverviewHandle>;
  readonly editor: React.RefObject<ProseHandle | null>;
  readonly editorBox: React.RefObject<HTMLDivElement | null>;
  readonly leaf: React.RefObject<HTMLElement | null>;
}) {
  const strip = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const label = useRef<HTMLDivElement | null>(null);
  const probe = useRef<HTMLSpanElement | null>(null);
  const picture = useRef<Picture | null>(null);
  const hover = useRef<OverviewRow | null>(null);
  const press = useRef<Press | null>(null);
  const pending = useRef({ frame: 0, measure: false });

  const place = () => {
    const node = strip.current;
    const scroller = scrollerOf(node);
    const leafNode = leaf.current;
    const drawn = picture.current;
    if (node === null || scroller === null || leafNode === null || drawn === null) return null;
    const frame = scroller.getBoundingClientRect();
    const barBottom = Math.max(
      frame.top,
      document.querySelector(".desk-bar")?.getBoundingClientRect().bottom ?? frame.top,
    );
    const stripTop = barBottom - frame.top + GAP_UNDER_DESK_BAR;
    const stripHeight = Math.max(0, scroller.clientHeight - stripTop - GAP_OVER_WINDOW_FOOT);
    const viewHeight = frame.top + scroller.clientHeight - barBottom;
    const view = overviewView({
      pictureHeight: drawn.height * STRIP_PX_PER_LEAF_PX,
      stripHeight,
      scale: STRIP_PX_PER_LEAF_PX,
      scrollTop: scroller.scrollTop,
      scrollMax: scroller.scrollHeight - scroller.clientHeight,
      viewTop: barBottom - leafNode.getBoundingClientRect().top,
      viewHeight,
    });
    return {
      node,
      scroller,
      drawn,
      stripTop,
      stripHeight,
      barBottom,
      readHeight: viewHeight,
      ...view,
    };
  };

  const measure = () => {
    const leafNode = leaf.current;
    const textBox = editorBox.current;
    const text = editor.current?.lines() ?? null;
    if (leafNode === null || textBox === null || text === null) return;
    const leafTop = leafNode.getBoundingClientRect().top;
    const shift = textBox.getBoundingClientRect().top - leafTop;
    const lines = text.lines.map((line) => ({ ...line, top: line.top + shift }));
    const drawn = overviewPicture(lines, text.columns, text.lineHeight);
    const title = leafNode.querySelector<HTMLInputElement>(".leaf__title-input");
    const name = title?.value.trim() ?? "";
    const head: Array<OverviewRow> = [];
    if (title != null && name !== "") {
      const rect = title.getBoundingClientRect();
      head.push({
        kind: "title",
        top: rect.top - leafTop,
        height: rect.height,
        length: Math.min(1, (name.length * TITLE_SIZE_OVER_TEXT) / text.columns),
        text: name,
      });
    }
    picture.current = {
      rows: [...head, ...drawn.rows],
      references: drawn.references,
      height: leafNode.offsetHeight,
    };
  };

  const draw = () => {
    const at = place();
    const surface = canvas.current;
    const color = probe.current;
    const context = surface?.getContext("2d") ?? null;
    if (at === null || surface === null || color === null || context === null) return;
    const { node, drawn, stripHeight, offset, viewY, viewHeight } = at;
    node.style.top = `${at.stripTop}px`;
    node.style.height = `${stripHeight}px`;
    const width = node.clientWidth + TAB_REACH_PAST_STRIP;
    const ratio = window.devicePixelRatio || 1;
    const pixels = { width: Math.round(width * ratio), height: Math.round(stripHeight * ratio) };
    if (surface.width !== pixels.width || surface.height !== pixels.height) {
      surface.width = pixels.width;
      surface.height = pixels.height;
      surface.style.width = `${width}px`;
      surface.style.height = `${stripHeight}px`;
    }
    const resolve = (name: string) => {
      color.style.color = `var(${name})`;
      return getComputedStyle(color).color;
    };
    const tones = {
      paper: resolve("--paper"),
      line: resolve("--line"),
      ink: resolve("--ink"),
      accent: resolve("--accent"),
      mute: resolve("--mute"),
    };
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint(context, drawn, tones, { width, height: stripHeight, offset });

    if (box.current !== null) {
      box.current.style.transform = `translateY(${viewY}px)`;
      box.current.style.height = `${viewHeight}px`;
    }
    const tag = label.current;
    const row = hover.current;
    if (tag === null) return;
    tag.hidden = row === null;
    if (row === null) return;
    tag.textContent = row.text;
    tag.style.top = `${(row.top + row.height / 2) * STRIP_PX_PER_LEAF_PX - offset}px`;
  };

  const schedule = (remeasure: boolean) => {
    pending.current.measure ||= remeasure;
    if (pending.current.frame !== 0) return;
    pending.current.frame = window.requestAnimationFrame(() => {
      pending.current.frame = 0;
      if (pending.current.measure) measure();
      pending.current.measure = false;
      draw();
    });
  };

  useImperativeHandle(ref, () => ({ refresh: () => schedule(true) }));

  const onScroll = useEffectEvent(() => {
    hover.current = null;
    schedule(false);
  });
  const onChange = useEffectEvent(() => schedule(true));
  const stop = useEffectEvent(() => {
    window.cancelAnimationFrame(pending.current.frame);
    pending.current.frame = 0;
  });

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- listeners, not state: the strip follows the desk's scroll, its size, the theme and the fonts, all outside React.
  useEffect(() => {
    const scroller = scrollerOf(strip.current);
    const scrolled = () => onScroll();
    const changed = () => onChange();
    scroller?.addEventListener("scroll", scrolled, { passive: true });
    const sizes = new ResizeObserver(changed);
    if (scroller !== null) sizes.observe(scroller);
    if (leaf.current !== null) sizes.observe(leaf.current);
    const theme = new MutationObserver(scrolled);
    theme.observe(document.documentElement, { attributes: true });
    void document.fonts.ready.then(changed);
    changed();
    return () => {
      scroller?.removeEventListener("scroll", scrolled);
      sizes.disconnect();
      theme.disconnect();
      stop();
    };
  }, [leaf]);

  const pointAt = (clientY: number) => clientY - (strip.current?.getBoundingClientRect().top ?? 0);

  const jump = (stripY: number) => {
    const at = place();
    const leafNode = leaf.current;
    if (at === null || leafNode === null) return;
    const leafY = (stripY + at.offset) / STRIP_PX_PER_LEAF_PX;
    const target = at.barBottom + at.readHeight / 3;
    at.scroller.scrollTop += leafNode.getBoundingClientRect().top + leafY - target;
  };

  const headingNear = (stripY: number) => {
    const at = place();
    if (at === null) return null;
    const middleOf = (row: OverviewRow) =>
      (row.top + row.height / 2) * STRIP_PX_PER_LEAF_PX - at.offset;
    let nearest: OverviewRow | null = null;
    let distance = HEADING_HOVER_PX;
    for (const row of at.drawn.rows) {
      const away = Math.abs(middleOf(row) - stripY);
      if (!isHeading(row) || away > distance) continue;
      nearest = row;
      distance = away;
    }
    return nearest;
  };

  const release = () => {
    press.current = null;
    strip.current?.removeAttribute("data-dragging");
  };

  return (
    <div className="overview-col" aria-hidden="true">
      <div
        ref={strip}
        className="overview"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const at = place();
          if (at === null) return;
          const y = pointAt(event.clientY);
          press.current = {
            y: event.clientY,
            at: y,
            top: at.scroller.scrollTop,
            boxPerScrolledPixel: at.boxPerScrolledPixel,
            inView: y >= at.viewY && y <= at.viewY + at.viewHeight,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const held = press.current;
          if (held === null) {
            const near = headingNear(pointAt(event.clientY));
            if (near === hover.current) return;
            hover.current = near;
            schedule(false);
            return;
          }
          if (!held.inView || (!held.moved && Math.abs(event.clientY - held.y) <= DRAG_AFTER_PX)) {
            return;
          }
          held.moved = true;
          event.currentTarget.setAttribute("data-dragging", "");
          const scroller = scrollerOf(event.currentTarget);
          if (scroller === null) return;
          scroller.scrollTop = held.top + (event.clientY - held.y) / held.boxPerScrolledPixel;
        }}
        onPointerUp={() => {
          const held = press.current;
          release();
          if (held !== null && !held.moved) jump(held.at);
        }}
        onPointerCancel={release}
        onPointerLeave={() => {
          if (press.current !== null || hover.current === null) return;
          hover.current = null;
          schedule(false);
        }}
      >
        <canvas ref={canvas} className="overview__picture" />
        <div ref={box} className="overview__view" />
        <div ref={label} className="overview__label" hidden />
        <span ref={probe} className="overview__probe" />
      </div>
    </div>
  );
}
