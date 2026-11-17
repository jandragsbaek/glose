import { type GraphNode, type GraphView, linkKey, type Source } from "@glose/contracts";

import { callNumber } from "../domain/source.ts";
import type { NodeLabel } from "./GraphCanvas.ts";

export interface GraphIndex {
  readonly byId: ReadonlyMap<string, GraphNode>;
  readonly byKey: ReadonlyMap<string, GraphNode>;
  readonly sources: ReadonlyMap<string, Source>;
  readonly linked: ReadonlyMap<string, ReadonlyArray<GraphNode>>;
}

export const indexGraph = (view: GraphView, sources: ReadonlyArray<Source>): GraphIndex => {
  const byId = new Map(view.nodes.map((node) => [node.id, node]));
  const linked = new Map<string, Set<GraphNode>>(view.nodes.map((node) => [node.id, new Set()]));
  for (const link of view.links) {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (from === undefined || to === undefined) continue;
    linked.get(from.id)?.add(to);
    linked.get(to.id)?.add(from);
  }
  return {
    byId,
    byKey: new Map(view.nodes.map((node) => [linkKey(node.id), node])),
    sources: new Map(sources.map((source) => [source.id, source])),
    linked: new Map(
      Array.from(linked, ([id, nodes]) => [
        id,
        Array.from(nodes).sort((a, b) => a.title.localeCompare(b.title)),
      ]),
    ),
  };
};

export const labelOf = (node: GraphNode, index: GraphIndex): NodeLabel => {
  const source = index.sources.get(node.id);
  return {
    text: node.title,
    call: node.kind === "source" && source !== undefined ? callNumber(source) : null,
  };
};

export const findNodes = (
  view: GraphView,
  labels: ReadonlyMap<string, NodeLabel>,
  query: string,
): ReadonlyArray<GraphNode> | null => {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return null;
  return view.nodes.filter((node) =>
    [node.title, labels.get(node.id)?.call ?? ""].some((text) =>
      text.toLocaleLowerCase().includes(needle),
    ),
  );
};

export const holdsAiText = (node: GraphNode): boolean =>
  node.kind === "note" && (node.aiText || node.aiTitle);

export const narrowToAiText = (
  found: ReadonlyArray<GraphNode> | null,
  unwritten: ReadonlyArray<GraphNode>,
  aiOnly: boolean,
): ReadonlyArray<GraphNode> | null => (aiOnly ? (found ?? unwritten).filter(holdsAiText) : found);
