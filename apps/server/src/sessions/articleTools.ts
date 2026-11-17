import { articleForAi, parseArticle } from "@glose/contracts";
import * as Effect from "effect/Effect";

import type * as Sources from "../graph/Sources.ts";
import type { AgentTool } from "./agent.ts";

const NO_ARGUMENTS = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

export const articleOf = (sources: Sources.Sources["Service"], source: string) =>
  sources.articleText(source).pipe(
    Effect.map(parseArticle),
    Effect.orElseSucceed(() => null),
  );

export const readArticleTool = (
  sources: Sources.Sources["Service"],
  source: string,
): AgentTool => ({
  name: "read_article",
  entry: "read-article",
  description:
    "Read the full text of this Source when it is an Article or a Course lesson: every paragraph after its number (¶ 8; the number is the Location), and the Passages the user marked while reading, with their own words on them. A book has no text here.",
  parameters: NO_ARGUMENTS,
  run: () =>
    articleOf(sources, source).pipe(
      Effect.map((article) =>
        article === null
          ? { error: "This Source is a book: Glose does not hold its text." }
          : {
              paragraphs: article.units.length,
              text: articleForAi(article),
              passages: article.passages.map((passage) => ({
                paragraph: passage.n,
                text: passage.text,
                userWords: passage.words,
              })),
            },
      ),
    ),
});
