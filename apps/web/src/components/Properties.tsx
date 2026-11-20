import { useAtomSet } from "@effect/atom-react";
import {
  type GraphNode,
  GROWTHS,
  growthOf,
  linkKey,
  type NoteProperty,
  type PropertyKind,
  type PropertyValue,
  parseWikilink,
} from "@glose/contracts";
import * as Exit from "effect/Exit";
import { ChevronDown, CircleAlert, Link2, Lock, Sprout, X } from "lucide-react";
import { type KeyboardEvent, useId, useRef, useState } from "react";

import type { GraphIndex } from "../graph/graphIndex.ts";
import { KIND_ICONS, type Save, splitItems, vaultKeys } from "../graph/propertyKeys.ts";
import { useT } from "../i18n/I18n.tsx";
import { KEYS, setPropertyAtom } from "../state/vault.ts";
import { AddProperty } from "./AddProperty.tsx";
import { NodeLink } from "./GraphLists.tsx";

let saves: Promise<unknown> = Promise.resolve();

export function Properties({
  node,
  index,
  onShow,
}: {
  readonly node: GraphNode;
  readonly index: GraphIndex;
  readonly onShow: (id: string) => void;
}) {
  const t = useT();
  const p = t.graph.props;
  const set = useAtomSet(setPropertyAtom, { mode: "promiseExit" });
  const [open, setOpen] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const vault = vaultKeys(index);

  const save: Save = (key, value) => {
    setFailed(null);
    const saved = saves.then(async () => {
      const exit = await set({
        payload: { id: node.id, key, value },
        reactivityKeys: KEYS.sources,
      });
      if (Exit.isFailure(exit)) setFailed(key);
      return Exit.isSuccess(exit);
    });
    saves = saved;
    return saved;
  };

  return (
    <details
      className="properties"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="properties__summary">
        <ChevronDown className="properties__chevron" aria-hidden="true" />
        {t.graph.properties}
      </summary>
      {node.properties.length === 0 ? (
        <p className="properties__empty">{t.graph.noProperties}</p>
      ) : (
        <dl className="properties__list">
          {node.properties.map((property) => (
            <PropertyRow
              key={property.key}
              node={node}
              property={property}
              items={vault.get(property.key)?.items ?? []}
              index={index}
              onShow={onShow}
              onSave={save}
            />
          ))}
        </dl>
      )}
      <AddProperty node={node} vault={vault} onSave={save} />
      {failed === null ? null : (
        <p className="field__error properties__error" role="alert">
          <CircleAlert className="field__error-icon" aria-hidden="true" />
          {p.failed(failed)}
        </p>
      )}
    </details>
  );
}

