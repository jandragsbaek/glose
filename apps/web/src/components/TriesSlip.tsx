import { useAtomSet } from "@effect/atom-react";
import { AI_TRY_WORDS, tryWordCount, type WritingProjectFields } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { X } from "lucide-react";
import { type RefObject, useEffect, useId, useRef, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { sentenceAround } from "../domain/writing.ts";
import { tryWordsAtom } from "../state/writing.ts";
import { isMac } from "./WritingDeskBar.tsx";
import type { ProseHandle } from "./ProseEditor.tsx";
import { type LiveTry, type TriesState, toSaved } from "./proseTries.ts";

export interface TriesPlace {
  readonly top: number;
  readonly left: number;
  readonly width: number;
}

export type TriesClose = "escape" | "outside";

export interface OpenTries {
  readonly group: LiveTry;
  readonly place: TriesPlace;
}

type Asked =
  | { readonly kind: "idle" }
  | { readonly kind: "asking" }
  | { readonly kind: "words"; readonly words: ReadonlyArray<string> }
  | { readonly kind: "off" | "failed" | "too-long" };

const SLIP_WIDTH = 360;

export function useDeskTries(
  editor: RefObject<ProseHandle | null>,
  editorBox: RefObject<HTMLDivElement | null>,
  fields: Pick<WritingProjectFields, "body" | "language" | "tries">,
  onSaved: (tries: WritingProjectFields["tries"]) => void,
) {
  const t = useT();
  const [open, setOpen] = useState<OpenTries | null>(null);
  const placeOf = (group: LiveTry): TriesPlace => {
    const box = editorBox.current;
    const room = box?.clientWidth ?? SLIP_WIDTH;
    const width = Math.min(SLIP_WIDTH, room);
    const start = editor.current?.leftOf(group.from) ?? 0;
    return {
      top: (box?.offsetTop ?? 0) + (editor.current?.bottomOf(group.to) ?? 0) + 8,
      left: (box?.offsetLeft ?? 0) + Math.max(0, Math.min(start - 12, room - width)),
      width,
    };
  };
  const follow = (state: TriesState) => {
    onSaved(toSaved(state.groups));
    const group = state.groups.find((each) => each.id === state.open) ?? null;
    setOpen(group === null ? null : { group, place: placeOf(group) });
  };
  return {
    editorProps: {
      initialTries: fields.tries,
      triesText: {
        hint: t.tries.tipHint(isMac() ? "⇧⌘A" : "Ctrl+Shift+A"),
        flipped: t.tries.flipped,
        refused: t.tries.refused,
      },
      onTries: follow,
    },
    slip:
      open === null ? null : (
        <TriesSlip
          key={open.group.id}
          open={open}
          body={fields.body}
          language={fields.language}
          editor={editor}
        />
      ),
  };
}

export function TriesSlip({
  open,
  body,
  language,
  editor,
}: {
  readonly open: OpenTries;
  readonly body: string;
  readonly language: string;
  readonly editor: RefObject<ProseHandle | null>;
}) {
  const { group, place } = open;
  const sentence = sentenceAround(body, group.from, group.to);
  const [refused, setRefused] = useState(false);
  const onFlip = (index: number) =>
    setRefused(!(editor.current?.tries.flip(group.id, index) ?? true));
  const onAdd = (text: string, fromAi: boolean) => {
    const result = editor.current?.tries.add(group.id, text, fromAi) ?? "invalid";
    setRefused(result === "refused");
    return result === "added";
  };
  const onRemove = (index: number) =>
    setRefused(!(editor.current?.tries.remove(group.id, index) ?? true));
  const onClose = (reason: TriesClose) => editor.current?.tries.close(reason === "escape");
  const t = useT();
  const titleId = useId();
  const slip = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState<Asked>({ kind: "idle" });
  const askWords = useAtomSet(tryWordsAtom, { mode: "promiseExit" });
  const shown = group.tries[group.showing] ?? "";
  const words = tryWordCount(shown);
  const aiCan = words <= AI_TRY_WORDS;

  const close = useRef(onClose);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: the outside-click listener, made once, calls the newest close.
  useEffect(() => {
    close.current = onClose;
  });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- DOM, not state: a click outside the slip closes it, as the Cite Slip does.
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && slip.current?.contains(event.target)) return;
      close.current("outside");
    };
    const listen = window.setTimeout(() => document.addEventListener("mousedown", outside), 0);
    slip.current?.scrollIntoView({ block: "nearest" });
    return () => {
      window.clearTimeout(listen);
      document.removeEventListener("mousedown", outside);
    };
  }, []);

  const ask = async () => {
    setAsked({ kind: "asking" });
    const exit = await askWords({
      payload: { language, sentence, text: shown, tries: group.tries },
    });
    if (Exit.isSuccess(exit)) {
      setAsked({ kind: "words", words: exit.value.words });
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    setAsked({
      kind:
        Option.isSome(error) && error.value._tag === "TryWordsUnavailable"
          ? error.value.reason
          : "failed",
    });
  };

  const add = () => {
    if (draft.trim() === "") {
      onClose("escape");
      return;
    }
    if (onAdd(draft, false)) setDraft("");
  };

  const fromAi =
    asked.kind === "words" ? asked.words.filter((word) => !group.tries.includes(word)) : [];
  const newLabel = words === 1 ? t.tries.newWord : t.tries.newWords;

  return (
    <div
      ref={slip}
      className="tries-slip"
      role="dialog"
      aria-labelledby={titleId}
      style={{ top: place.top, left: place.left, width: place.width }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose("escape");
        }
      }}
    >
      <div className="tries-slip__head">
        <span className="tries-slip__what" id={titleId}>
          <span className="sr-only">{t.tries.slipLabel(shown)}: </span>
          {t.tries.words(words)}
        </span>
        <span className="tries-slip__count">{t.tries.count(group.tries.length)}</span>
      </div>
      <ul className="tries-slip__list" aria-label={t.tries.listLabel}>
        {group.tries.map((text, index) => (
          <li
            key={text}
            className={["tries-slip__row", group.ai.includes(text) ? "tries-slip__row--ai" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <button
              type="button"
              className="tries-slip__try"
              aria-current={index === group.showing ? "true" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onFlip(index)}
            >
              <span className="tries-slip__n" aria-hidden="true">
                {index + 1}
              </span>
              <span className="tries-slip__text">{text}</span>
              {group.ai.includes(text) ? (
                <span className="tries-slip__tag">{t.tries.aiTag}</span>
              ) : index === 0 ? (
                <span className="tries-slip__tag">{t.tries.first}</span>
              ) : null}
            </button>
            {group.tries.length < 2 ? null : (
              <button
                type="button"
                className="tries-slip__remove"
                aria-label={t.tries.remove(text)}
                title={t.tries.remove(text)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onRemove(index)}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="tries-slip__new">
        <input
          ref={field}
          className="tries-slip__input"
          type="text"
          autoFocus
          autoComplete="off"
          spellCheck
          lang={language}
          aria-label={newLabel}
          placeholder={newLabel}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && draft === "") {
              event.preventDefault();
              const next = group.showing + (event.key === "ArrowDown" ? 1 : -1);
              if (next >= 0 && next < group.tries.length) onFlip(next);
            } else if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
      </div>
      {asked.kind === "asking" || fromAi.length > 0 ? (
        <div className="tries-slip__ai ai-text" data-scope="paragraphs">
          <p className="ai-text__gloss">{t.tries.aiGloss}</p>
          {asked.kind === "asking" ? (
            <p className="tries-slip__note" role="status">
              {t.tries.asking}
            </p>
          ) : (
            <ul className="tries-slip__list" aria-label={t.tries.aiListLabel}>
              {fromAi.map((word) => (
                <li key={word} className="tries-slip__row tries-slip__row--ai">
                  <button
                    type="button"
                    className="tries-slip__try"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onAdd(word, true)}
                  >
                    <span className="tries-slip__text">{word}</span>
                    <span className="tries-slip__tag">{t.tries.tryIt}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {refused ? (
        <p className="tries-slip__note tries-slip__note--alone" role="status">
          {t.tries.refused}
        </p>
      ) : null}
      {asked.kind === "idle" || asked.kind === "asking" || fromAi.length > 0 ? null : (
        <p className="tries-slip__note tries-slip__note--alone" role="status">
          {asked.kind === "off"
            ? t.tries.off
            : asked.kind === "failed"
              ? t.tries.failed
              : asked.kind === "too-long"
                ? t.tries.tooLong(AI_TRY_WORDS)
                : t.tries.noWords}
        </p>
      )}
      <div className="tries-slip__foot">
        {aiCan ? (
          <button
            type="button"
            className="button button--small"
            disabled={asked.kind === "asking"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void ask()}
          >
            {asked.kind === "words" ? t.tries.askAgain : t.tries.ask}
          </button>
        ) : (
          <span className="tries-slip__hint">{t.tries.tooLong(AI_TRY_WORDS)}</span>
        )}
        <span className="tries-slip__hint">{t.tries.hint}</span>
      </div>
    </div>
  );
}
