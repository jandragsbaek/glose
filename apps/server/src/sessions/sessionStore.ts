import {
  VaultFolderNotSet,
  publicEntries,
  type Session,
  SessionNotFound,
  isFileName,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Semaphore from "effect/Semaphore";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { GLOSE_DIR } from "../vault/VaultFolder.ts";
import * as Sources from "../vault/Sources.ts";
import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import type { Live } from "./liveSession.ts";
import * as ProbeRecord from "./probeRecord.ts";
import { decodeRecord, encodeRecord, type SessionRecord, storageError } from "./sessionRecord.ts";

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const sources = yield* Sources.Sources;
  const saving = yield* Semaphore.make(1);

  const sessionsFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { vaultFolder } }) =>
      vaultFolder === null
        ? Effect.fail(new VaultFolderNotSet())
        : Effect.succeed(path.join(vaultFolder, GLOSE_DIR, "sessions")),
    ),
  );

  const fileOf = (folder: string, id: string) => path.join(folder, `${id}.json`);

  const writeProbeRecord = Effect.fn("Sessions.writeProbeRecord")(
    function* (view: Session) {
      const { vaultFolder, language } = (yield* settings.get).settings;
      if (vaultFolder === null) return;
      const source = yield* sources.get(view.subject);
      const folder = path.join(vaultFolder, ProbeRecord.PROBES_FOLDER);
      yield* fs.makeDirectory(folder, { recursive: true });
      yield* writeFileAtomic(
        fs,
        path.join(folder, `${source.id}.md`),
        ProbeRecord.renderRecord({
          source,
          entries: publicEntries(view.entries),
          created: view.created,
          language: language ?? "en",
        }),
      );
    },
    Effect.catch((error) => Effect.logWarning("The Probe record was not written", error)),
  );

  const save = Effect.fn("Sessions.save")(
    function* (session: Live) {
      const view = yield* SubscriptionRef.get(session.view);
      const folder = yield* sessionsFolder;
      const record: SessionRecord = {
        version: 2,
        id: view.id,
        kind: view.kind,
        subject: view.subject,
        model: view.model,
        created: view.created,
        entries: view.entries,
        items: session.items,
        decisions: session.decisions,
      };
      yield* fs.makeDirectory(folder, { recursive: true }).pipe(Effect.mapError(storageError));
      yield* encodeRecord(record).pipe(
        Effect.flatMap((json) => writeFileAtomic(fs, fileOf(folder, view.id), json)),
        Effect.mapError(storageError),
      );
      if (view.kind === "probe") yield* writeProbeRecord(view);
    },
    (effect) => saving.withPermit(effect),
  );

  const readRecords = Effect.gen(function* () {
    const folder = yield* sessionsFolder;
    if (!(yield* fs.exists(folder).pipe(Effect.mapError(storageError)))) return [];
    const names = yield* fs.readDirectory(folder).pipe(Effect.mapError(storageError));
    const records = yield* Effect.forEach(
      names.filter((name) => name.endsWith(".json")),
      (name) =>
        fs
          .readFileString(path.join(folder, name))
          .pipe(Effect.flatMap(decodeRecord), Effect.option),
      { concurrency: 8 },
    );
    return records.flatMap((record) => Option.toArray(record));
  });

  const readRecord = Effect.fn("Sessions.readRecord")(function* (id: string) {
    const notFound = new SessionNotFound({ id });
    if (!isFileName(id)) return yield* notFound;
    const file = fileOf(yield* sessionsFolder, id);
    if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) return yield* notFound;
    return yield* fs
      .readFileString(file)
      .pipe(Effect.flatMap(decodeRecord), Effect.mapError(storageError));
  });

  return { save, readRecords, readRecord };
});

export type SessionStore = Effect.Success<typeof make>;
