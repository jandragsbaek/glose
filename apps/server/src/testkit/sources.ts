import { type SourceDetails } from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import * as Sources from "../vault/Sources.ts";
import * as Settings from "../settings/Settings.ts";
import { layerServices, makeDirs } from "./services.ts";

export const ARENDT: SourceDetails = {
  familyName: "Arendt",
  givenName: "Hannah",
  title: "The Human Condition",
  firstPublished: 1958,
  edition: "2nd",
  editionYear: 1998,
  publisher: "University of Chicago Press",
  translator: null,
};

export const withVault = <A, E>(
  test: (vault: {
    readonly folder: string;
    readonly sources: Sources.Sources["Service"];
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const path = yield* Path.Path;
    const folder = path.join(dirs.homeDir, "Glose");
    return yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        vaultFolder: folder,
        action: "create",
      });
      return yield* test({ folder, sources: yield* Sources.Sources });
    }).pipe(Effect.provide(layerServices(dirs)));
  }).pipe(Effect.scoped);
