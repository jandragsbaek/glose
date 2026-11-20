import {
  type FoundPage,
  type ImportText,
  linkKey,
  pageAuthorship,
  parseArticle,
  type Source,
  PageRefused,
  ProposalNotOpen,
  type NoteQuote,
  type ResearchAsk,
  type SessionBusy,
  type SessionEntry,
  SessionNotFound,
  StorageError,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import type * as Semaphore from "effect/Semaphore";
import * as SubscriptionRef from "effect/SubscriptionRef";

import * as Graph from "../vault/Graph.ts";
import * as Notes from "../vault/Notes.ts";
import * as Sources from "../vault/Sources.ts";
import * as WebPages from "../research/WebPages.ts";
import { webUrl } from "../research/WebPages.ts";
import { findWholeQuote } from "../research/wholeQuote.ts";
import * as Settings from "../settings/Settings.ts";
import type { InputItem } from "./agent.ts";
import { type Live, type Load, patch } from "./liveSession.ts";
import { kickoff, pageLabel, pagesOf, restartMessage, setPage } from "./research.ts";
import type { VaultError } from "./sessionRecord.ts";
import type { SessionStore } from "./sessionStore.ts";

export const linkSafe = (text: string): string =>
  text
    .replace(/[<>:"/\\?*\u0000-\u001F]/g, " ")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\|/g, "-")
    .replace(/[#^]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.md$/i, "")
    .trim();

const dateOnly = (text: string | null): string | null => {
  const value = text?.trim() ?? "";
  if (value === "") return null;
  const iso = /^(\d{4}-\d{2}-\d{2})T/.exec(value);
  return iso?.[1] ?? value.slice(0, 40);
};

export const sourceOfPage = (page: FoundPage, markdown: string, today: string): ImportText => {
  const { familyName, givenName, firstPublished, site } = pageAuthorship(page);
  return {
    familyName: linkSafe(familyName).slice(0, 40).trim() || "Web",
    givenName,
    title: linkSafe(page.title).trim() || linkSafe(site),
    firstPublished,
    edition: null,
    editionYear: null,
    publisher: null,
    translator: null,
    kind: "article",
    articleType: page.articleType,
    otherAuthors: [],
    container: site,
    published: dateOnly(page.published),
    volume: null,
    issue: null,
    pages: null,
    url: page.url,
    doi: null,
    accessed: today,
    part: null,
    markdown,
  };
};

const quoteKey = (quote: { readonly text: string; readonly paragraph: number }) =>
  `${quote.paragraph}\u0000${quote.text}`;

const literal = (text: string) => text.replace(/[\\[\]]/g, (mark) => `\\${mark}`);

export const footnoteOf = (text: string, source: string, paragraph: number): string =>
  `“${literal(text)}” [[${source}]], ¶ ${paragraph}`;

export const make = Effect.fn("Sessions.makePageDecisions")(function* ({
  load,
  save,
  deciding,
  beginTurn,
  open,
}: {
  readonly load: Load;
  readonly save: SessionStore["save"];
  readonly deciding: Semaphore.Semaphore;
  readonly beginTurn: BeginTurn;
  readonly open: (subject: string) => Effect.Effect<Live, VaultError>;
}) {
  const settings = yield* Settings.Settings;
  const notes = yield* Notes.Notes;
  const sources = yield* Sources.Sources;
  const graph = yield* Graph.Graph;
  const webPages = yield* WebPages.WebPages;

  const decide = Effect.fn("Sessions.decidePage")(function* (
    id: string,
    pageId: string,
    state: "kept" | "dropped",
    states: ReadonlyArray<FoundPage["state"]>,
  ) {
    const session = yield* load(id);
    const view = yield* SubscriptionRef.get(session.view);
    const page = pagesOf(view.entries).find((other) => other.id === pageId);
    if (page === undefined || !states.includes(page.state)) {
      return yield* new ProposalNotOpen({ id, proposal: pageId });
    }
    if (page.state === state) return;
    session.decisions.push(
      state === "kept" ? `Kept ${pageLabel(page)}.` : `Dropped ${pageLabel(page)}.`,
    );
    yield* patch(session, (now) => ({ ...now, entries: setPage(now.entries, pageId, { state }) }));
    yield* save(session);
  });

  const keptPages = Effect.fn("Sessions.keptPages")(function* (id: string | null) {
    if (id === null) return { session: null, kept: [] as ReadonlyArray<FoundPage> };
    const session: Live = yield* load(id);
    const view = yield* SubscriptionRef.get(session.view);
    if (view.kind !== "note-research") return yield* new SessionNotFound({ id });
    return { session, kept: pagesOf(view.entries).filter((page) => page.state === "kept") };
  });

  const prepare = Effect.fn("Sessions.prepareKeptPage")(function* (
    page: FoundPage,
    quotes: ReadonlyArray<NoteQuote>,
    today: string,
    library: ReadonlyArray<Source>,
  ) {
    const known =
      library.find((source) => source.id === page.source) ??
      library.find(
        (source) => source.url !== null && webUrl(source.url)?.href === webUrl(page.url)?.href,
      );
    const markdown =
      known !== undefined && quotes.length === 0
        ? ""
        : known === undefined
          ? (yield* webPages.read(page.url).pipe(
              Effect.catchTags({
                PageUnreadable: () =>
                  Effect.fail(new PageRefused({ page: page.id, reason: "unreadable" })),
              }),
            )).markdown
          : yield* sources.articleText(known.id).pipe(
              Effect.catchTags({
                SourceNotFound: () =>
                  Effect.fail(new PageRefused({ page: page.id, reason: "quote-gone" })),
                PassageRefused: () =>
                  Effect.fail(new PageRefused({ page: page.id, reason: "quote-gone" })),
              }),
            );
    const article = parseArticle(markdown);
    const located = new Map<string, number>();
    for (const quote of quotes) {
      const match = findWholeQuote(article, quote.text);
      if (match === null) return yield* new PageRefused({ page: page.id, reason: "quote-gone" });
      located.set(quoteKey(quote), match.n);
    }
    return {
      located,
      known: known?.id ?? null,
      details: sourceOfPage(page, markdown, today),
    };
  });

  const planNames = Effect.fn("Sessions.planSourceNames")(function* (
    noteName: string,
    pages: ReadonlyArray<ImportText>,
  ) {
    const taken = new Set([noteName.toLocaleLowerCase("und")]);
    const planned: Array<ImportText> = [];
    for (const details of pages) {
      const site = linkSafe(details.container ?? "")
        .slice(0, 30)
        .trim();
      const prefix = `${details.familyName} ${details.firstPublished ?? ""} `.length;
      const short = details.title.slice(0, Math.max(10, 110 - prefix - site.length - 6)).trim();
      const titles = [
        details.title,
        ...Array.from({ length: 9 }, (_, n) => `${short} (${site})${n === 0 ? "" : ` ${n + 1}`}`),
      ];
      let chosen: ImportText | null = null;
      for (const title of titles) {
        const id = yield* sources.freeId({ ...details, title });
        if (id === null || taken.has(id.toLocaleLowerCase("und"))) continue;
        taken.add(id.toLocaleLowerCase("und"));
        chosen = { ...details, title };
        break;
      }
      if (chosen === null) {
        return yield* new StorageError({
          detail: `No free file name for the Source ${details.title}.`,
        });
      }
      planned.push(chosen);
    }
    return planned;
  });

  const createNote = Effect.fn("Sessions.createNote")(
    function* (input: {
      readonly title: string;
      readonly text: string;
      readonly session: string | null;
      readonly restsOn: string | null;
      readonly quotes: ReadonlyArray<NoteQuote>;
      readonly links: ReadonlyArray<string>;
    }) {
      yield* notes.checkName(input.title);
      const { session, kept } = yield* keptPages(input.session);
      const byId = new Map(kept.map((page) => [page.id, page]));
      const used = [
        ...new Set([
          ...(input.restsOn === null ? [] : [input.restsOn]),
          ...input.quotes.map((quote) => quote.page),
        ]),
      ];
      for (const id of used) {
        if (!byId.has(id)) return yield* new PageRefused({ page: id, reason: "not-kept" });
      }
      for (const quote of input.quotes) {
        const page = byId.get(quote.page)!;
        if (!page.quotes.some((other) => quoteKey(other) === quoteKey(quote))) {
          return yield* new PageRefused({ page: quote.page, reason: "quote-gone" });
        }
      }

      const today = new Date(yield* Clock.currentTimeMillis).toISOString().slice(0, 10);
      const library = yield* sources.list;
      const prepared = new Map<string, Effect.Success<ReturnType<typeof prepare>>>();
      for (const id of used) {
        const quotes = input.quotes.filter((quote) => quote.page === id);
        prepared.set(id, yield* prepare(byId.get(id)!, quotes, today, library));
      }
      const noteName = yield* notes.checkName(input.title);
      const fresh = [...prepared].filter(([, page]) => page.known === null);
      const planned = yield* planNames(
        noteName,
        fresh.map(([, page]) => page.details),
      );
      const sourceIds = new Map<string, string>();
      for (const [id, page] of prepared) if (page.known !== null) sourceIds.set(id, page.known);
      for (const [index, [id]] of fresh.entries()) {
        const source = yield* sources.importText(planned[index]!).pipe(
          Effect.catchTags({
            SourceNameTaken: (taken) =>
              Effect.fail(new StorageError({ detail: `A Source named ${taken.fileName} exists.` })),
          }),
        );
        sourceIds.set(id, source.id);
      }

      const view = yield* graph.read;
      const names = new Map(
        view.nodes
          .filter((node) => node.kind !== "source")
          .map((node) => [linkKey(node.id), node.id]),
      );
      const related = [...new Set(input.links.flatMap((link) => names.get(linkKey(link)) ?? []))];
      const { language } = (yield* settings.get).settings;
      const name = yield* notes.create({
        title: input.title,
        source: input.restsOn === null ? null : (sourceIds.get(input.restsOn) ?? null),
        page: null,
        text: input.text,
        draft: null,
        aiTitle: false,
        related,
        language: language ?? "en",
        footnotes: input.quotes.map((quote, index) => ({
          label: `q${index + 1}`,
          text: footnoteOf(
            quote.text,
            sourceIds.get(quote.page)!,
            prepared.get(quote.page)!.located.get(quoteKey(quote))!,
          ),
        })),
      });

      if (session !== null) {
        session.decisions.push(
          `Saved the Note [[${name}]] in their own words${
            sourceIds.size === 0
              ? ", with no Source"
              : `; the kept pages it uses are now the Sources ${[...sourceIds.values()].map((id) => `[[${id}]]`).join(", ")}`
          }.`,
        );
        yield* save(session).pipe(
          Effect.catch((error) => Effect.logWarning("The research Session was not saved", error)),
        );
      }
      return name;
    },
    (effect) => deciding.withPermit(effect),
  );

  const startResearch = Effect.fn("Sessions.startResearch")(function* (input: {
    readonly draft: string;
    readonly ask: ResearchAsk;
    readonly title: string;
    readonly text: string;
    readonly question: string;
    readonly notes: ReadonlyArray<string>;
  }) {
    const { language } = (yield* settings.get).settings;
    const session = yield* open(input.draft);
    const view = yield* SubscriptionRef.get(session.view);
    const first = !view.entries.some((entry) => entry._tag === "ResearchStart");
    yield* beginTurn(
      session,
      [
        {
          _tag: "ResearchStart",
          ask: input.ask,
          title: input.title,
          ...(input.text === "" ? {} : { text: input.text }),
          question: input.question,
          notes: input.notes,
        },
      ],
      [first ? kickoff(input, language ?? "en") : restartMessage(input)],
    );
    return yield* SubscriptionRef.get(session.view);
  });

  return {
    startResearch,
    keepPage: ({ id, page }: { readonly id: string; readonly page: string }) =>
      deciding.withPermit(decide(id, page, "kept", ["open", "dropped", "kept"])),
    dropPage: ({ id, page }: { readonly id: string; readonly page: string }) =>
      deciding.withPermit(decide(id, page, "dropped", ["open", "kept", "dropped"])),
    createNote,
  };
});

type BeginTurn = (
  session: Live,
  entries: ReadonlyArray<SessionEntry>,
  items: ReadonlyArray<InputItem>,
) => Effect.Effect<void, SessionBusy | VaultError>;

export type PageDecisions = Effect.Success<ReturnType<typeof make>>;
