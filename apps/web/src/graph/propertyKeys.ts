import type { PropertyKind, PropertyValue } from "@glose/contracts";
import { Braces, Calendar, Hash, List, SquareCheck, TextAlignStart } from "lucide-react";

import type { GraphIndex } from "./graphIndex.ts";

export type Save = (key: string, value: PropertyValue | null) => Promise<boolean>;

export const ADDABLE = ["text", "list", "number", "checkbox", "date"] as const;
export type AddableKind = (typeof ADDABLE)[number];

const LIST_KEYS: ReadonlySet<string> = new Set(["tags", "aliases", "cssclasses"]);

export const KIND_ICONS = {
  text: TextAlignStart,
  list: List,
  number: Hash,
  checkbox: SquareCheck,
  date: Calendar,
  other: Braces,
} as const satisfies Record<PropertyKind, unknown>;

export interface VaultKey {
  readonly kind: PropertyKind;
  readonly items: ReadonlyArray<string>;
}

export const vaultKeys = (index: GraphIndex): ReadonlyMap<string, VaultKey> => {
  const kinds = new Map<string, Map<PropertyKind, number>>();
  const items = new Map<string, Set<string>>();
  for (const node of index.byId.values()) {
    for (const property of node.properties) {
      if (property.locked) continue;
      const counts = kinds.get(property.key) ?? new Map<PropertyKind, number>();
      counts.set(property.kind, (counts.get(property.kind) ?? 0) + 1);
      kinds.set(property.key, counts);
      if (Array.isArray(property.value)) {
        const seen = items.get(property.key) ?? new Set<string>();
        for (const item of property.value) seen.add(item);
        items.set(property.key, seen);
      }
    }
  }
  return new Map(
    [...kinds].map(([key, counts]) => {
      const [kind = "text"] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
      return [key, { kind, items: [...(items.get(key) ?? [])].sort() }];
    }),
  );
};

export const PERSON_KEYS: ReadonlyArray<string> = ["born", "died"];

export const kindFor = (key: string, vault: ReadonlyMap<string, VaultKey>): AddableKind => {
  const known = vault.get(key)?.kind;
  if (known !== undefined && known !== "other") return known;
  if (PERSON_KEYS.includes(key)) return "number";
  return LIST_KEYS.has(key) ? "list" : "text";
};

export const splitItems = (text: string): ReadonlyArray<string> => [
  ...new Set(
    text
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== ""),
  ),
];
