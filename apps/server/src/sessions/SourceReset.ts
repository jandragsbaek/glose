import {
  findReferences,
  linkKey,
  type Source,
  type SourceFootprint,
  SourceInUse,
  type SourceNotFound,
  type StartSourceOver,
} from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as Graph from "../vault/Graph.ts";
import * as Passages from "../vault/Passages.ts";
import * as Sources from "../vault/Sources.ts";
import * as Writing from "../writing/Writing.ts";
import type { VaultError } from "./sessionRecord.ts";
import * as Sessions from "./Sessions.ts";

export class SourceReset extends Context.Service<
  SourceReset,
  {
    readonly footprint: (id: string) => Effect.Effect<SourceFootprint, SourceNotFound | VaultError>;
    readonly startOver: (
      input: StartSourceOver,
    ) => Effect.Effect<Source, SourceNotFound | VaultError>;
    readonly remove: (id: string) => Effect.Effect<void, SourceNotFound | SourceInUse | VaultError>;
  }
>()("glose/sessions/SourceReset") {}

const unique = (names: ReadonlyArray<string>): ReadonlyArray<string> => {
  const seen = new Map<string, string>();
  for (const name of names) if (!seen.has(linkKey(name))) seen.set(linkKey(name), name);
  return [...seen.values()];
};

export const make = Effect.gen(function* () {
  const sources = yield* Sources.Sources;
  const passages = yield* Passages.Passages;
  const sessions = yield* Sessions.Sessions;
  const graph = yield* Graph.Graph;
  const writing = yield* Writing.Writing;

  const footprint = Effect.fn("SourceReset.footprint")(function* (id: string) {
    const source = yield* sources.get(id);
    const key = linkKey(source.id);
    const view = yield* graph.read;
    const kept = yield* passages.list(source.id);
    const notes = unique([
      ...view.nodes
        .filter((node) => node.kind === "note" && node.sourceId !== null)
        .filter((node) => linkKey(node.sourceId ?? "") === key)
        .map((node) => node.id),
      ...kept.flatMap((passage) => passage.usedBy),
    ]);
    const resting = new Set(notes.map(linkKey));
    const linkedFrom = unique(
      view.links
        .filter((link) => linkKey(link.to) === key && linkKey(link.from) !== key)
        .map((link) => link.from)
        .filter((from) => !resting.has(linkKey(from))),
    );
    const projects = (yield* writing.list).filter((project) =>
      findReferences(project.body).some((reference) => linkKey(reference.target) === key),
    );
    const probe = yield* sessions.find({ kind: "probe", subject: source.id });
    const extraction = yield* sessions.find({ kind: "extraction", subject: source.id });
    return {
      notes,
      writing: projects.map((project) => project.title),
      linkedFrom,
      passages: kept.length,
      probeQuestions:
        probe === null
          ? null
          : probe.entries.filter((entry) => entry._tag === "ProbeQuestion").length,
      extraction: extraction !== null,
      setAside: yield* sessions.setAsideCount(source.id),
    } satisfies SourceFootprint;
  });

  return SourceReset.of({
    footprint,

    startOver: Effect.fn("SourceReset.startOver")(function* ({ id, start }) {
      const source = yield* sources.get(id);
      yield* sessions.setAsideSource(source.id);
      return yield* sources.startOver({ id: source.id, start });
    }),

    remove: Effect.fn("SourceReset.remove")(function* (id) {
      const found = yield* footprint(id);
      const source = yield* sources.get(id);
      if (found.notes.length > 0 || found.writing.length > 0) {
        return yield* new SourceInUse({
          id: source.id,
          notes: found.notes,
          writing: found.writing,
        });
      }
      for (const passage of yield* passages.list(source.id)) {
        yield* passages.remove(passage.id).pipe(
          Effect.catchTags({
            BookPassageNotFound: () => Effect.void,
            BookPassageInUse: ({ notes }) =>
              Effect.fail(new SourceInUse({ id: source.id, notes, writing: [] })),
          }),
        );
      }
      yield* sessions.forgetSource(source.id);
      yield* sources.remove(source.id);
    }),
  });
});

export const layer = Layer.effect(SourceReset, make);
