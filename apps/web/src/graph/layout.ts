import type { GraphNodeKind, GraphView } from "@glose/contracts";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

export interface LayoutNode extends SimulationNodeDatum {
  readonly id: string;
  readonly kind: GraphNodeKind;
  degree: number;
  radius: number;
}

export interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  source: LayoutNode;
  target: LayoutNode;
  readonly own: boolean;
}

export type GraphSimulation = Simulation<LayoutNode, LayoutLink>;

export const nodeRadius = (kind: GraphNodeKind, degree: number): number =>
  kind === "source"
    ? 9 + Math.sqrt(degree) * 1.2
    : kind === "person"
      ? 7 + Math.sqrt(degree) * 1.1
      : 3.5 + Math.sqrt(degree) * 1.1;

export const LABEL_FADE = { from: 1, to: 1.6 } as const;

export const labelAlpha = (zoom: number): number =>
  Math.min(1, Math.max(0, (zoom - LABEL_FADE.from) / (LABEL_FADE.to - LABEL_FADE.from)));

const SEED_RING = 320;

export const layoutData = (
  view: GraphView,
  previous: ReadonlyMap<string, LayoutNode>,
): { readonly nodes: Array<LayoutNode>; readonly links: Array<LayoutLink> } => {
  const sources = view.nodes.filter((node) => node.kind === "source");
  const seeds = new Map<string, { x: number; y: number }>();
  sources.forEach((source, index) => {
    const angle = (index / Math.max(1, sources.length)) * Math.PI * 2;
    seeds.set(source.id, { x: Math.cos(angle) * SEED_RING, y: Math.sin(angle) * SEED_RING });
  });

  const nodes = view.nodes.map((node, index): LayoutNode => {
    const kept = previous.get(node.id);
    if (kept !== undefined) return Object.assign(kept, { degree: 0 });
    const anchor = (node.sourceId === null ? undefined : seeds.get(node.sourceId)) ??
      seeds.get(node.id) ?? { x: 0, y: 0 };
    const angle = index * 2.399963;
    const distance = node.kind === "source" ? 0 : 30 + (index % 7) * 6;
    return {
      id: node.id,
      kind: node.kind,
      degree: 0,
      radius: 0,
      x: anchor.x + Math.cos(angle) * distance,
      y: anchor.y + Math.sin(angle) * distance,
    };
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const sourceOf = new Map(view.nodes.map((node) => [node.id, node.sourceId]));
  const links: Array<LayoutLink> = [];
  for (const link of view.links) {
    const source = byId.get(link.from);
    const target = byId.get(link.to);
    if (source === undefined || target === undefined) continue;
    source.degree += 1;
    target.degree += 1;
    links.push({
      source,
      target,
      own: sourceOf.get(source.id) === target.id || sourceOf.get(target.id) === source.id,
    });
  }
  for (const node of nodes) node.radius = nodeRadius(node.kind, node.degree);
  return { nodes, links };
};

export const makeSimulation = (
  nodes: Array<LayoutNode>,
  links: Array<LayoutLink>,
): GraphSimulation =>
  forceSimulation<LayoutNode, LayoutLink>(nodes)
    .force(
      "link",
      forceLink<LayoutNode, LayoutLink>(links)
        .id((node) => node.id)
        .distance((link) => (link.own ? 60 : 120))
        .strength((link) =>
          link.own ? 0.7 : 0.6 / Math.min(link.source.degree, link.target.degree),
        ),
    )
    .force("charge", forceManyBody<LayoutNode>().strength(-260).distanceMax(900))
    .force("x", forceX<LayoutNode>(0).strength(0.035))
    .force("y", forceY<LayoutNode>(0).strength(0.035))
    .force(
      "collide",
      forceCollide<LayoutNode>((node) => node.radius + 10),
    )
    .alphaDecay(0.03)
    .stop();

export const settle = (simulation: GraphSimulation, ticks = 260): void => {
  simulation.tick(ticks);
};
