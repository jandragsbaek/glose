import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  firstReadingStep,
  type ReadingStart as Start,
  type Source,
  type SourceFootprint,
} from "@glose/contracts";
import { useNavigate } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Ellipsis } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";

import { wordCount } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import {
  deleteSourceAtom,
  sourceFootprintAtom,
  SOURCE_RESET_KEYS,
  sourceKeys,
  startSourceOverAtom,
} from "../state/vault.ts";
import { SESSION_KEYS } from "../state/sessions.ts";
import { versionsStatusAtom } from "../state/versions.ts";
import { SheetFoot } from "./Backup.tsx";
import { forgetPassageDraft } from "./PassageCapture.tsx";
import { STARTS } from "./ReadingStart.tsx";
import { stepName } from "./StepBar.tsx";
import { Notice, Sheet, StorageProblem } from "./ui.tsx";

type Open = "start-over" | "delete" | null;

export function SourceMenu({ source }: { readonly source: Source }) {
  const t = useT();
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Open>(null);
  const choose = (next: Open) => {
    menu.current?.hidePopover();
    setOpen(next);
  };
  return (
    <>
      <button
        type="button"
        className="button button--quiet source-menu__button"
        popoverTarget={menuId}
        aria-label={t.sourceMenu.label}
        title={t.sourceMenu.label}
      >
        <Ellipsis className="source-menu__icon" aria-hidden="true" />
      </button>
      <div id={menuId} ref={menu} popover="auto" className="source-menu">
        <button type="button" className="source-menu__item" onClick={() => choose("start-over")}>
          {t.sourceMenu.startOver}
        </button>
        <button
          type="button"
          className="source-menu__item source-menu__item--grave"
          onClick={() => choose("delete")}
        >
          {t.sourceMenu.delete}
        </button>
      </div>
      {open === "start-over" ? (
        <StartOverSheet source={source} onClose={() => setOpen(null)} />
      ) : open === "delete" ? (
        <DeleteSourceSheet
          source={source}
          onClose={() => setOpen(null)}
          onStartOver={() => setOpen("start-over")}
        />
      ) : null}
    </>
  );
}

function useFootprint(source: Source) {
  return useAtomValue(sourceFootprintAtom(source.id));
}

