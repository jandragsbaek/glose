import * as Schema from "effect/Schema";

export const ServerInfo = Schema.Struct({
  version: Schema.String,
});
export type ServerInfo = typeof ServerInfo.Type;
