/* oxlint-disable jandragsbaek/max-file-lines -- one canvas renderer whose drawing, hit-testing and camera share one mutable scene; split next */
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
import { type Box, frameTarget, labelCenter, overlaps, wrapWords } from "./canvasGeometry.ts";
import { type Palette, readPalette } from "./canvasPalette.ts";
import { drawStopTabs, drawTrailLine, layoutStopTabs, type StopTab } from "./canvasTrail.ts";

export interface NodeLabel {
  readonly text: string;
  readonly call: string | null;
}

export interface GraphCanvasEvents {
  readonly onSelect: (id: string | null) => void;
  readonly onOpen: (id: string) => void;
  readonly onFit?: () => void;
}

const NOTE_FONT = '500 12px "Public Sans", system-ui, sans-serif';
const SOURCE_FONT = '600 12.5px "Public Sans", system-ui, sans-serif';
const CALL_FONT = '700 11px "Courier Prime", ui-monospace, monospace';
const LABEL_WIDTH = 170;
const LINE_HEIGHT = 15;
const CALL_HEIGHT = 17;
const FADED = 0.14;
const MARKED = 0.6;
const GHOST = 0.5;

const STOP_FONT = '700 11px "Courier Prime", ui-monospace, monospace';
const STOP_HEIGHT = 17;
const SCALE_EXTENT: [number, number] = [0.12, 6];
const CLICK_SLOP = 4;
const FADE_MS = 160;
const CAMERA_MS = 420;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

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
  #held = false;
  #home: ReadonlyArray<string> | null = null;
  #insetTop = 0;
  #insetLeft = 0;
  #keepClear: ReadonlyArray<Box> = [];

  #view: GraphView | null = null;
  #simulation: GraphSimulation | null = null;
  #nodes: Array<LayoutNode> = [];
  #links: Array<LayoutLink> = [];
  #byId = new Map<string, LayoutNode>();
  #neighbours = new Map<string, Set<string>>();
  #labels: ReadonlyMap<string, NodeLabel> = new Map();
  #wrapped = new Map<string, ReadonlyArray<string>>();
  #widths = new Map<string, number>();

  #hovered: string | null = null;
  #selected: string | null = null;
  #matches: ReadonlySet<string> | null = null;
  #trail: ReadonlyArray<string> = [];
  #cited: ReadonlySet<string> = new Set();
  #focus: string | null = null;
  #dim = 0;
  #lastFrame = 0;

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
      .filter((event: MouseEvent | TouchEvent | WheelEvent) => {
        if (event.type === "wheel") return true;
        if ("button" in event && (event.button !== 0 || event.ctrlKey)) return false;
        const point = "touches" in event ? event.touches[0] : event;
        return point === undefined || this.#hit(this.#local(point)) === null;
      })
      .on("zoom", (event: { transform: ZoomTransform; sourceEvent: unknown }) => {
        this.#transform = event.transform;
        if (event.sourceEvent !== null && event.sourceEvent !== undefined) this.#held = true;
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
    void document.fonts.ready.then(() => {
      this.#wrapped.clear();
      this.#widths.clear();
      this.#request();
    });
  }

  setEvents(events: GraphCanvasEvents): void {
    this.#events = events;
  }

  setData(view: GraphView, labels: ReadonlyMap<string, NodeLabel>): void {
    if (this.#labels !== labels) {
      this.#labels = labels;
      this.#wrapped.clear();
      this.#widths.clear();
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
    if (!this.#fitted && this.#width > 0) this.#fitHome(false);
    this.#request();
  }

  setHome(ids: ReadonlyArray<string> | null): void {
    this.#home = ids;
    if (!this.#held && this.#width > 0 && this.#nodes.length > 0) this.#fitHome(false);
  }

  setSelected(id: string | null): void {
    this.#selected = id;
    this.#request();
  }

  setMatches(ids: ReadonlySet<string> | null): void {
    this.#matches = ids;
    this.#request();
  }

  setTrail(ids: ReadonlyArray<string>): void {
    if (ids === this.#trail) return;
    this.#trail = ids;
    this.#request();
  }

  setCited(ids: ReadonlyArray<string>): void {
    const next = new Set(ids);
    if (next.size === this.#cited.size && ids.every((id) => this.#cited.has(id))) return;
    this.#cited = next;
    this.#request();
  }

  zoomBy(factor: number): void {
    const center: [number, number] = [this.#width / 2, this.#height / 2];
    const k = Math.min(SCALE_EXTENT[1], Math.max(SCALE_EXTENT[0], this.#transform.k * factor));
    const [wx, wy] = this.#transform.invert(center);
    this.#moveCamera(zoomIdentity.translate(center[0] - wx * k, center[1] - wy * k).scale(k));
  }

  fit(animate = true): void {
    this.#home = null;
    this.#held = false;
    this.#frameNodes(this.#nodes, animate);
  }

  frame(ids: ReadonlyArray<string>, animate = true): void {
    const wanted = new Set(ids);
    const nodes = this.#nodes.filter((node) => wanted.has(node.id));
    if (nodes.length === 0) return;
    this.#held = true;
    this.#frameNodes(nodes, animate);
  }

  setInsets(top: number, left: number): void {
    this.#insetTop = top;
    this.#insetLeft = left;
  }

  setKeepClear(boxes: ReadonlyArray<Box>): void {
    this.#keepClear = boxes;
    this.#request();
  }

  reveal(id: string): void {
    const node = this.#byId.get(id);
    if (node === undefined || this.#width === 0) return;
    const [sx, sy] = this.#transform.apply([node.x ?? 0, node.y ?? 0]);
    const inside =
      sx > this.#insetLeft + Math.min(80, this.#width * 0.12) &&
      sx < this.#width - Math.min(100, this.#width * 0.15) &&
      sy > this.#insetTop + Math.min(40, this.#height * 0.1) &&
      sy < this.#height - Math.min(110, this.#height * 0.25);
    if (!inside) this.#centerAt(node, this.#transform.k);
  }

  #fitHome(animate: boolean): void {
    const home = this.#home;
    if (home === null || home.length === 0) {
      this.#frameNodes(this.#nodes, animate);
      return;
    }
    const ids = new Set(home);
    const framed = this.#nodes.filter((node) => ids.has(node.id));
    this.#frameNodes(framed.length === 0 ? this.#nodes : framed, animate);
  }

  #frameNodes(nodes: ReadonlyArray<LayoutNode>, animate: boolean): void {
    if (nodes.length === 0 || this.#width === 0) return;
    const few = nodes.length < this.#nodes.length;
    const target = frameTarget(nodes, this.#width, this.#height, {
      left: (few ? LABEL_WIDTH / 2 + 8 : 40) + this.#insetLeft,
      right: few ? LABEL_WIDTH / 2 + 8 : 40,
      top: this.#insetTop + Math.min(40, this.#height * 0.06),
      bottom: Math.min(few ? 40 + LINE_HEIGHT * 3 : 40 + CALL_HEIGHT, this.#height * 0.18),
      maxScale: few ? 1.6 : 1.4,
      minScale: SCALE_EXTENT[0],
    });
    this.#fitted = true;
    this.#moveCamera(target, animate);
  }

  centerOn(id: string): void {
    const node = this.#byId.get(id);
    if (node === undefined || this.#width === 0) return;
    this.#centerAt(node, Math.max(this.#transform.k, 1.7));
  }

  #centerAt(node: LayoutNode, k: number): void {
    this.#held = true;
    const cx = this.#insetLeft + (this.#width - this.#insetLeft) / 2;
    const cy = this.#insetTop + (this.#height - this.#insetTop) / 2;
    this.#moveCamera(
      zoomIdentity.translate(cx - (node.x ?? 0) * k, cy - (node.y ?? 0) * k).scale(k),
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

  #local(point: { readonly clientX: number; readonly clientY: number }): [number, number] {
    const rect = this.#canvas.getBoundingClientRect();
    return [point.clientX - rect.left, point.clientY - rect.top];
  }

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
      "0": () => (this.#events.onFit === undefined ? this.fit() : this.#events.onFit()),
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
    if (!this.#held && this.#nodes.length > 0 && rect.width > 0) this.#fitHome(false);
    this.#dirty = true;
    this.#request();
  }

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

  #alpha(node: LayoutNode): number {
    let alpha = 1;
    if (this.#matches !== null && !this.#matches.has(node.id)) alpha = FADED;
    if (this.#focus !== null && this.#dim > 0 && !this.#inFocus(node.id)) {
      alpha *= 1 - (1 - FADED) * this.#dim;
    }
    return this.#marked(node.id) ? Math.max(alpha, MARKED) : alpha;
  }

  #marked(id: string): boolean {
    return this.#cited.has(id) || this.#trail.includes(id);
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

    const focused = this.#focus !== null && this.#dim > 0;
    context.lineWidth = 1 / k;
    context.strokeStyle = palette.lineStrong;
    const quiet = this.#trail.length > 0 || this.#cited.size > 0 ? 0.55 : 1;
    context.globalAlpha =
      quiet * (this.#matches === null ? 1 : 0.35) * (focused ? 1 - (1 - FADED) * this.#dim : 1);
    context.beginPath();
    for (const link of this.#links) {
      context.moveTo(link.source.x ?? 0, link.source.y ?? 0);
      context.lineTo(link.target.x ?? 0, link.target.y ?? 0);
    }
    context.stroke();
    if (focused) {
      context.globalAlpha = this.#dim * (this.#trail.length > 0 ? 0.6 : 1);
      context.strokeStyle = this.#trail.length > 0 ? palette.ink : palette.lapis;
      context.lineWidth = 1.4 / k;
      context.beginPath();
      for (const link of this.#links) {
        if (link.source.id !== this.#focus && link.target.id !== this.#focus) continue;
        context.moveTo(link.source.x ?? 0, link.source.y ?? 0);
        context.lineTo(link.target.x ?? 0, link.target.y ?? 0);
      }
      context.stroke();
    }
    this.#drawTrail();

    for (const node of this.#nodes) {
      context.globalAlpha = this.#alpha(node);
      const lit = node.kind === "source" || (focused && node.id === this.#focus);
      context.fillStyle = lit ? palette.lapis : palette.mute;
      context.beginPath();
      context.arc(node.x ?? 0, node.y ?? 0, node.radius, 0, Math.PI * 2);
      context.fill();
      const cited = this.#cited.has(node.id);
      if (cited) {
        context.strokeStyle = palette.lapis;
        context.lineWidth = 1.5 / k;
        context.beginPath();
        context.arc(node.x ?? 0, node.y ?? 0, node.radius + 3.5 / k, 0, Math.PI * 2);
        context.stroke();
      }
      if (node.id === this.#selected) {
        context.globalAlpha = 1;
        context.strokeStyle = palette.gold;
        context.lineWidth = 2.5 / k;
        context.beginPath();
        context.arc(node.x ?? 0, node.y ?? 0, node.radius + (cited ? 7 : 3.5) / k, 0, Math.PI * 2);
        context.stroke();
      }
    }

    this.#context.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
    const tabs = this.#stopTabs();
    this.#drawLabels(tabs);
    drawStopTabs(this.#context, tabs, STOP_HEIGHT, STOP_FONT, this.#palette);
  }

  #drawTrail(): void {
    const stops = this.#trail.flatMap((id) => this.#byId.get(id) ?? []);
    const points = stops.map((node): [number, number] => [node.x ?? 0, node.y ?? 0]);
    drawTrailLine(this.#context, points, 3 / this.#transform.k, this.#palette.lapis);
  }

  #stopTabs(): ReadonlyArray<StopTab> {
    const { k, x, y } = this.#transform;
    this.#context.font = STOP_FONT;
    const stops = this.#trail.flatMap((id, index) => {
      const node = this.#byId.get(id);
      if (node === undefined) return [];
      const number = index + 1;
      const width = Math.max(STOP_HEIGHT, this.#context.measureText(String(number)).width + 10);
      const nodeTop = (node.y ?? 0) * k + y - node.radius * k;
      return [{ cx: (node.x ?? 0) * k + x, nodeTop, width, number, here: id === this.#selected }];
    });
    return layoutStopTabs(stops, STOP_HEIGHT, this.#height);
  }

  #drawLabels(tabs: ReadonlyArray<StopTab>): void {
    const context = this.#context;
    const { k, x, y } = this.#transform;
    context.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
    context.textAlign = "center";
    context.textBaseline = "top";
    context.lineJoin = "round";

    const fade = labelAlpha(k);
    const focused = this.#focus !== null && this.#dim > 0;
    const showMatches = this.#matches !== null && this.#matches.size <= 40;
    const margin = 220;
    const taken: ReadonlyArray<Box> = [...this.#keepClear, ...tabs.map((tab) => tab.box)];
    const open = this.#byId.get(this.#selected ?? "");
    const ring = open === undefined ? 0 : open.radius * k + 8;
    const [ox, oy] =
      open === undefined ? [0, 0] : this.#transform.apply([open.x ?? 0, open.y ?? 0]);
    const placed: Array<Box> = [...taken];
    if (open !== undefined) {
      placed.push({ left: ox - ring, right: ox + ring, top: oy - ring, bottom: oy + ring });
    }
    const items: Array<{ readonly rank: number; readonly box: Box; readonly draw: () => void }> =
      [];

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
        this.#marked(node.id) ||
        (focused && this.#inFocus(node.id)) ||
        (showMatches && this.#matches?.has(node.id) === true);
      const base = this.#alpha(node);
      const textAlpha = Math.max(fade, strong ? (focused ? this.#dim : 1) : 0) * base;
      const showText = textAlpha >= 0.02 && (strong || base >= GHOST);
      const call = strong || base >= GHOST ? label.call : null;
      if (!showText && call === null) continue;
      const font = node.kind === "source" ? SOURCE_FONT : NOTE_FONT;
      const lines = showText ? this.#lines(node.id, label.text, font) : [];
      const callWidth = call === null ? 0 : this.#callWidth(call);
      const width = Math.max(callWidth, showText ? this.#textWidth(node.id, lines, font) : 0);
      const below = sy + node.radius * k + 4;
      const callSpace = call === null ? 0 : CALL_HEIGHT + 3;
      const height = callSpace + lines.length * LINE_HEIGHT;
      const fits = (at: number) => {
        const cx = labelCenter(sx, width, at, at + height, this.#keepClear, this.#width);
        const box = { left: cx - width / 2, right: cx + width / 2, top: at, bottom: at + height };
        return at + height <= this.#height - 2 && !taken.some((other) => overlaps(other, box));
      };
      const above = Math.max(2, sy - node.radius * k - 16 - STOP_HEIGHT - height);
      const flip = node.id === this.#selected && !fits(below) && fits(above);
      const top = flip ? above : below;
      const bottom = top + height;
      const cx = labelCenter(sx, width, top, bottom, this.#keepClear, this.#width);
      const box: Box = { left: cx - width / 2 - 2, right: cx + width / 2 + 2, top, bottom };
      const order = [
        node.id === this.#selected,
        this.#trail.includes(node.id),
        this.#cited.has(node.id),
        strong,
      ].indexOf(true);
      const rank = order === -1 ? 4 : order;
      items.push({
        rank,
        box,
        draw: () => {
          if (call !== null) {
            context.globalAlpha = base;
            this.#drawCall(call, cx, top);
          }
          if (!showText) return;
          context.globalAlpha = textAlpha;
          this.#drawText(node, lines, cx, top + callSpace, strong);
        },
      });
    }
    items.sort((a, b) => a.rank - b.rank);
    for (const item of items) {
      const offCanvas = item.box.top < 0 || item.box.bottom > this.#height - 2;
      if (item.rank > 0 && (offCanvas || placed.some((other) => overlaps(other, item.box)))) {
        continue;
      }
      placed.push(item.box);
      item.draw();
    }
  }

  #callWidth(call: string): number {
    this.#context.font = CALL_FONT;
    return this.#context.measureText(call).width + 12;
  }

  #textWidth(id: string, lines: ReadonlyArray<string>, font: string): number {
    const cached = this.#widths.get(id);
    if (cached !== undefined) return cached;
    this.#context.font = font;
    const width = Math.max(0, ...lines.map((line) => this.#context.measureText(line).width));
    this.#widths.set(id, width);
    return width;
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

  #drawText(
    node: LayoutNode,
    lines: ReadonlyArray<string>,
    cx: number,
    top: number,
    strong: boolean,
  ): void {
    const context = this.#context;
    context.font = node.kind === "source" ? SOURCE_FONT : NOTE_FONT;
    context.strokeStyle = this.#palette.ground;
    context.lineWidth = 3;
    context.fillStyle = strong || node.kind === "source" ? this.#palette.ink : this.#palette.mute;
    lines.forEach((line, index) => {
      context.strokeText(line, cx, top + index * LINE_HEIGHT);
      context.fillText(line, cx, top + index * LINE_HEIGHT);
    });
  }

  #lines(id: string, text: string, font: string): ReadonlyArray<string> {
    const cached = this.#wrapped.get(id);
    if (cached !== undefined) return cached;
    this.#context.font = font;
    const lines = wrapWords(text, LABEL_WIDTH, (line) => this.#context.measureText(line).width);
    this.#wrapped.set(id, lines);
    return lines;
  }
}
