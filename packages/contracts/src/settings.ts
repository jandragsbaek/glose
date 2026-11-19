import * as Schema from "effect/Schema";

import { RecallSettingsFile } from "./recall.ts";

export const Language = Schema.Literals(["en", "da"]);
export type Language = typeof Language.Type;

export const Settings = Schema.Struct({
  language: Schema.NullOr(Language),
  vaultFolder: Schema.NullOr(Schema.String),
  siteFolder: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type Settings = typeof Settings.Type;

export const SettingsView = Schema.Struct({
  settings: Settings,
  suggestedVaultFolder: Schema.String,
});
export type SettingsView = typeof SettingsView.Type;

export const VaultSettings = Schema.Struct({
  recall: Schema.optionalKey(RecallSettingsFile),
});
export type VaultSettings = typeof VaultSettings.Type;

export const VaultFolderAction = Schema.Literals(["create", "open", "clone"]);
export type VaultFolderAction = typeof VaultFolderAction.Type;

export const CompleteSetup = Schema.Struct({
  language: Language,
  vaultFolder: Schema.String,
  action: VaultFolderAction,
  remote: Schema.optionalKey(Schema.String),
});
export type CompleteSetup = typeof CompleteSetup.Type;

export const CheckRemote = Schema.Struct({
  url: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
});
export type CheckRemote = typeof CheckRemote.Type;

export const VaultRemoteUnavailableReason = Schema.Literals(["no-git", "unreachable"]);
export type VaultRemoteUnavailableReason = typeof VaultRemoteUnavailableReason.Type;

export class VaultRemoteUnavailable extends Schema.TaggedError<VaultRemoteUnavailable>()(
  "VaultRemoteUnavailable",
  { reason: VaultRemoteUnavailableReason },
) {}

export class VaultFolderUnavailable extends Schema.TaggedError<VaultFolderUnavailable>()(
  "VaultFolderUnavailable",
  {
    path: Schema.String,
    reason: Schema.Literals([
      "not-absolute",
      "not-a-folder",
      "not-found",
      "not-empty",
      "not-writable",
    ]),
  },
) {}

export class VaultFolderNotSet extends Schema.TaggedError<VaultFolderNotSet>()(
  "VaultFolderNotSet",
  {},
) {}

export class StorageError extends Schema.TaggedError<StorageError>()("StorageError", {
  detail: Schema.String,
}) {}
