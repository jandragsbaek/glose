import * as Schema from "effect/Schema";

/** What the running server reports about itself. */
export const ServerInfo = Schema.Struct({
  version: Schema.String,
});
export type ServerInfo = typeof ServerInfo.Type;
