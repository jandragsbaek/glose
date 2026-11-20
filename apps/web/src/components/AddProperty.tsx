import { type GraphNode, isPropertyKey, type PropertyValue } from "@glose/contracts";
import { ChevronDown, CircleAlert, Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";

import {
  ADDABLE,
  type AddableKind,
  kindFor,
  type Save,
  splitItems,
  type VaultKey,
} from "../graph/propertyKeys.ts";
import { useT } from "../i18n/I18n.tsx";

type Messages = ReturnType<typeof useT>;

export function AddProperty({
  node,
  vault,
  onSave,
}: {
  readonly node: GraphNode;
  readonly vault: ReadonlyMap<string, VaultKey>;
  readonly onSave: Save;
}) {
  const t = useT();
  const p = t.graph.props;
  const id = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AddableKind>("text");
  const [kindChosen, setKindChosen] = useState(false);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const [problem, setProblem] = useState<{
    readonly on: "name" | "value";
    readonly text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const taken = new Set(node.properties.map((property) => property.key));
  const names = [...vault.keys()].filter((key) => !taken.has(key)).sort();

  const close = () => {
    setOpen(false);
    setName("");
    setKind("text");
    setKindChosen(false);
    setText("");
    setChecked(false);
    setProblem(null);
    requestAnimationFrame(() => opener.current?.focus());
  };

  const changeName = (value: string) => {
    setName(value);
    if (!kindChosen) setKind(kindFor(value.trim(), vault));
  };

  const valueOf = (): { readonly value: PropertyValue } | { readonly problem: string } => {
    if (kind === "checkbox") return { value: checked };
    if (kind === "list") return { value: splitItems(text) };
    if (kind === "number") {
      const number = Number(text);
      return text.trim() === "" || !Number.isFinite(number)
        ? { problem: p.numberMissing }
        : { value: number };
    }
    if (kind === "date" && text === "") return { problem: p.dateMissing };
    return { value: text };
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const key = name.trim();
    if (key === "") return setProblem({ on: "name", text: p.nameMissing });
    if (!isPropertyKey(key)) return setProblem({ on: "name", text: p.nameBad });
    if (taken.has(key)) return setProblem({ on: "name", text: p.nameTaken(key) });
    const read = valueOf();
    if ("problem" in read) return setProblem({ on: "value", text: read.problem });
    setProblem(null);
    setBusy(true);
    const saved = await onSave(key, read.value);
    setBusy(false);
    if (saved) close();
  };

  if (!open) {
    return (
      <button ref={opener} type="button" className="properties__add" onClick={() => setOpen(true)}>
        <Plus className="properties__icon" aria-hidden="true" />
        {p.add}
      </button>
    );
  }

  return (
    <form
      className="properties__new"
      noValidate
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="properties__new-head">
        <label className="properties__field">
          <span className="properties__label">{p.name}</span>
          <input
            autoFocus
            className="input properties__new-input"
            list={`${id}-names`}
            value={name}
            aria-invalid={problem?.on === "name"}
            onChange={(event) => changeName(event.currentTarget.value)}
          />
          <datalist id={`${id}-names`}>
            {names.map((key) => (
              <option key={key} value={key} />
            ))}
          </datalist>
        </label>
        <label className="properties__field properties__field--kind">
          <span className="properties__label">{p.type}</span>
          <span className="select">
            <select
              className="input"
              value={kind}
              onChange={(event) => {
                setKind(event.currentTarget.value as AddableKind);
                setKindChosen(true);
              }}
            >
              {ADDABLE.map((option) => (
                <option key={option} value={option}>
                  {p.kinds[option]}
                </option>
              ))}
            </select>
            <ChevronDown className="select__icon" aria-hidden="true" />
          </span>
        </label>
      </div>
      <NewValue
        kind={kind}
        text={text}
        checked={checked}
        invalid={problem?.on === "value"}
        messages={t}
        onText={setText}
        onChecked={setChecked}
      />
      {problem === null ? null : (
        <p className="field__error" role="alert">
          <CircleAlert className="field__error-icon" aria-hidden="true" />
          {problem.text}
        </p>
      )}
      <p className="properties__new-foot">
        <button type="submit" className="button button--small" disabled={busy}>
          {p.addButton}
        </button>
        <button type="button" className="button button--quiet button--small" onClick={close}>
          {p.cancel}
        </button>
      </p>
    </form>
  );
}

function NewValue({
  kind,
  text,
  checked,
  invalid,
  messages,
  onText,
  onChecked,
}: {
  readonly kind: AddableKind;
  readonly text: string;
  readonly checked: boolean;
  readonly invalid: boolean;
  readonly messages: Messages;
  readonly onText: (text: string) => void;
  readonly onChecked: (checked: boolean) => void;
}): ReactNode {
  const p = messages.graph.props;
  if (kind === "checkbox") {
    return (
      <label className="properties__field properties__field--check">
        <input
          type="checkbox"
          className="properties__check"
          checked={checked}
          onChange={(event) => onChecked(event.currentTarget.checked)}
        />
        <span className="properties__label">{p.yes}</span>
      </label>
    );
  }
  return (
    <label className="properties__field">
      <span className="properties__label">{p.value}</span>
      <input
        className="input properties__new-input"
        type={kind === "number" ? "number" : kind === "date" ? "date" : "text"}
        value={text}
        aria-invalid={invalid}
        onChange={(event) => onText(event.currentTarget.value)}
      />
      {kind === "list" ? <span className="field__hint">{p.listHint}</span> : null}
    </label>
  );
}
