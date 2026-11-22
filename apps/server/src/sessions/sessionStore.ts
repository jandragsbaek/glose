import {
  VaultFolderNotSet,
  linkKey,
  localDay,
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

export const SET_ASIDE_FOLDER = "set-aside";

export const SET_ASIDE_PROBES_FOLDER = "Set aside";

const asideProbeOf = (source: string, name: string): boolean => {
  if (!name.endsWith(".md")) return false;
  const rest = name.slice(0, -".md".length);
  return (
    linkKey(rest.slice(0, source.length)) === linkKey(source) &&
    /^ \d{4}-\d{2}-\d{2}(?: \d+)?$/.test(rest.slice(source.length))
  );
};

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const sources = yield* Sources.Sources;
  const saving = yield* Semaphore.make(1);

  const vault = settings.get.pipe(
    Effect.flatMap(({ settings: { vaultFolder } }) =>
      vaultFolder === null ? Effect.fail(new VaultFolderNotSet()) : Effect.succeed(vaultFolder),
    ),
  );
  const sessionsFolder = Effect.map(vault, (folder) => path.join(folder, GLOSE_DIR, "sessions"));
  const probesFolder = Effect.map(vault, (folder) => path.join(folder, ProbeRecord.PROBES_FOLDER));

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

  const readFolder = Effect.fn("Sessions.readFolder")(function* (folder: string) {
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

  const readRecords = Effect.flatMap(sessionsFolder, readFolder);

  const freeAsideName = Effect.fn("Sessions.freeAsideName")(function* (
    folder: string,
    source: string,
    day: string,
  ) {
    const taken = new Set(
      (yield* fs.exists(folder)) ? (yield* fs.readDirectory(folder)).map(linkKey) : [],
    );
    let name = `${source} ${day}.md`;
    for (let n = 2; taken.has(linkKey(name)); n++) name = `${source} ${day} ${n}.md`;
    return name;
  });

  const setAside = Effect.fn("Sessions.setAside")(
    function* (record: SessionRecord) {
      const folder = yield* sessionsFolder;
      const aside = path.join(folder, SET_ASIDE_FOLDER);
      yield* Effect.gen(function* () {
        yield* fs.makeDirectory(aside, { recursive: true });
        yield* fs.rename(fileOf(folder, record.id), fileOf(aside, record.id));
        if (record.kind !== "probe") return;
        const probes = yield* probesFolder;
        const kept = path.join(probes, `${record.subject}.md`);
        if (!(yield* fs.exists(kept))) return;
        const asideProbes = path.join(probes, SET_ASIDE_PROBES_FOLDER);
        yield* fs.makeDirectory(asideProbes, { recursive: true });
        const name = yield* freeAsideName(asideProbes, record.subject, localDay(record.created));
        yield* fs.rename(kept, path.join(asideProbes, name));
      }).pipe(Effect.mapError(storageError));
    },
    (effect) => saving.withPermit(effect),
  );

  const forget = Effect.fn("Sessions.forget")(
    function* (source: string, ids: ReadonlyArray<string>) {
      const folder = yield* sessionsFolder;
      const probes = yield* probesFolder;
      const asideProbes = path.join(probes, SET_ASIDE_PROBES_FOLDER);
      yield* Effect.gen(function* () {
        for (const id of ids) {
          yield* fs.remove(fileOf(folder, id), { force: true });
          yield* fs.remove(fileOf(path.join(folder, SET_ASIDE_FOLDER), id), { force: true });
        }
        yield* fs.remove(path.join(probes, `${source}.md`), { force: true });
        if (!(yield* fs.exists(asideProbes))) return;
        for (const name of yield* fs.readDirectory(asideProbes)) {
          if (asideProbeOf(source, name)) yield* fs.remove(path.join(asideProbes, name));
        }
      }).pipe(Effect.mapError(storageError));
    },
    (effect) => saving.withPermit(effect),
  );

  const readSetAside = Effect.flatMap(sessionsFolder, (folder) =>
    readFolder(path.join(folder, SET_ASIDE_FOLDER)),
  );

  const readRecord = Effect.fn("Sessions.readRecord")(function* (id: string) {
    const notFound = new SessionNotFound({ id });
    if (!isFileName(id)) return yield* notFound;
    const file = fileOf(yield* sessionsFolder, id);
    if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) return yield* notFound;
    return yield* fs
      .readFileString(file)
      .pipe(Effect.flatMap(decodeRecord), Effect.mapError(storageError));
  });

  return { save, readRecords, readRecord, readSetAside, setAside, forget };
});

export type SessionStore = Effect.Success<typeof make>;
