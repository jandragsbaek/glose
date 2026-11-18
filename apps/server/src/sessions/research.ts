import {
  type ArticleType,
  articleForAi,
  findInArticle,
  type FoundPage,
  type FoundQuote,
  type Language,
  linkKey,
  parseArticle,
  type ResearchAsk,
  type ResearchLink,
  type SessionEntry,
  type Source,
  type Stance,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Graph from "../graph/Graph.ts";
import type * as WebPages from "../research/WebPages.ts";
import { webUrl } from "../research/WebPages.ts";
import type { AgentTool, InputItem } from "./agent.ts";
import { readNoteTool, searchGraphTool } from "./graphTools.ts";

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", da: "Danish" };

export const MAX_PAGES = 5;
export const MAX_QUOTES = 3;
export const MAX_LINKS = 6;
const MAX_PAGE_TEXT = 60_000;

export const INSTRUCTIONS = `You are the AI in Glose, a desktop app where a person learns from what they read. The user is writing a new Note in their Graph, from blank, and asked you to research it online.

Your part is to find sources, not to write. You bring web pages, exact quotes from them, and Links to Notes the user already has. You never write the Note's text and never suggest wording for it: the user writes it in their own words.

The user picked what they want:
- learn: they want to learn the topic. Find clear, reliable pages that explain it, from different angles.
- back: they have an idea of their own. Find pages that support it, and also pages that pull against it.
- check: they want to check a claim. Find the strongest evidence on both sides, and say plainly what it shows.
- bridge: they want the idea that connects two of their Notes. Read both Notes first, then find pages on what joins them.

How to work:
- Read the user's title, text and question in the first message. For bridge, call read_note on both Notes.
- Use web_search to find pages. Prefer primary and reliable sources: research papers and their abstracts, universities, public bodies, encyclopedias, serious journalism, the author's own site. Avoid content farms, listicles and pages that only repeat others.
- Call read_web_page on every page before you propose it: you can only quote what you have read there. A page Glose cannot read (a paywall, a PDF, a blocked site) cannot be proposed; say so if it matters.
- Propose pages only through propose_pages, a few at a time (at most ${MAX_PAGES} per call). For each, give its stance (supports, pulls-against or context), one sentence on why it matters for this Note, and 1 to ${MAX_QUOTES} quotes: the exact words of the page, copied character for character from read_web_page's text, each a sentence or two. Glose checks every quote word for word and drops one that is not on the page.
- Call search_graph with a few different words, and read_note where it helps, then propose_links for existing Notes the new Note should link to, with a reason each. Only names that exist.
- After you propose, write two or three short sentences: what you found, how strong it is, and what is still open. Do not repeat the quotes. Do not lecture.
- When the user gives a web address, read that page and propose it if it fits.
- Never present your own knowledge as what a page says. If the evidence is thin or mixed, say so.
- Write your messages in the language of the user's messages, or the interface language named in the first message. Quotes stay in the language of the page.
- Write plain text.`;

const ASKS: Record<ResearchAsk, string> = {
  learn: "learn: they want to learn this topic",
  back: "back: they have an idea of their own and want sources for and against it",
  check: "check: they want to check whether this claim holds",
  bridge: "bridge: they want the idea that connects two of their Notes",
};

export const kickoff = (
  input: {
    readonly ask: ResearchAsk;
    readonly title: string;
    readonly text: string;
    readonly question: string;
    readonly notes: ReadonlyArray<string>;
  },
  language: Language,
): InputItem => ({
  type: "message",
  role: "user",
  content: [
    `Research for a new Note. The user's interface language is ${LANGUAGE_NAMES[language]}.`,
    `What they want: ${ASKS[input.ask]}.`,
    `Title so far: ${input.title === "" ? "(none yet)" : `"${input.title}"`}`,
    input.text === "" ? "Text so far: (none yet)" : `Text so far:\n"""\n${input.text}\n"""`,
    input.question === "" ? null : `Their question: ${input.question}`,
    input.notes.length === 0
      ? null
      : `The Notes to connect: ${input.notes.map((note) => `[[${note}]]`).join(" and ")}`,
  ]
    .filter((line) => line !== null)
    .join("\n\n"),
});

export const restartMessage = (input: {
  readonly ask: ResearchAsk;
  readonly title: string;
  readonly text: string;
  readonly question: string;
  readonly notes: ReadonlyArray<string>;
}): InputItem => ({
  type: "message",
  role: "user",
  content: [
    "Research again, with what I want now.",
    `What I want: ${ASKS[input.ask]}.`,
    `Title now: ${input.title === "" ? "(none yet)" : `"${input.title}"`}`,
    input.text === "" ? null : `Text now:\n"""\n${input.text}\n"""`,
    input.question === "" ? null : `My question: ${input.question}`,
    input.notes.length === 0
      ? null
      : `The Notes to connect: ${input.notes.map((note) => `[[${note}]]`).join(" and ")}`,
  ]
    .filter((line) => line !== null)
    .join("\n\n"),
});

export const decisionsMessage = (decisions: ReadonlyArray<string>): InputItem => ({
  type: "message",
  role: "developer",
  content: `Since your last answer, the user decided on the pages you proposed:\n${decisions.map((line) => `- ${line}`).join("\n")}`,
});

export const webSearchOffMessage: InputItem = {
  type: "message",
  role: "developer",
  content:
    "Web search is not available for this ChatGPT account or model. Tell the user so in one sentence, and ask them for the web addresses of pages to read; read_web_page still works.",
};

export const pagesOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<FoundPage> =>
  entries.flatMap((entry) => (entry._tag === "FoundPages" ? entry.pages : []));

export const linksOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<ResearchLink> => {
  const seen = new Set<string>();
  return entries
    .flatMap((entry) => (entry._tag === "ResearchLinks" ? entry.links : []))
    .filter((link) => {
      const key = linkKey(link.note);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const setPage = (
  entries: ReadonlyArray<SessionEntry>,
  id: string,
  change: Partial<FoundPage>,
): ReadonlyArray<SessionEntry> =>
  entries.map((entry) =>
    entry._tag === "FoundPages" && entry.pages.some((page) => page.id === id)
      ? {
          ...entry,
          pages: entry.pages.map((page) => (page.id === id ? { ...page, ...change } : page)),
        }
      : entry,
  );

export const pageLabel = (page: Pick<FoundPage, "id" | "title">) =>
  `page ${page.id.slice(1)} ("${page.title}")`;

export const checkQuotes = (
  markdown: string,
  quotes: ReadonlyArray<string>,
): { readonly found: ReadonlyArray<FoundQuote>; readonly missing: number } => {
  const article = parseArticle(markdown);
  const found: Array<FoundQuote> = [];
  let missing = 0;
  for (const quote of quotes.slice(0, MAX_QUOTES)) {
    const match = findInArticle(article, quote);
    if (match === null) missing++;
    else if (!found.some((other) => other.text === match.text)) {
      found.push({ text: match.text.replace(/\s+/g, " "), paragraph: match.n });
    }
  }
  return { found, missing };
};

const NullableString = Schema.NullOr(Schema.String);

const ReadPageArguments = Schema.Struct({ url: Schema.String });
const ProposeArguments = Schema.Struct({
  pages: Schema.Array(
    Schema.Struct({
      url: Schema.String,
      stance: Schema.Literals(["supports", "pulls-against", "context"]),
      kind: Schema.Literals(["paper", "web", "press"]),
      why: Schema.String,
      author: NullableString,
      quotes: Schema.Array(Schema.String),
    }),
  ),
});
const LinksArguments = Schema.Struct({
  links: Schema.Array(Schema.Struct({ note: Schema.String, why: Schema.String })),
});
const decodeReadPage = Schema.decodeUnknownOption(ReadPageArguments);
const decodePropose = Schema.decodeUnknownOption(ProposeArguments);
const decodeLinks = Schema.decodeUnknownOption(LinksArguments);

export type ProposedPage = Omit<FoundPage, "id" | "state">;

export interface Context {
  readonly graph: Graph.Graph["Service"];
  readonly webPages: WebPages.WebPages["Service"];
  readonly sources: Effect.Effect<ReadonlyArray<Source>>;
  readonly pages: Effect.Effect<ReadonlyArray<FoundPage>>;
  readonly propose: (pages: ReadonlyArray<ProposedPage>) => Effect.Effect<ReadonlyArray<string>>;
  readonly proposeLinks: (links: ReadonlyArray<ResearchLink>) => Effect.Effect<void>;
}

const UNREADABLE: Record<WebPages.UnreadableReason, string> = {
  address: "Glose does not read this address (not a public http or https page).",
  blocked: "The site refused to give the page (a paywall or a sign-in).",
  "not-found": "The page does not exist.",
  "not-text": "The page is not text Glose can read, such as a PDF or an image.",
  "too-large": "The page is too large to read.",
  "no-text": "Glose found no main text on the page.",
  failed: "The page could not be read.",
};

const sameUrl = (a: string, b: string) => webUrl(a)?.href === webUrl(b)?.href;

export const tools = ({
  graph,
  webPages,
  sources,
  pages,
  propose,
  proposeLinks,
}: Context): AgentTool[] => [
  searchGraphTool(graph),
  readNoteTool(graph),
  {
    name: "read_web_page",
    entry: "read-web-page",
    description:
      "Read a web page's main text, as Glose stores it if the user keeps the page: every paragraph after its number (¶ 8). Quote only from this text.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The page's full http or https address." },
      },
      required: ["url"],
      additionalProperties: false,
    },
    detail: (args) => Option.getOrUndefined(decodeReadPage(args))?.url.trim(),
    run: (args) =>
      Option.match(decodeReadPage(args), {
        onNone: () => Effect.succeed({ error: "Give the page's address." }),
        onSome: ({ url }) =>
          webPages.read(url).pipe(
            Effect.map((page) => {
              const text = articleForAi(parseArticle(page.markdown));
              return {
                url: page.url,
                title: page.title,
                author: page.author,
                site: page.site,
                published: page.published,
                text: text.slice(0, MAX_PAGE_TEXT),
                ...(text.length > MAX_PAGE_TEXT
                  ? { cut: "Only the start of the page is shown." }
                  : {}),
              };
            }),
            Effect.catchTags({
              PageUnreadable: (error) => Effect.succeed({ error: UNREADABLE[error.reason] }),
            }),
          ),
      }),
  },
  {
    name: "propose_pages",
    entry: null,
    description: `Show web pages to the user, who keeps or drops each one. A kept page becomes a Source in their Graph when they save the Note. At most ${MAX_PAGES} per call; read each with read_web_page first.`,
    parameters: {
      type: "object",
      properties: {
        pages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: { type: "string", description: "The address you read with read_web_page." },
              stance: {
                type: "string",
                enum: ["supports", "pulls-against", "context"],
                description:
                  "Whether the page supports the Note's idea or claim, pulls against it, or gives context.",
              },
              kind: {
                type: "string",
                enum: ["paper", "web", "press"],
                description:
                  "paper: a research paper or its abstract. press: a newspaper or magazine piece. web: any other web page.",
              },
              why: { type: "string", description: "One sentence on why it matters for this Note." },
              author: {
                type: ["string", "null"],
                description: "The author's full name when the page names one person, else null.",
              },
              quotes: {
                type: "array",
                items: { type: "string" },
                description: `1 to ${MAX_QUOTES} exact quotes from the page's text, character for character.`,
              },
            },
            required: ["url", "stance", "kind", "why", "author", "quotes"],
            additionalProperties: false,
          },
        },
      },
      required: ["pages"],
      additionalProperties: false,
    },
    run: Effect.fn("Research.proposePages")(function* (args: unknown) {
      const proposed = Option.getOrNull(decodePropose(args))?.pages;
      if (proposed === undefined || proposed.length === 0) {
        return { error: "Give at least one page." };
      }
      const known = yield* pages;
      const library = yield* sources;
      const shown: Array<ProposedPage> = [];
      const notes: Array<string> = [];
      for (const asked of proposed.slice(0, MAX_PAGES)) {
        if (known.some((page) => sameUrl(page.url, asked.url))) {
          notes.push(`${asked.url} was proposed before.`);
          continue;
        }
        const read = yield* webPages.read(asked.url).pipe(Effect.option);
        if (Option.isNone(read)) {
          notes.push(`${asked.url} could not be read, so it is not shown.`);
          continue;
        }
        const page = read.value;
        const { found, missing } = checkQuotes(page.markdown, asked.quotes);
        if (found.length === 0) {
          notes.push(
            `${page.url} is not shown: none of its quotes is word for word on the page. Read it again and copy the words exactly.`,
          );
          continue;
        }
        if (missing > 0) {
          notes.push(
            `${missing} quote(s) for ${page.url} are not on the page, so they are not shown.`,
          );
        }
        const source = library.find((other) => other.url !== null && sameUrl(other.url, page.url));
        shown.push({
          url: page.url,
          title: page.title,
          site: page.site ?? new URL(page.url).hostname,
          author: page.author ?? (asked.author?.trim() || null),
          published: page.published,
          articleType: asked.kind satisfies ArticleType,
          stance: asked.stance satisfies Stance,
          why: asked.why.trim(),
          quotes: found,
          source: source?.id ?? null,
        });
      }
      if (shown.length === 0) return { error: notes.join(" ") || "No page could be shown." };
      const ids = yield* propose(shown);
      return {
        shown: ids.map((id, index) => ({ page: Number(id.slice(1)), url: shown[index]?.url })),
        ...(notes.length === 0 ? {} : { notes }),
        ...(proposed.length > MAX_PAGES
          ? { skipped: `Only the first ${MAX_PAGES} were read.` }
          : {}),
        next: "The user now keeps or drops each page. You will hear what they decided.",
      };
    }),
  },
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