function StartOverSheet({
  source,
  onClose,
}: {
  readonly source: Source;
  readonly onClose: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const book = source.kind === "book";
  const [start, setStart] = useState<Start | null>(book ? source.readingStart : null);
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const startOver = useAtomSet(startSourceOverAtom, { mode: "promiseExit" });
  const footprint = useFootprint(source);

  const begin = async () => {
    setState("saving");
    const exit = await startOver({
      payload: { id: source.id, start },
      reactivityKeys: [...sourceKeys(source.id), ...SESSION_KEYS.sessions],
    });
    if (Exit.isFailure(exit)) {
      setState("failed");
      return;
    }
    onClose();
    void navigate({ to: "/sources/$sourceId", params: { sourceId: source.id }, search: {} });
  };

  const words = wordCount(source.freeText);
  return (
    <Sheet title={t.startOver.title(source.title)} onClose={onClose}>
      <p>{t.startOver.lead}</p>
      {book ? (
        <fieldset className="start-choices">
          <legend className="start-over__where">{t.startOver.where}</legend>
          {STARTS.map((option) => (
            <label key={option} className="choice start-choice">
              <input
                type="radio"
                name={`start-over-${source.id}`}
                value={option}
                checked={start === option}
                onChange={() => setStart(option)}
              />
              <span className="start-choice__text">
                <span className="start-choice__label">{t.start.choices[option]}</span>
                <span className="start-choice__hint">{t.start.choiceHints[option]}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      <FootprintOf source={source} result={footprint}>
        {(found) => {
          const aside = [
            ...(found.probeQuestions === null ? [] : [t.startOver.probe(found.probeQuestions)]),
            ...(found.extraction ? [t.startOver.extraction] : []),
          ];
          const stays = [
            ...(words === 0 ? [] : [t.startOver.freeText(words)]),
            ...(found.passages === 0 ? [] : [t.startOver.passages(found.passages)]),
            ...(found.notes.length === 0 ? [] : [t.startOver.notes(found.notes.length)]),
          ];
          return (
            <div className="start-over__ledger">
              <div>
                <h3 className="start-over__head">{t.startOver.setAside}</h3>
                <Items items={aside} empty={t.startOver.nothingSetAside} />
                {found.probeQuestions === null ? null : (
                  <p className="field__hint">{t.startOver.setAsideHint}</p>
                )}
              </div>
              <div>
                <h3 className="start-over__head">{t.startOver.stays}</h3>
                <Items items={stays} empty={t.startOver.nothingStays} />
              </div>
            </div>
          );
        }}
      </FootprintOf>
      {state === "failed" ? (
        <Notice tone="error" title={t.errors.storage}>
          <p>{t.errors.storageRecovery}</p>
        </Notice>
      ) : null}
      <SheetFoot>
        <button
          type="button"
          className="button button--primary"
          disabled={(book && start === null) || state === "saving"}
          onClick={begin}
        >
          {state === "saving"
            ? t.startOver.starting
            : book && start !== null
              ? t.startOver.startAt(stepName(t, firstReadingStep(start, source.kind), source.kind))
              : t.startOver.start}
        </button>
        <button
          type="button"
          className="button button--quiet sheet__cancel"
          data-autofocus
          onClick={onClose}
        >
          {t.startOver.cancel}
        </button>
      </SheetFoot>
    </Sheet>
  );
}

function DeleteSourceSheet({
  source,
  onClose,
  onStartOver,
}: {
  readonly source: Source;
  readonly onClose: () => void;
  readonly onStartOver: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "deleting" | "failed">("idle");
  const [inUse, setInUse] = useState<Pick<SourceFootprint, "notes" | "writing"> | null>(null);
  const remove = useAtomSet(deleteSourceAtom, { mode: "promiseExit" });
  const footprint = useFootprint(source);
  const versions = AsyncResult.getOrElse(useAtomValue(versionsStatusAtom), () => null);

  const confirm = async () => {
    setState("deleting");
    const exit = await remove({ payload: { id: source.id }, reactivityKeys: SOURCE_RESET_KEYS });
    if (Exit.isSuccess(exit)) {
      forgetPassageDraft(source.id);
      onClose();
      void navigate({ to: "/sources", search: {} });
      return;
    }
    const error = Option.getOrNull(Cause.findErrorOption(exit.cause));
    if (error?._tag === "SourceInUse") setInUse(error);
    setState("failed");
  };

  const words = wordCount(source.freeText);
  return (
    <Sheet title={t.deleteSource.title(source.title)} onClose={onClose}>
      <FootprintOf source={source} result={footprint}>
        {(found) => {
          const blocking = inUse ?? found;
          if (blocking.notes.length > 0 || blocking.writing.length > 0) {
            return (
              <>
                <Notice tone="warning" title={t.deleteSource.inUseTitle}>
                  <p>{t.deleteSource.inUse}</p>
                </Notice>
                {blocking.notes.length === 0 ? null : (
                  <div>
                    <h3 className="start-over__head">{t.deleteSource.notes}</h3>
                    <Items items={blocking.notes} empty="" />
                  </div>
                )}
                {blocking.writing.length === 0 ? null : (
                  <div>
                    <h3 className="start-over__head">{t.deleteSource.writing}</h3>
                    <Items items={blocking.writing} empty="" />
                  </div>
                )}
                <SheetFoot>
                  <button type="button" className="button" onClick={onStartOver}>
                    {t.deleteSource.startOverInstead}
                  </button>
                  <button
                    type="button"
                    className="button button--quiet sheet__cancel"
                    data-autofocus
                    onClick={onClose}
                  >
                    {t.deleteSource.close}
                  </button>
                </SheetFoot>
              </>
            );
          }
          const removes = [
            t.deleteSource.file(`${source.id}.md`),
            ...(source.hasText ? [t.deleteSource.text] : []),
            ...(source.videoFile === null ? [] : [t.deleteSource.video]),
            ...(words === 0 ? [] : [t.deleteSource.freeText(words)]),
            ...(found.passages === 0 ? [] : [t.deleteSource.passages(found.passages)]),
            ...(found.probeQuestions === null ? [] : [t.deleteSource.probe(found.probeQuestions)]),
            ...(found.extraction ? [t.deleteSource.extraction] : []),
            ...(found.setAside === 0 ? [] : [t.deleteSource.setAside(found.setAside)]),
          ];
          return (
            <>
              <div>
                <p>{t.deleteSource.lead}</p>
                <Items items={removes} empty="" />
              </div>
              {found.linkedFrom.length === 0 ? null : (
                <div>
                  <p>{t.deleteSource.linkedFrom(found.linkedFrom.length)}</p>
                  <Items items={found.linkedFrom} empty="" />
                </div>
              )}
              {versions?._tag === "On" ? (
                <p className="field__hint">{t.deleteSource.versions}</p>
              ) : null}
              {state === "failed" ? (
                <Notice tone="error" title={t.errors.storage}>
                  <p>{t.errors.storageRecovery}</p>
                </Notice>
              ) : null}
              <SheetFoot>
                <button
                  type="button"
                  className="button button--grave"
                  disabled={state === "deleting"}
                  onClick={confirm}
                >
                  {state === "deleting" ? t.deleteSource.deleting : t.deleteSource.delete}
                </button>
                <button
                  type="button"
                  className="button button--quiet sheet__cancel"
                  data-autofocus
                  onClick={onClose}
                >
                  {t.deleteSource.cancel}
                </button>
              </SheetFoot>
            </>
          );
        }}
      </FootprintOf>
    </Sheet>
  );
}

function FootprintOf({
  source,
  result,
  children,
}: {
  readonly source: Source;
  readonly result: ReturnType<typeof useFootprint>;
  readonly children: (footprint: SourceFootprint) => ReactNode;
}) {
  const t = useT();
  const refresh = useAtomRefresh(sourceFootprintAtom(source.id));
  return AsyncResult.match(result, {
    onInitial: () => (
      <p className="field__hint" role="status">
        {t.startOver.loading}
      </p>
    ),
    onFailure: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) => children(value),
  });
}

function Items({
  items,
  empty,
}: {
  readonly items: ReadonlyArray<string>;
  readonly empty: string;
}) {
  if (items.length === 0) return <p className="field__hint">{empty}</p>;
  return (
    <ul className="start-over__items">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
