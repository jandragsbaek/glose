import { linkKey, type Point, PointNotFound, type PointState } from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as Semaphore from "effect/Semaphore";
import * as SubscriptionRef from "effect/SubscriptionRef";

import * as Notes from "../vault/Notes.ts";
import * as Passages from "../vault/Passages.ts";
import { passageCite } from "../vault/passageFile.ts";
import * as Settings from "../settings/Settings.ts";
import { addPoints, type Live, type Load, patch } from "./liveSession.ts";
import { mapPoint, pointName, pointsOf } from "./sessionEntries.ts";
import type { SessionStore } from "./sessionStore.ts";

export interface PointInput {
  readonly id: string;
  readonly point: string;
}

export const make = Effect.fn("Sessions.makePointDecisions")(function* ({
  load,
  save,
  deciding,
}: {
  readonly load: Load;
  readonly save: SessionStore["save"];
  readonly deciding: Semaphore.Semaphore;
}) {
  const settings = yield* Settings.Settings;
  const notes = yield* Notes.Notes;
  const passages = yield* Passages.Passages;

  const findPoint = Effect.fn("Sessions.findPoint")(function* (
    session: Live,
    pointId: string,
    states: ReadonlyArray<PointState>,
  ) {
    const view = yield* SubscriptionRef.get(session.view);
    const point = pointsOf(view.entries).find((other) => other.id === pointId);
    if (point === undefined || !states.includes(point.state)) {
      return yield* new PointNotFound({ id: view.id, point: pointId });
    }
    return { point, view };
  });

  const decidePoint = Effect.fn("Sessions.decidePoint")(function* (
    session: Live,
    pointId: string,
    change: (point: Point) => Point,
    decision: string,
  ) {
    session.decisions.push(decision);
    yield* patch(session, (view) => ({
      ...view,
      entries: mapPoint(view.entries, pointId, change),
    }));
    yield* save(session);
  });

  const keepPoint = Effect.fn("Sessions.keepPoint")(
    function* ({ id, point: pointId, title }: PointInput & { readonly title: string }) {
      const session = yield* load(id);
      const { point } = yield* findPoint(session, pointId, ["open"]);
      yield* decidePoint(
        session,
        pointId,
        (now) => ({ ...now, title, state: "kept" }),
        title === point.title
          ? `Kept ${pointName(point)} to write as a Note.`
          : `Kept ${pointName(point)} to write as a Note, with the title changed to "${title}".`,
      );
    },
    (effect) => deciding.withPermit(effect),
  );

  const dropPoint = Effect.fn("Sessions.dropPoint")(
    function* ({ id, point: pointId }: PointInput) {
      const session = yield* load(id);
      const { point } = yield* findPoint(session, pointId, ["open", "kept"]);
      yield* decidePoint(
        session,
        pointId,
        (now) => ({ ...now, state: "dropped" }),
        `Dropped ${pointName(point)}.`,
      );
    },
    (effect) => deciding.withPermit(effect),
  );

  const restorePoint = Effect.fn("Sessions.restorePoint")(
    function* ({ id, point: pointId }: PointInput) {
      const session = yield* load(id);
      const { point } = yield* findPoint(session, pointId, ["dropped"]);
      yield* decidePoint(
        session,
        pointId,
        (now) => ({ ...now, state: "open" }),
        `Brought back ${pointName(point)}, to decide on again.`,
      );
    },
    (effect) => deciding.withPermit(effect),
  );

  const addPoint = Effect.fn("Sessions.addPoint")(
    function* ({ id, title }: { readonly id: string; readonly title: string }) {
      const session = yield* load(id);
      const [point] = yield* addPoints(session, [
        {
          title,
          origin: "user",
          quote: null,
          repeats: null,
          pullsAgainst: null,
          links: [],
          draft: null,
          state: "kept",
          note: null,
          page: null,
        },
      ]);
      if (point !== undefined) {
        session.decisions.push(`Added ${pointName(point)} in their own words, to write.`);
      }
      yield* save(session);
    },
    (effect) => deciding.withPermit(effect),
  );

  const writePoint = Effect.fn("Sessions.writePoint")(
    function* ({
      id,
      point: pointId,
      title,
      text,
      aiText,
      page,
      links,
    }: PointInput & {
      readonly title: string;
      readonly text: string;
      readonly aiText: boolean;
      readonly page: string | null;
      readonly links: ReadonlyArray<string>;
    }) {
      const session = yield* load(id);
      const { point, view } = yield* findPoint(session, pointId, ["kept"]);
      const { language } = (yield* settings.get).settings;
      const asked = new Set(links.map(linkKey));
      const related = point.links
        .filter((link) => asked.has(linkKey(link.note)))
        .map((link) => link.note);
      const draft = aiText && text !== "" ? text : null;
      const own = draft === null ? text : "";
      const cites = yield* Effect.forEach(point.passages ?? [], (cited) =>
        passages.get(cited.id).pipe(
          Effect.map((now) => ({ id: now.id, page: now.page, words: now.words })),
          Effect.orElseSucceed(() => cited),
        ),
      );
      const note = yield* notes.create({
        title,
        source: view.subject,
        page,
        text: own,
        draft,
        aiTitle: (point.origin !== "user" && point.origin !== "passage") || point.aiTitle === true,
        related,
        language: language ?? "en",
        footnotes: cites.map((cited, index) => ({
          label: `q${index + 1}`,
          text: passageCite(cited.id, cited.page, cited.words, language ?? "en"),
        })),
      });
      const added = new Set(related.map(linkKey));
      yield* decidePoint(
        session,
        pointId,
        (now) => ({
          ...now,
          title,
          state: "written",
          note,
          page,
          draft,
          links: now.links.map((link) => ({ ...link, added: added.has(linkKey(link.note)) })),
        }),
        [
          `Wrote ${pointName(point)} as the Note [[${note}]]${page === null ? "" : `, page ${page}`}.`,
          draft !== null
            ? draft === point.draft
              ? "It keeps your draft unchanged, marked as AI text."
              : `It keeps your draft, edited by them and marked as AI text: """${draft}"""`
            : own === ""
              ? "It has no text."
              : `In their own words: """${own}"""`,
          related.length === 0
            ? ""
            : `It links to ${related.map((name) => `[[${name}]]`).join(", ")}.`,
        ]
          .filter((line) => line !== "")
          .join(" "),
      );
      return note;
    },
    (effect) => deciding.withPermit(effect),
  );

  return { keepPoint, dropPoint, restorePoint, addPoint, writePoint };
});
