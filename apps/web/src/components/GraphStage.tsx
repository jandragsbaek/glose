import type { GraphView } from "@glose/contracts";
import { Maximize, Minus, Plus } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { GraphCanvas, type GraphCanvasEvents, type NodeLabel } from "../graph/GraphCanvas.ts";
import { useT } from "../i18n/I18n.tsx";

const NO_IDS: ReadonlyArray<string> = [];

export function GraphStage({
  view,
  labels,
  selectedId,
  matches,
  events,
  canvas,
  onCanvas,
  covered = false,
  trail = NO_IDS,
  cited = NO_IDS,
  home = null,
  label,
  className = "graph__stage",
  children,
}: {
  readonly view: GraphView;
  readonly labels: ReadonlyMap<string, NodeLabel>;
  readonly selectedId: string | null;
  readonly matches: ReadonlySet<string> | null;
  readonly events: GraphCanvasEvents;
  readonly canvas: GraphCanvas | null;
  readonly onCanvas: (canvas: GraphCanvas | null) => void;
  readonly covered?: boolean;
  readonly trail?: ReadonlyArray<string>;
  readonly cited?: ReadonlyArray<string>;
  readonly home?: ReadonlyArray<string> | null;
  readonly label?: string;
  readonly className?: string;
  readonly children?: ReactNode;
}) {
  const t = useT();
  const element = useRef<HTMLCanvasElement>(null);
  const opened = useRef(false);
  const notes = view.nodes.length;

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the canvas is an imperative renderer that owns DOM listeners and an animation loop; it lives exactly as long as this element.
  useEffect(() => {
    if (element.current === null) return;
    const instance = new GraphCanvas(element.current);
    onCanvas(instance);
    return () => {
      instance.destroy();
      onCanvas(null);
    };
  }, [onCanvas]);

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- pushes React's data into the imperative canvas; it keeps node positions across updates.
  useEffect(() => {
    if (canvas === null) return;
    canvas.setEvents(events);
    canvas.setData(view, labels);
    canvas.setSelected(selectedId);
    canvas.setMatches(matches);
    canvas.setTrail(trail);
    canvas.setCited(cited);
    if (!opened.current) {
      if (selectedId !== null) canvas.centerOn(selectedId);
      else if (home !== null) canvas.setHome(home);
    }
    opened.current = true;
  }, [canvas, events, view, labels, selectedId, matches, trail, cited, home]);

  return (
    <div className={className} inert={covered}>
      <canvas
        ref={element}
        className="graph__canvas"
        tabIndex={0}
        role="img"
        aria-label={label ?? t.graph.canvasLabel(notes, view.links.length)}
      />
      <div className="graph__controls">
        <button
          type="button"
          className="button graph__control"
          aria-label={t.graph.zoomIn}
          title={t.graph.zoomIn}
          onClick={() => canvas?.zoomBy(1.5)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="button graph__control"
          aria-label={t.graph.zoomOut}
          title={t.graph.zoomOut}
          onClick={() => canvas?.zoomBy(1 / 1.5)}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="button graph__control"
          aria-label={t.graph.fit}
          title={t.graph.fit}
          onClick={() => canvas?.fit()}
        >
          <Maximize size={16} aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  );
}
