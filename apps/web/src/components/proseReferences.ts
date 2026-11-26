import { type EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { findReferences, linkKey } from "@glose/contracts";

import { referenceLead } from "../domain/writing.ts";

const leadOf = referenceLead;

export const referenceAt = (state: EditorState, pos: number) => {
  const body = state.doc.toString();
  return findReferences(body).find((token) => leadOf(body, token.start) === pos) ?? null;
};

export const referenceKey = (target: string, location: string | null) =>
  `${linkKey(target)}|${location ?? ""}`;

export const setFlagged = StateEffect.define<ReadonlySet<string>>();

export const flaggedKeys = (keys: Iterable<string>) => [...new Set(keys)].sort().join("\n");
export const flaggedField = StateField.define<ReadonlySet<string>>({
  create: () => new Set(),
  update: (value, transaction) => {
    for (const effect of transaction.effects) if (effect.is(setFlagged)) return effect.value;
    return value;
  },
});

class ReferenceMark extends WidgetType {
  readonly number: number;
  readonly flagged: boolean;
  readonly label: string;
  readonly joined: boolean;
  constructor(number: number, flagged: boolean, label: string, joined: boolean) {
    super();
    this.number = number;
    this.flagged = flagged;
    this.label = label;
    this.joined = joined;
  }
  override eq(other: ReferenceMark) {
    return (
      other.number === this.number &&
      other.flagged === this.flagged &&
      other.label === this.label &&
      other.joined === this.joined
    );
  }
  override toDOM() {
    const mark = document.createElement("sup");
    mark.className = [
      "prose-editor__ref",
      this.flagged ? "prose-editor__ref--flagged" : "",
      this.joined ? "prose-editor__ref--joined" : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (this.joined) {
      const comma = document.createElement("span");
      comma.className = "ref-sep";
      comma.textContent = ",";
      mark.append(comma);
    }
    mark.append(String(this.number));
    mark.setAttribute("role", "doc-noteref");
    mark.setAttribute("aria-label", this.label);
    return mark;
  }
  override ignoreEvent() {
    return false;
  }
}

export const referenceMarks = (label: (n: number, flagged: boolean) => string) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.startState.field(flaggedField) !== update.state.field(flaggedField)
        ) {
          this.decorations = this.build(update.view);
        }
      }
      build(view: EditorView) {
        const { state } = view;
        const flagged = state.field(flaggedField);
        const body = state.doc.toString();
        const tokens = findReferences(body);
        return Decoration.set(
          tokens.map((token, index) => {
            const bad = flagged.has(referenceKey(token.target, token.location));
            const lead = leadOf(body, token.start);
            const joined = tokens[index - 1]?.end === lead;
            return Decoration.replace({
              widget: new ReferenceMark(index + 1, bad, label(index + 1, bad), joined),
            }).range(lead, token.end);
          }),
        );
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );
