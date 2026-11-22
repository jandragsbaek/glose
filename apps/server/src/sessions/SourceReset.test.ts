import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { localDay } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import {
  afterTurn,
  answer,
  MODEL_LIST,
  MODELS,
  NOTE,
  RESPONSES,
  setUp,
  toolCall,
} from "../testkit/sessions.ts";
import { Passages } from "../vault/Passages.ts";
import * as Sources from "../vault/Sources.ts";
import { Sessions } from "./Sessions.ts";
import { SourceReset } from "./SourceReset.ts";

const askOnce = [
  toolCall("ask_question", {
    topic: "Labour",
    question: "What does labour leave behind?",
    again_of: null,
  }),
  answer("Over to you."),
] as const;

const WEIL = {
  familyName: "Weil",
  givenName: "Simone",
  title: "Gravity and Grace",
  firstPublished: 1947,
  edition: null,
  editionYear: null,
  publisher: null,
  translator: null,
};

it.layer(NodeServices.layer)("SourceReset", (it) => {
  it.effect(
    "starts a Source over on a new start, sets its Probe aside, and keeps its Free text and Notes",
    () =>
      Effect.gen(function* () {
        const { fake, layer, vaultFolder, sourceId } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST);
        fake.answer(RESPONSES, ...askOnce);
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const result = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          const reset = yield* SourceReset;
          const probe = yield* sessions.start({ kind: "probe", subject: sourceId });
          yield* afterTurn(probe.id);
          const before = yield* reset.footprint(sourceId);
          const source = yield* reset.startOver({ id: sourceId, start: "catch-up" });
          return {
            before,
            source,
            probeId: probe.id,
            day: localDay(probe.created),
            after: yield* sessions.find({ kind: "probe", subject: sourceId }),
          };
        }).pipe(Effect.provide(layer));

        assert.deepStrictEqual(result.before, {
          notes: [NOTE],
          writing: [],
          linkedFrom: [],
          passages: 0,
          probeQuestions: 1,
          extraction: false,
          setAside: 0,
        });
        assert.strictEqual(result.source.readingStart, "catch-up");
        assert.strictEqual(result.source.readingStep, "probe");
        assert.strictEqual(result.source.freeText, "Labour leaves nothing behind.");
        assert.isNull(result.after, "the page shows no Probe until a new one starts");
        const sessionsFolder = path.join(vaultFolder, ".glose", "sessions");
        assert.isFalse(yield* fs.exists(path.join(sessionsFolder, `${result.probeId}.json`)));
        assert.isTrue(
          yield* fs.exists(path.join(sessionsFolder, "set-aside", `${result.probeId}.json`)),
        );
        assert.isFalse(yield* fs.exists(path.join(vaultFolder, "Probes", `${sourceId}.md`)));
        assert.isTrue(
          yield* fs.exists(
            path.join(vaultFolder, "Probes", "Set aside", `${sourceId} ${result.day}.md`),
          ),
        );
        assert.isTrue(yield* fs.exists(path.join(vaultFolder, `${NOTE}.md`)));
      }),
  );

  it.effect(
    "deletes a Source with its Passages and Probe, so the same book added again starts clean, and withholds it while a Note rests on it",
    () =>
      Effect.gen(function* () {
        const { fake, layer, vaultFolder, sourceId } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST);
        fake.answer(RESPONSES, ...askOnce);
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const result = yield* Effect.gen(function* () {
          const sources = yield* Sources.Sources;
          const sessions = yield* Sessions;
          const reset = yield* SourceReset;
          const refused = yield* reset.remove(sourceId).pipe(Effect.flip);
          const weil = yield* sources.create(WEIL);
          const passage = yield* (yield* Passages).create({
            source: weil.id,
            page: "12",
            words: "Grace fills empty spaces.",
            yourWords: "",
          });
          const probe = yield* sessions.start({ kind: "probe", subject: weil.id });
          yield* afterTurn(probe.id);
          yield* reset.startOver({ id: weil.id, start: "probe" });
          const setAside = (yield* reset.footprint(weil.id)).setAside;
          yield* reset.remove(weil.id);
          const gone = yield* sources.get(weil.id).pipe(Effect.flip);
          const again = yield* sources.create(WEIL);
          return {
            refused,
            setAside,
            weil: weil.id,
            passage: passage.id,
            probeId: probe.id,
            gone: gone._tag,
            again: yield* sessions.find({ kind: "probe", subject: again.id }),
          };
        }).pipe(Effect.provide(layer));

        assert.strictEqual(result.refused._tag, "SourceInUse");
        assert.deepInclude(result.refused, { notes: [NOTE], writing: [] });
        assert.isTrue(yield* fs.exists(path.join(vaultFolder, `${sourceId}.md`)));
        assert.strictEqual(result.setAside, 1, "the sheet can name the Probe set aside earlier");
        assert.strictEqual(result.gone, "SourceNotFound");
        assert.isFalse(
          yield* fs.exists(path.join(vaultFolder, "Passages", `${result.passage}.md`)),
        );
        const sessionsFolder = path.join(vaultFolder, ".glose", "sessions");
        assert.isFalse(yield* fs.exists(path.join(sessionsFolder, `${result.probeId}.json`)));
        assert.isFalse(
          yield* fs.exists(path.join(sessionsFolder, "set-aside", `${result.probeId}.json`)),
        );
        assert.deepStrictEqual(
          yield* fs.readDirectory(path.join(vaultFolder, "Probes", "Set aside")),
          [],
        );
        assert.isNull(result.again, "the book added again has no old Probe");
      }),
  );
});