function PropertyRow({
  node,
  property,
  items,
  index,
  onShow,
  onSave,
}: {
  readonly node: GraphNode;
  readonly property: NoteProperty;
  readonly items: ReadonlyArray<string>;
  readonly index: GraphIndex;
  readonly onShow: (id: string) => void;
  readonly onSave: Save;
}) {
  const p = useT().graph.props;
  const id = useId();
  const { key, kind, locked } = property;
  const growth = node.kind === "note" && key === "growth" && !locked;
  const link = locked ? linkedNode(property.value, index) : undefined;
  const editable = !locked && kind !== "other";
  const Icon = locked ? (link === undefined ? Lock : Link2) : growth ? Sprout : KIND_ICONS[kind];

  return (
    <div className="properties__row" data-locked={locked || undefined}>
      <dt className="properties__key">
        <Icon className="properties__icon" aria-hidden="true" />
        {editable ? (
          <label htmlFor={id} className="properties__name">
            {key}
          </label>
        ) : (
          <span className="properties__name">{key}</span>
        )}
      </dt>
      <dd className="properties__value">
        {locked ? (
          <>
            {link === undefined ? (
              <span className="properties__text">{asText(property.value)}</span>
            ) : (
              <NodeLink id={link.id} className="properties__link" onShow={onShow}>
                {link.title}
              </NodeLink>
            )}
            <span className="sr-only">{p.kept}</span>
          </>
        ) : kind === "other" ? (
          <span className="properties__text properties__text--other" title={p.elsewhere}>
            {asText(property.value)}
            <span className="sr-only">{p.elsewhere}</span>
          </span>
        ) : growth ? (
          <GrowthValue id={id} value={property.value} onSave={(value) => onSave(key, value)} />
        ) : kind === "list" ? (
          <ListValue
            id={id}
            name={key}
            items={Array.isArray(property.value) ? property.value : []}
            suggestions={items}
            onSave={(value) => onSave(key, value)}
          />
        ) : kind === "checkbox" ? (
          <input
            id={id}
            type="checkbox"
            className="properties__check"
            checked={property.value === true}
            onChange={(event) => onSave(key, event.currentTarget.checked)}
          />
        ) : (
          <FieldValue
            id={id}
            kind={kind}
            value={asText(property.value)}
            onSave={(value) => onSave(key, value)}
          />
        )}
        {editable ? (
          <button
            type="button"
            className="properties__remove"
            aria-label={p.remove(key)}
            title={p.remove(key)}
            onClick={() => onSave(key, null)}
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </dd>
    </div>
  );
}

const sameItems = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

const asText = (value: PropertyValue): string =>
  Array.isArray(value) ? value.join(", ") : String(value);

const linkedNode = (value: PropertyValue, index: GraphIndex): GraphNode | undefined => {
  if (typeof value !== "string") return undefined;
  const match = /^\s*\[\[([^[\]\n]+)\]\]\s*$/.exec(value);
  if (match === null) return undefined;
  return index.byKey.get(linkKey(parseWikilink(match[1] ?? "").target));
};

function FieldValue({
  id,
  kind,
  value,
  onSave,
}: {
  readonly id: string;
  readonly kind: PropertyKind;
  readonly value: string;
  readonly onSave: (value: PropertyValue) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  const cancelled = useRef(false);
  if (shown !== value) {
    setShown(value);
    setDraft(value);
  }

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (draft === value) return;
    if (kind === "number") {
      const number = Number(draft);
      if (draft.trim() === "" || !Number.isFinite(number)) return setDraft(value);
      return onSave(number);
    }
    if (kind === "date" && draft === "") return setDraft(value);
    onSave(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelled.current = true;
      setDraft(value);
      event.currentTarget.blur();
    }
  };

  const shared = {
    id,
    className: "properties__input",
    value: draft,
    onBlur: commit,
    onKeyDown,
  };
  return kind === "text" ? (
    <textarea {...shared} rows={1} onChange={(event) => setDraft(event.currentTarget.value)} />
  ) : (
    <input
      {...shared}
      type={kind === "number" ? "number" : "date"}
      onChange={(event) => setDraft(event.currentTarget.value)}
    />
  );
}

function GrowthValue({
  id,
  value,
  onSave,
}: {
  readonly id: string;
  readonly value: PropertyValue;
  readonly onSave: (value: PropertyValue) => void;
}) {
  const names = useT().graph.growth.names;
  return (
    <span className="select properties__select">
      <select
        id={id}
        className="input"
        value={growthOf(value)}
        onChange={(event) => onSave(event.currentTarget.value)}
      >
        {GROWTHS.map((growth) => (
          <option key={growth} value={growth}>
            {names[growth]}
          </option>
        ))}
      </select>
      <ChevronDown className="select__icon" aria-hidden="true" />
    </span>
  );
}

function ListValue({
  id,
  name,
  items,
  suggestions,
  onSave,
}: {
  readonly id: string;
  readonly name: string;
  readonly items: ReadonlyArray<string>;
  readonly suggestions: ReadonlyArray<string>;
  readonly onSave: (value: PropertyValue) => Promise<boolean>;
}) {
  const p = useT().graph.props;
  const [draft, setDraft] = useState("");
  const [list, setList] = useState(items);
  const [known, setKnown] = useState<ReadonlyArray<string> | null>(items);
  const [awaited, setAwaited] = useState<ReadonlyArray<string> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = `${id}-items`;
  if (known !== items) {
    if (awaited === null) {
      setKnown(items);
      setList(items);
    } else if (sameItems(items, awaited)) {
      setKnown(items);
      setAwaited(null);
    }
  }

  const commit = (next: ReadonlyArray<string>, typed = "") => {
    setList(next);
    setAwaited(next);
    void onSave(next).then((saved) => {
      if (saved) return;
      setAwaited(null);
      setKnown(null);
      setDraft((draft) => (draft === "" ? typed : draft));
    });
  };

  const add = () => {
    const added = splitItems(draft).filter((item) => !list.includes(item));
    setDraft("");
    if (added.length > 0) commit([...list, ...added], draft);
  };

  const remove = (item: string) => {
    input.current?.focus();
    commit(list.filter((other) => other !== item));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Escape") {
      setDraft("");
    }
  };

  return (
    <span className="properties__items">
      {list.map((item) => (
        <span key={item} className="properties__token">
          {item}
          <button
            type="button"
            className="properties__token-remove"
            aria-label={p.removeItem(item)}
            title={p.removeItem(item)}
            onClick={() => remove(item)}
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={input}
        id={id}
        className="properties__input properties__input--item"
        list={listId}
        value={draft}
        placeholder={p.addItem}
        aria-label={p.addTo(name)}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={add}
        onKeyDown={onKeyDown}
      />
      <datalist id={listId}>
        {suggestions
          .filter((item) => !list.includes(item))
          .map((item) => (
            <option key={item} value={item} />
          ))}
      </datalist>
    </span>
  );
}
