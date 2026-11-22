import {
  type ArticlePassage,
  BookPassageNotFound,
  linkKey,
  type PassageRefused,
  type SourceNotFound,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as Semaphore from "effect/Semaphore";
import * as SubscriptionRef from "effect/SubscriptionRef";

import * as Passages from "../vault/Passages.ts";
import * as Sources from "../vault/Sources.ts";
import { addPoints, type Live } from "./liveSession.ts";
import type { VaultError } from "./sessionRecord.ts";
import type { SessionStore } from "./sessionStore.ts";

export const make = Effect.fn("Sessions.makePassagePoints")(function* ({
  open,
  save,
  deciding,
  passageOf,
}: {
  readonly open: (source: string) => Effect.Effect<Live, VaultError>;
  readonly save: SessionStore["save"];
  readonly deciding: Semaphore.Semaphore;
  readonly passageOf: (
    source: string,
    id: string,
  ) => Effect.Effect<ArticlePassage, SourceNotFound | PassageRefused | VaultError>;
}) {
  const sources = yield* Sources.Sources;
  const passages = yield* Passages.Passages;

  const addPassagePoint = Effect.fn("Sessions.addPassagePoint")(
    function* ({
      source: asked,
      passage: id,
      title,
    }: {
      readonly source: string;
      readonly passage: string;
      readonly title: string;
    }) {
      const source = yield* sources.get(asked);
      const passage = yield* passageOf(source.id, id);
      const session = yield* open(source.id);
      const [point] = yield* addPoints(session, [
        {
          title,
          origin: "passage",
          quote: passage.text,
          repeats: null,
          pullsAgainst: null,
          links: [],
          draft: null,
          state: "kept",
          note: null,
          page: `¶ ${passage.n}`,
        },
      ]);
      if (point !== undefined) {
        session.decisions.push(
          `Made point ${point.id.slice(1)} ("${point.title}") from a Passage they marked while reading, ¶ ${passage.n}: "${passage.text}". It is theirs to write.`,
        );
      }
      yield* save(session);
    },
    (effect) => deciding.withPermit(effect),
  );

  const addBookPassagesPoint = Effect.fn("Sessions.addBookPassagesPoint")(
    function* ({
      source: asked,
      passages: ids,
      title,
    }: {
      readonly source: string;
      readonly passages: ReadonlyArray<string>;
      readonly title: string;
    }) {
      const source = yield* sources.get(asked);
      const cited = yield* Effect.forEach(ids, (id) =>
        Effect.flatMap(passages.get(id), (passage) =>
          linkKey(passage.source) === linkKey(source.id)
            ? Effect.succeed(passage)
            : Effect.fail(new BookPassageNotFound({ id })),
        ),
      );
      const session = yield* open(source.id);
      const [point] = yield* addPoints(session, [
        {
          title,
          origin: "passage",
          quote: null,
          repeats: null,
          pullsAgainst: null,
          links: [],
          draft: null,
          state: "kept",
          note: null,
          page: cited.length === 1 ? (cited[0]?.page ?? null) : null,
          passages: cited.map(({ id, page, words }) => ({ id, page, words })),
        },
      ]);
      if (point === undefined) return yield* Effect.die("The Point was not added.");
      session.decisions.push(
        `Made point ${point.id.slice(1)} ("${point.title}") from Passages they copied from their copy: ${cited
          .map(({ page, words }) => `${page === null ? "" : `p. ${page}: `}"${words}"`)
          .join(
            "; ",
          )}. It is theirs to write; a draft, if they ask for one, shows beside their own words.`,
      );
      yield* save(session);
      return { session: (yield* SubscriptionRef.get(session.view)).id, point: point.id };
    },
    (effect) => deciding.withPermit(effect),
  );

  return { addPassagePoint, addBookPassagesPoint };
});
