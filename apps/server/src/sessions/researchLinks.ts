import { linkKey, type ResearchLink, type SessionEntry } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Graph from "../graph/Graph.ts";
import type { AgentTool, InputItem } from "./agent.ts";
import { readNoteTool, searchGraphTool } from "./graphTools.ts";
import { linksOf, MAX_LINKS, pagesOf } from "./research.ts";

const LinksArguments = Schema.Struct({
  links: Schema.Array(Schema.Struct({ note: Schema.String, why: Schema.String })),
});
const decodeLinks = Schema.decodeUnknownOption(LinksArguments);

export interface LinkContext {
  readonly graph: Graph.Graph["Service"];
  readonly proposeLinks: (links: ReadonlyArray<ResearchLink>) => Effect.Effect<void>;
}

export const LINK_INSTRUCTIONS = `You are the AI in Glose, a desktop app where a person learns from what they read. The user is writing a new Note in their Graph. Find the Notes they already have that the new Note should link to.

- Call search_graph a few times with different words for the Note's idea, and read_note where you need to see what a Note says.
- Then call propose_links once with the Notes that truly belong with the new one (at most ${MAX_LINKS}), each with one sentence on why. Only names that exist. Propose none if none fits.
- You have no other tools and nothing else to do. Do not write a message.`;

export const linksKickoff = (entries: ReadonlyArray<SessionEntry>): InputItem => {
  const start = entries.findLast((entry) => entry._tag === "ResearchStart");
  const pages = pagesOf(entries).filter((page) => page.state !== "dropped");
  return {
    type: "message",
    role: "user",
    content: [
      start?._tag === "ResearchStart" ? `The new Note: "${start.title}"` : null,
      start?._tag === "ResearchStart" && start.question !== ""
        ? `Their question: ${start.question}`
        : null,
      start?._tag === "ResearchStart" && start.notes.length > 0
        ? `It connects: ${start.notes.map((note) => `[[${note}]]`).join(" and ")}`
        : null,
      pages.length === 0
        ? null
        : `Pages found for it:\n${pages.map((page) => `- ${page.title}: ${page.why}`).join("\n")}`,
      `Already proposed: ${
        linksOf(entries)
          .map((link) => `[[${link.note}]]`)
          .join(", ") || "none"
      }`,
    ]
      .filter((line) => line !== null)
      .join("\n\n"),
  };
};

export const linkTools = ({ graph, proposeLinks }: LinkContext): AgentTool[] => [
  searchGraphTool(graph),
  readNoteTool(graph),
  {
    name: "propose_links",
    entry: null,
    description: `Propose existing Notes in the user's Graph that the new Note should link to, at most ${MAX_LINKS}.`,
    parameters: {
      type: "object",
      properties: {
        links: {
          type: "array",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "The exact name of a Note in the Graph." },
              why: {
                type: "string",
                description: "Why the two Notes belong together, in a sentence.",
              },
            },
            required: ["note", "why"],
            additionalProperties: false,
          },
        },
      },
      required: ["links"],
      additionalProperties: false,
    },
    run: Effect.fn("Research.proposeLinks")(function* (args: unknown) {
      const asked = Option.getOrNull(decodeLinks(args))?.links;
      if (asked === undefined || asked.length === 0) return { error: "Give at least one Note." };
      const view = yield* graph.read.pipe(Effect.option);
      if (Option.isNone(view)) return { error: "The Graph could not be read." };
      const byKey = new Map(
        view.value.nodes
          .filter((node) => node.kind === "note")
          .map((node) => [linkKey(node.id), node.id]),
      );
      const links = asked.slice(0, MAX_LINKS).flatMap((link) => {
        const note = byKey.get(linkKey(link.note));
        return note === undefined ? [] : [{ note, why: link.why.trim() }];
      });
      const unknown = asked.length - links.length;
      if (links.length > 0) yield* proposeLinks(links);
      return {
        shown: links.length,
        ...(unknown > 0 ? { notes: `${unknown} name(s) are not Notes in the Graph.` } : {}),
      };
    }),
  },
];
