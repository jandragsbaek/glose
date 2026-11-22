import type { BookPassage } from "@glose/contracts";
import * as Effect from "effect/Effect";

import type * as Passages from "../vault/Passages.ts";
import type { AgentTool } from "./agent.ts";
import { findQuote } from "./quotes.ts";

const NO_ARGUMENTS = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

export const passageWith = (
  passages: ReadonlyArray<BookPassage>,
  quote: string,
): { readonly passage: BookPassage; readonly text: string } | null => {
  for (const passage of passages) {
    const text = findQuote(passage.words, quote);
    if (text !== null) return { passage, text: text.replace(/\s+/g, " ") };
  }
  return null;
};

export const readPassagesTool = (
  passages: Passages.Passages["Service"],
  source: string,
): AgentTool => ({
  name: "read_passages",
  entry: null,
  description:
    "Read the book's Passages: words the user copied from their copy, each with its page, their own words on it, and the Notes that already cite it.",
  parameters: NO_ARGUMENTS,
  run: () =>
    passages.list(source).pipe(
      Effect.map((all) => ({
        passages: all.map((passage) => ({
          page: passage.page,
          words: passage.words,
          yourWords: passage.yourWords,
          usedBy: passage.usedBy,
        })),
      })),
      Effect.orElseSucceed(() => ({ error: "The Passages could not be read." })),
    ),
});
