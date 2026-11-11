import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { CredentialsData } from "../chatgpt/Credentials.ts";

const encode = Schema.encodeEffect(Schema.fromJsonString(CredentialsData));

/** A computer that already signed in to ChatGPT: the credentials file as Glose writes it. */
export const writeCredentials = Effect.fn("testkit.writeCredentials")(function* (
  dirs: { readonly dataDir: string },
  data: CredentialsData,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fs.makeDirectory(dirs.dataDir, { recursive: true });
  yield* fs.writeFileString(path.join(dirs.dataDir, "chatgpt.json"), yield* encode(data));
});
