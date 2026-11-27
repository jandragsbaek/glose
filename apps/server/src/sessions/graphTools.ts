import { type GraphNode, linkKey, searchNodes } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Graph from "../vault/Graph.ts";
import type { AgentTool } from "./agent.ts";

export const MAX_MATCHES = 10;

const SNIPPET = 240;

const ReadNoteArguments = Schema.Struct({ name: Schema.String });
const SearchArguments = Schema.Struct({ query: Schema.String });
const decodeReadNote = Schema.decodeUnknownOption(ReadNoteArguments);
const decodeSearch = Schema.decodeUnknownOption(SearchArguments);

const snippetOf = (body: string, words: ReadonlyArray<string>) => {
  const flat = body.replace(/\s+/g, " ").trim();
  const lower = flat.normalize("NFC").toLocaleLowerCase("und");
  const hit = Math.min(...words.map((word) => lower.indexOf(word)).filter((at) => at >= 0));
  const start = Number.isFinite(hit) ? Math.max(0, hit - 60) : 0;
  const cut = flat.slice(start, start + SNIPPET);
  return `${start > 0 ? "…" : ""}${cut}${start + SNIPPET < flat.length ? "…" : ""}`;
};

export const searchGraph = (nodes: ReadonlyArray<GraphNode>, query: string) => {
  const titles = new Map(nodes.map((node) => [node.id, node.title]));
  return searchNodes(nodes, query)
    .slice(0, MAX_MATCHES)
    .map(({ node, matchedBodyWords }) => ({
      name: node.id,
      kind: node.kind,
      ...(node.kind === "source" ? { title: node.title } : {}),
      source: node.sourceId === null ? null : (titles.get(node.sourceId) ?? null),
      snippet: snippetOf(node.body, matchedBodyWords),
    }));
};

const graphFailed = { error: "The Graph could not be read." };

export const searchGraphTool = (graph: Graph.Graph["Service"]): AgentTool => ({
  name: "search_graph",
  entry: "search-graph",
  description: `Search the user's Graph (every Note and Source) for words. Returns up to ${MAX_MATCHES} matches, best first, with a snippet each. It finds whole words and their forms (habit, habits), not synonyms: search more than once, with other words, and in both Danish and English, to find related Notes.`,
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
