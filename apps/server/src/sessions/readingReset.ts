import { linkKey } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FiberMap from "effect/FiberMap";
import type * as Semaphore from "effect/Semaphore";

import type { Live } from "./liveSession.ts";
import type { SessionRecord } from "./sessionRecord.ts";
import type { SessionStore } from "./sessionStore.ts";

const readingOf = (records: ReadonlyArray<SessionRecord>, source: string) =>
  records.filter(
    (record) =>
      (record.kind === "probe" || record.kind === "extraction") &&
      linkKey(record.subject) === linkKey(source),
  );

export const make = ({
  live,
  turns,
  deciding,
  store,
}: {
  readonly live: Map<string, Live>;
  readonly turns: FiberMap.FiberMap<string>;
  readonly deciding: Semaphore.Semaphore;
  readonly store: SessionStore;
}) => {
  const letGo = Effect.fn("Sessions.letGo")(function* (id: string) {
    yield* FiberMap.remove(turns, id);
    live.delete(id);
  });

  return {
    setAsideCount: (source: string) =>
      Effect.map(store.readSetAside, (records) => readingOf(records, source).length),

    setAsideSource: Effect.fn("Sessions.setAsideSource")(
      function* (source: string) {
        for (const record of readingOf(yield* store.readRecords, source)) {
          yield* letGo(record.id);
          yield* store.setAside(record);
        }
      },
      (effect) => deciding.withPermit(effect),
    ),

    forgetSource: Effect.fn("Sessions.forgetSource")(
      function* (source: string) {
        const records = readingOf(
          [...(yield* store.readRecords), ...(yield* store.readSetAside)],
          source,
        );
        for (const record of records) yield* letGo(record.id);
        yield* store.forget(
          source,
          records.map((record) => record.id),
        );
      },
      (effect) => deciding.withPermit(effect),
    ),
  };
};
