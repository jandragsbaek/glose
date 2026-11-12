import { type GraphNode, linkKey } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Graph from "../graph/Graph.ts";
import type { AgentTool } from "./agent.ts";

/** Matches in one search; enough to see what the Graph holds on a subject. */
export const MAX_MATCHES = 10;

const SNIPPET = 240;

const ReadNoteArguments = Schema.Struct({ name: Schema.String });
const SearchArguments = Schema.Struct({ query: Schema.String });
const decodeReadNote = Schema.decodeUnknownOption(ReadNoteArguments);
const decodeSearch = Schema.decodeUnknownOption(SearchArguments);

/** Words of three letters or more, in any script, without regard to case. */
const words = (text: string) =>
  Array.from(new Set(text.toLocaleLowerCase("und").match(/[\p{L}\p{N}]{3,}/gu) ?? []));

const snippetOf = (body: string, terms: ReadonlyArray<string>) => {
  const flat = body.replace(/\s+/g, " ").trim();
  const lower = flat.toLocaleLowerCase("und");
  const hit = Math.min(...terms.map((term) => lower.indexOf(term)).filter((at) => at >= 0));
  const start = Number.isFinite(hit) ? Math.max(0, hit - 60) : 0;
  const cut = flat.slice(start, start + SNIPPET);
  return `${start > 0 ? "…" : ""}${cut}${start + SNIPPET < flat.length ? "…" : ""}`;
};

/**
 * The Graph's files that hold the most of the query's words, the title weighing more than the
 * text. Plain word matching: the AI searches again with other words when it needs to.
 */
export const searchGraph = (nodes: ReadonlyArray<GraphNode>, query: string) => {
  const terms = words(query);
  if (terms.length === 0) return [];
  const titles = new Map(nodes.map((node) => [node.id, node.title]));
  return nodes
    .map((node) => {
      const title = node.title.toLocaleLowerCase("und");
      const body = node.body.toLocaleLowerCase("und");
      const score = terms.reduce(
        (sum, term) => sum + (title.includes(term) ? 3 : 0) + (body.includes(term) ? 1 : 0),
        0,
      );
      return { node, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id, "en"))
    .slice(0, MAX_MATCHES)
    .map(({ node }) => ({
      name: node.id,
      kind: node.kind,
      ...(node.kind === "source" ? { title: node.title } : {}),
      source: node.sourceId === null ? null : (titles.get(node.sourceId) ?? null),
      snippet: snippetOf(node.body, terms),
    }));
};

const graphFailed = { error: "The Graph could not be read." };

export const searchGraphTool = (graph: Graph.Graph["Service"]): AgentTool => ({
  name: "search_graph",
  entry: "search-graph",
  description: `Search the user's Graph (every Note and Source) for words. Returns up to ${MAX_MATCHES} matches with a snippet each. Search more than once, with other words, to find related Notes.`,
  parameters: {
    type: "object",
    properties: { query: { type: "string", description: "A few words to look for." } },
    required: ["query"],
    additionalProperties: false,
  },
  detail: (args) => Option.getOrUndefined(decodeSearch(args))?.query.trim(),
  run: (args) =>
    Option.match(decodeSearch(args), {
      onNone: () => Effect.succeed({ error: "Give words to search for." }),
      onSome: ({ query }) =>
        graph.read.pipe(
          Effect.map((view) => ({ matches: searchGraph(view.nodes, query) })),
          Effect.orElseSucceed(() => graphFailed),
        ),
    }),
});

export const readNoteTool = (graph: Graph.Graph["Service"]): AgentTool => ({
  name: "read_note",
  entry: "read-note",
  description:
    "Read a Note in the user's Graph by name: its Markdown text, its Source and page, the Notes it links to, and the Notes that link to it.",
  parameters: {
    type: "object",
    properties: { name: { type: "string", description: "The Note's name." } },
    required: ["name"],
    additionalProperties: false,
  },
  detail: (args) => Option.getOrUndefined(decodeReadNote(args))?.name.trim(),
  run: (args) =>
    Option.match(decodeReadNote(args), {
      onNone: () => Effect.succeed({ error: "Give the Note's name." }),
      onSome: ({ name }) =>
        graph.read.pipe(
          Effect.map((view) => {
            const node = view.nodes.find((other) => linkKey(other.id) === linkKey(name));
            if (node === undefined) return { error: `There is no Note named ${name}.` };
            const titles = new Map(view.nodes.map((other) => [other.id, other.title]));
            return {
              name: node.id,
              kind: node.kind,
              text: node.body,
              source: node.sourceId === null ? null : (titles.get(node.sourceId) ?? null),
              page: node.page,
              links: view.links.filter((link) => link.from === node.id).map((link) => link.to),
              linkedFrom: view.links.filter((link) => link.to === node.id).map((link) => link.from),
              containsAiText: node.aiText,
            };
          }),
          Effect.orElseSucceed(() => graphFailed),
        ),
    }),
});
