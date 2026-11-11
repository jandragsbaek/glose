import type { GraphView } from "@glose/contracts";
import { select, type Selection } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";

import {
  type GraphSimulation,
  labelAlpha,
  type LayoutLink,
  type LayoutNode,
  layoutData,
  makeSimulation,
  settle,
} from "./layout.ts";

/** What the canvas writes beside a node: a Source's call number and title, a Note's name. */
export interface NodeLabel {
  readonly text: string;
  readonly call: string | null;
}

export interface GraphCanvasEvents {
  readonly onSelect: (id: string | null) => void;
  /** Double click: open the node's own page. */
  readonly onOpen: (id: string) => void;
}

interface Palette {
  readonly ground: string;
  readonly paper: string;
  readonly ink: string;
  readonly mute: string;
  readonly lineStrong: string;
  readonly lapis: string;
  readonly gold: string;
}

const readPalette = (): Palette => {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--${name}`).trim();
  return {
    ground: token("ground"),
    paper: token("paper"),
    ink: token("ink"),
    mute: token("mute"),
    lineStrong: token("line-strong"),
    lapis: token("lapis"),
    gold: token("gold"),
  };
};

const NOTE_FONT = '500 12px "Public Sans", system-ui, sans-serif';
const SOURCE_FONT = '600 12.5px "Public Sans", system-ui, sans-serif';
const CALL_FONT = '700 11px "Courier Prime", ui-monospace, monospace';
const LABEL_WIDTH = 170;
const LINE_HEIGHT = 15;
const CALL_HEIGHT = 17;
/** Nodes outside the focus fade to this much of their colour. */
const FADED = 0.14;
const SCALE_EXTENT: [number, number] = [0.12, 6];
/** Movement that still counts as a click rather than a drag, in CSS pixels. */
const CLICK_SLOP = 4;
const FADE_MS = 160;
const CAMERA_MS = 420;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * The Graph on one canvas, drawn by one animation loop: the force layout, the camera (d3-zoom:
 * wheel and pinch zoom to the pointer, drag to pan), dragging nodes, hover and selection. Input
 * only changes state and asks for a frame; nothing is drawn while nothing changes.
 */
export class GraphCanvas {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #zoom: ZoomBehavior<HTMLCanvasElement, unknown>;
  readonly #selection: Selection<HTMLCanvasElement, unknown, null, undefined>;
  readonly #resize: ResizeObserver;
  readonly #reducedMotion: MediaQueryList;
  readonly #palette: Palette;
  #events: GraphCanvasEvents = { onSelect: () => {}, onOpen: () => {} };

  #width = 0;
  #height = 0;
  #ratio = 1;
  #transform: ZoomTransform = zoomIdentity;
  #fitted = false;

  #view: GraphView | null = null;
  #simulation: GraphSimulation | null = null;
  #nodes: Array<LayoutNode> = [];
  #links: Array<LayoutLink> = [];
  #byId = new Map<string, LayoutNode>();
  #neighbours = new Map<string, Set<string>>();
  #labels: ReadonlyMap<string, NodeLabel> = new Map();
  #wrapped = new Map<string, ReadonlyArray<string>>();

  #hovered: string | null = null;
  #selected: string | null = null;
  #matches: ReadonlySet<string> | null = null;
  /** The node whose neighbourhood stays bright; kept while the fade runs out. */
  #focus: string | null = null;
  #dim = 0;
  #lastFrame = 0;

  /** The pointer's last place over the canvas; null once it leaves. */
  #pointer: [number, number] | null = null;
  #drag: { readonly node: LayoutNode; readonly pointerId: number } | null = null;
  #down: { readonly x: number; readonly y: number; moved: boolean } | null = null;
  #camera: {
    readonly from: ZoomTransform;
    readonly to: ZoomTransform;
    readonly start: number;
  } | null = null;

  #frame = 0;
  #dirty = true;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("Canvas 2D is not available.");
    this.#context = context;
    this.#palette = readPalette();
    this.#reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.#zoom = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent(SCALE_EXTENT)
      // A press on a node drags the node; anywhere else it pans.
      .filter((event: MouseEvent | TouchEvent | WheelEvent) => {
        if (event.type === "wheel") return true;
        if ("button" in event && (event.button !== 0 || event.ctrlKey)) return false;
        const point = "touches" in event ? event.touches[0] : event;
        return point === undefined || this.#hit(this.#local(point)) === null;
      })
      .on("zoom", (event: { transform: ZoomTransform }) => {
        this.#transform = event.transform;
        // The camera moved under a resting pointer: what it points at may have changed.
        if (this.#pointer !== null && this.#drag === null) {
          this.#hover(this.#hit(this.#pointer)?.id ?? null);
        }
        this.#request();
      });
    this.#selection = select(canvas);
    this.#selection.call(this.#zoom).on("dblclick.zoom", null);

    canvas.addEventListener("pointerdown", this.#onPointerDown);
    canvas.addEventListener("pointermove", this.#onPointerMove);
    canvas.addEventListener("pointerup", this.#onPointerUp);
    canvas.addEventListener("pointercancel", this.#onPointerUp);
    canvas.addEventListener("pointerleave", this.#onPointerLeave);
    canvas.addEventListener("dblclick", this.#onDoubleClick);
    canvas.addEventListener("keydown", this.#onKeyDown);

    this.#resize = new ResizeObserver(() => this.#measure());
    this.#resize.observe(canvas);
    this.#measure();
    // Labels are measured in the web fonts; measure again once they have loaded.
    void document.fonts.ready.then(() => {
      this.#wrapped.clear();
      this.#request();
    });
  }

  setEvents(events: GraphCanvasEvents): void {
    this.#events = events;
  }

  /** New files or Links: nodes already placed stay where they are, new ones settle in. */
  setData(view: GraphView, labels: ReadonlyMap<string, NodeLabel>): void {
    if (this.#labels !== labels) {
      this.#labels = labels;
      this.#wrapped.clear();
      this.#request();
    }
    if (view === this.#view) return;
    this.#view = view;
    const { nodes, links } = layoutData(view, this.#byId);
    const added = nodes.some((node) => !this.#byId.has(node.id));
    this.#simulation?.stop();
    this.#nodes = nodes;
    this.#links = links;
    this.#byId = new Map(nodes.map((node) => [node.id, node]));
    this.#neighbours = new Map(nodes.map((node) => [node.id, new Set<string>()]));
    for (const link of links) {
      this.#neighbours.get(link.source.id)?.add(link.target.id);
      this.#neighbours.get(link.target.id)?.add(link.source.id);
    }
    this.#simulation = makeSimulation(nodes, links);
    if (this.#fitted || !added) {
      this.#simulation.alpha(added ? 0.3 : 0);
    } else {
      settle(this.#simulation);
      this.#simulation.alpha(0);
    }
    if (!this.#fitted && this.#width > 0) this.fit(false);
    this.#request();
  }

  setSelected(id: string | null): void {
    this.#selected = id;
    this.#request();
  }

  /** Nodes that match a search; null shows every node at full strength. */
  setMatches(ids: ReadonlySet<string> | null): void {
    this.#matches = ids;
    this.#request();
  }

  zoomBy(factor: number): void {
    const center: [number, number] = [this.#width / 2, this.#height / 2];
    const k = Math.min(SCALE_EXTENT[1], Math.max(SCALE_EXTENT[0], this.#transform.k * factor));
    const [wx, wy] = this.#transform.invert(center);
    this.#moveCamera(zoomIdentity.translate(center[0] - wx * k, center[1] - wy * k).scale(k));
  }

  /** The whole Graph in view, with room for the labels under the outer nodes. */
  fit(animate = true): void {
    if (this.#nodes.length === 0 || this.#width === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of this.#nodes) {
      minX = Math.min(minX, (node.x ?? 0) - node.radius);
      minY = Math.min(minY, (node.y ?? 0) - node.radius);
      maxX = Math.max(maxX, (node.x ?? 0) + node.radius);
      maxY = Math.max(maxY, (node.y ?? 0) + node.radius);
    }
    const pad = 40;
    const k = Math.min(
      1.4,
      Math.max(
        SCALE_EXTENT[0],
        Math.min(
          (this.#width - pad * 2) / Math.max(1, maxX - minX),
          (this.#height - pad * 2 - CALL_HEIGHT) / Math.max(1, maxY - minY),
        ),
      ),
    );
    const target = zoomIdentity
      .translate(
        this.#width / 2 - ((minX + maxX) / 2) * k,
        this.#height / 2 - ((minY + maxY) / 2) * k,
      )
      .scale(k);
    this.#fitted = true;
    this.#moveCamera(target, animate);
  }

  /** Brings a node to the middle, close enough to read the names around it. */
  centerOn(id: string): void {
    const node = this.#byId.get(id);
    if (node === undefined || this.#width === 0) return;
    const k = Math.max(this.#transform.k, 1.7);
    this.#moveCamera(
      zoomIdentity
        .translate(this.#width / 2 - (node.x ?? 0) * k, this.#height / 2 - (node.y ?? 0) * k)
        .scale(k),
    );
  }

  destroy(): void {
    cancelAnimationFrame(this.#frame);
    this.#resize.disconnect();
    this.#simulation?.stop();
    this.#selection.on(".zoom", null);
    const canvas = this.#canvas;
    canvas.removeEventListener("pointerdown", this.#onPointerDown);
    canvas.removeEventListener("pointermove", this.#onPointerMove);
    canvas.removeEventListener("pointerup", this.#onPointerUp);
    canvas.removeEventListener("pointercancel", this.#onPointerUp);
    canvas.removeEventListener("pointerleave", this.#onPointerLeave);
    canvas.removeEventListener("dblclick", this.#onDoubleClick);
    canvas.removeEventListener("keydown", this.#onKeyDown);
  }

  // Input

  #local(point: { readonly clientX: number; readonly clientY: number }): [number, number] {
    const rect = this.#canvas.getBoundingClientRect();
    return [point.clientX - rect.left, point.clientY - rect.top];
  }

  /** The node under a canvas point, generous by a few pixels so small Notes are easy to catch. */
  #hit(point: [number, number]): LayoutNode | null {
    const [x, y] = this.#transform.invert(point);
    const slop = 5 / this.#transform.k;
    let best: LayoutNode | null = null;
    let bestDistance = Infinity;
    for (const node of this.#nodes) {
      const distance = Math.hypot((node.x ?? 0) - x, (node.y ?? 0) - y);
      if (distance <= node.radius + slop && distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  }

  readonly #onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const point = this.#local(event);
    this.#down = { x: point[0], y: point[1], moved: false };
    const node = this.#hit(point);
    if (node === null) return;
    this.#drag = { node, pointerId: event.pointerId };
    node.fx = node.x;
    node.fy = node.y;
    this.#canvas.setPointerCapture(event.pointerId);
  };

  readonly #onPointerMove = (event: PointerEvent) => {
    const point = this.#local(event);
    this.#pointer = point;
    if (this.#down !== null && !this.#down.moved) {
      this.#down.moved = Math.hypot(point[0] - this.#down.x, point[1] - this.#down.y) > CLICK_SLOP;
    }
    if (this.#drag !== null && this.#drag.pointerId === event.pointerId) {
      if (!this.#down?.moved) return;
      const [x, y] = this.#transform.invert(point);
      this.#drag.node.fx = x;
      this.#drag.node.fy = y;
      // Wake the layout, so the node's neighbours follow it.
      const simulation = this.#simulation;
      if (simulation !== null)
        simulation.alphaTarget(0.25).alpha(Math.max(simulation.alpha(), 0.25));
      this.#hover(this.#drag.node.id);
      this.#request();
      return;
    }
    if (event.buttons !== 0) return;
    this.#hover(this.#hit(point)?.id ?? null);
  };

  readonly #onPointerUp = (event: PointerEvent) => {
    const down = this.#down;
    this.#down = null;
    if (this.#drag !== null && this.#drag.pointerId === event.pointerId) {
      // Released, the node rejoins the layout, as in Obsidian.
      this.#drag.node.fx = null;
      this.#drag.node.fy = null;
      this.#drag = null;
      this.#simulation?.alphaTarget(0);
      this.#request();
    }
    if (event.type === "pointerup" && down !== null && !down.moved) {
      this.#events.onSelect(this.#hit(this.#local(event))?.id ?? null);
    }
  };

  readonly #onPointerLeave = () => {
    this.#pointer = null;
    if (this.#drag === null) this.#hover(null);
  };

  readonly #onDoubleClick = (event: MouseEvent) => {
    const node = this.#hit(this.#local(event));
    if (node !== null) this.#events.onOpen(node.id);
  };

  readonly #onKeyDown = (event: KeyboardEvent) => {
    const pan = (dx: number, dy: number) =>
      this.#moveCamera(this.#transform.translate(dx / this.#transform.k, dy / this.#transform.k));
    const actions: Record<string, () => void> = {
      "+": () => this.zoomBy(1.4),
      "=": () => this.zoomBy(1.4),
      "-": () => this.zoomBy(1 / 1.4),
      "0": () => this.fit(),
      ArrowLeft: () => pan(80, 0),
      ArrowRight: () => pan(-80, 0),
      ArrowUp: () => pan(0, 80),
      ArrowDown: () => pan(0, -80),
      Escape: () => this.#events.onSelect(null),
    };
    const action = actions[event.key];
    if (action === undefined || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    action();
  };

  #hover(id: string | null): void {
    if (id === this.#hovered) return;
    this.#hovered = id;
    this.#canvas.style.cursor = id === null ? "" : "pointer";
    this.#request();
  }

  #moveCamera(target: ZoomTransform, animate = true): void {
    if (!animate || this.#reducedMotion.matches) {
      this.#camera = null;
      this.#zoom.transform(this.#selection, target);
      return;
    }
    this.#camera = { from: this.#transform, to: target, start: performance.now() };
    this.#request();
  }

  #measure(): void {
    const rect = this.#canvas.getBoundingClientRect();
    this.#ratio = window.devicePixelRatio || 1;
    this.#width = rect.width;
    this.#height = rect.height;
    this.#canvas.width = Math.round(rect.width * this.#ratio);
    this.#canvas.height = Math.round(rect.height * this.#ratio);
    if (!this.#fitted && this.#nodes.length > 0 && rect.width > 0) this.fit(false);
    this.#dirty = true;
    this.#request();
  }

  // Frames

  #request(): void {
    this.#dirty = true;
    if (this.#frame === 0) this.#frame = requestAnimationFrame(this.#step);
  }

  readonly #step = (now: number) => {
    this.#frame = 0;
    const elapsed = this.#lastFrame === 0 ? 16 : Math.min(64, now - this.#lastFrame);
    this.#lastFrame = now;
    let busy = false;

    const simulation = this.#simulation;
    if (simulation !== null && simulation.alpha() >= simulation.alphaMin()) {
      simulation.tick();
      busy = true;
    }

    const target = this.#hovered ?? this.#selected;
    if (target !== null) this.#focus = target;
    const goal = target === null ? 0 : 1;
    if (this.#dim !== goal) {
      const step = this.#reducedMotion.matches ? 1 : elapsed / FADE_MS;
      this.#dim =
        goal > this.#dim ? Math.min(goal, this.#dim + step) : Math.max(goal, this.#dim - step);
      busy = true;
    }
    if (this.#dim === 0 && target === null) this.#focus = null;

    if (this.#camera !== null) {
      const t = Math.min(1, (now - this.#camera.start) / CAMERA_MS);
      const e = easeOut(t);
      const { from, to } = this.#camera;
      const k = from.k + (to.k - from.k) * e;
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e;
      if (t === 1) this.#camera = null;
      this.#zoom.transform(this.#selection, zoomIdentity.translate(x, y).scale(k));
      busy = busy || this.#camera !== null;
    }

    if (busy || this.#dirty) this.#draw();
    this.#dirty = false;
    if (busy && this.#frame === 0) this.#frame = requestAnimationFrame(this.#step);
    else if (!busy) this.#lastFrame = 0;
  };

  // Drawing

  #alpha(node: LayoutNode): number {
    let alpha = 1;
    if (this.#matches !== null && !this.#matches.has(node.id)) alpha = FADED;
    if (this.#focus !== null && this.#dim > 0 && !this.#inFocus(node.id)) {
      alpha *= 1 - (1 - FADED) * this.#dim;
    }
    return alpha;
  }

  #inFocus(id: string): boolean {
    return id === this.#focus || (this.#neighbours.get(this.#focus ?? "")?.has(id) ?? false);
  }

  #draw(): void {
    const context = this.#context;
    const palette = this.#palette;
    const { k, x, y } = this.#transform;
    const ratio = this.#ratio;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalAlpha = 1;
    context.fillStyle = palette.ground;
    context.fillRect(0, 0, this.#width, this.#height);

    context.setTransform(ratio * k, 0, 0, ratio * k, ratio * x, ratio * y);

    // Links: a hairline at any zoom, faded outside the focus, lapis inside it.
    const focused = this.#focus !== null && this.#dim > 0;
    context.lineWidth = 1 / k;
    context.strokeStyle = palette.lineStrong;
    context.globalAlpha =
      (this.#matches === null ? 1 : 0.35) * (focused ? 1 - (1 - FADED) * this.#dim : 1);
    context.beginPath();
    for (const link of this.#links) {
      context.moveTo(link.source.x ?? 0, link.source.y ?? 0);
      context.lineTo(link.target.x ?? 0, link.target.y ?? 0);
    }
    context.stroke();
    if (focused) {
      context.globalAlpha = this.#dim;
      context.strokeStyle = palette.lapis;
      context.lineWidth = 1.4 / k;
      context.beginPath();
      for (const link of this.#links) {
        if (link.source.id !== this.#focus && link.target.id !== this.#focus) continue;
        context.moveTo(link.source.x ?? 0, link.source.y ?? 0);
        context.lineTo(link.target.x ?? 0, link.target.y ?? 0);
      }
      context.stroke();
    }

    for (const node of this.#nodes) {
      context.globalAlpha = this.#alpha(node);
      const lit = node.kind === "source" || (focused && node.id === this.#focus);
      context.fillStyle = lit ? palette.lapis : palette.mute;
      context.beginPath();
      context.arc(node.x ?? 0, node.y ?? 0, node.radius, 0, Math.PI * 2);
      context.fill();
      if (node.id === this.#selected) {
        context.globalAlpha = 1;
        context.strokeStyle = palette.gold;
        context.lineWidth = 2.5 / k;
        context.beginPath();
        context.arc(node.x ?? 0, node.y ?? 0, node.radius + 3.5 / k, 0, Math.PI * 2);
        context.stroke();
      }
    }

    this.#drawLabels();
  }

  #drawLabels(): void {
    const context = this.#context;
    const { k, x, y } = this.#transform;
    context.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
    context.textAlign = "center";
    context.textBaseline = "top";
    context.lineJoin = "round";

    const fade = labelAlpha(k);
    const focused = this.#focus !== null && this.#dim > 0;
    const showMatches = this.#matches !== null && this.#matches.size <= 40;
    const late: Array<() => void> = [];
    const margin = 220;

    for (const node of this.#nodes) {
      const sx = (node.x ?? 0) * k + x;
      const sy = (node.y ?? 0) * k + y;
      if (sx < -margin || sy < -margin || sx > this.#width + margin || sy > this.#height + margin) {
        continue;
      }
      const label = this.#labels.get(node.id);
      if (label === undefined) continue;
      const strong =
        node.id === this.#selected ||
        (focused && this.#inFocus(node.id)) ||
        (showMatches && this.#matches?.has(node.id) === true);
      const base = this.#alpha(node);
      const top = sy + node.radius * k + 4;
      const draw = () => {
        let textTop = top;
        if (label.call !== null) {
          context.globalAlpha = base;
          this.#drawCall(label.call, sx, top);
          textTop += CALL_HEIGHT + 3;
        }
        const alpha = Math.max(fade, strong ? (focused ? this.#dim : 1) : 0) * base;
        if (alpha < 0.02) return;
        context.globalAlpha = alpha;
        this.#drawText(node, label, sx, textTop, strong);
      };
      if (strong) late.push(draw);
      else draw();
    }
    // The focus and its neighbours are written last, over everything else.
    for (const draw of late) draw();
  }

  #drawCall(call: string, cx: number, top: number): void {
    const context = this.#context;
    context.font = CALL_FONT;
    const width = context.measureText(call).width + 12;
    const left = Math.round(cx - width / 2) + 0.5;
    context.fillStyle = this.#palette.paper;
    context.strokeStyle = this.#palette.ink;
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(left, Math.round(top) + 0.5, Math.round(width), CALL_HEIGHT - 1, 2);
    context.fill();
    context.stroke();
    context.fillStyle = this.#palette.ink;
    context.fillText(call, cx, Math.round(top) + 3);
  }

  /** Names are Mute until they matter: the focus, its neighbours, a match, a Source's title. */
  #drawText(node: LayoutNode, label: NodeLabel, cx: number, top: number, strong: boolean): void {
    const context = this.#context;
    context.font = node.kind === "source" ? SOURCE_FONT : NOTE_FONT;
    const lines = this.#lines(node.id, label.text, context.font);
    context.strokeStyle = this.#palette.ground;
    context.lineWidth = 3;
    context.fillStyle = strong || node.kind === "source" ? this.#palette.ink : this.#palette.mute;
    lines.forEach((line, index) => {
      context.strokeText(line, cx, top + index * LINE_HEIGHT);
      context.fillText(line, cx, top + index * LINE_HEIGHT);
    });
  }

  /** A name broken into lines that fit the label width; whole words, nothing cut off. */
  #lines(id: string, text: string, font: string): ReadonlyArray<string> {
    const cached = this.#wrapped.get(id);
    if (cached !== undefined) return cached;
    const context = this.#context;
    context.font = font;
    const lines: Array<string> = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line === "" ? word : `${line} ${word}`;
      if (line !== "" && context.measureText(next).width > LABEL_WIDTH) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line !== "") lines.push(line);
    this.#wrapped.set(id, lines);
    return lines;
  }
}
