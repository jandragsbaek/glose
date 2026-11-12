import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Source } from "@glose/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useId, useState } from "react";

import { Extraction } from "../components/Extraction.tsx";
import { StepBar } from "../components/StepBar.tsx";
import {
  CallNumber,
  Notice,
  Page,
  Panel,
  SkeletonPanel,
  Spine,
  StorageProblem,
} from "../components/ui.tsx";
import { missingDetails, wordCount } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import { KEYS, saveFreeTextAtom, sourceAtom } from "../state/graph.ts";

export const Route = createFileRoute("/sources/$sourceId")({ component: ReadingStage });

function ReadingStage() {
  const t = useT();
  const { sourceId } = Route.useParams();
  const result = useAtomValue(sourceAtom(sourceId));
  const refresh = useAtomRefresh(sourceAtom(sourceId));
  return AsyncResult.matchWithError(result, {
    onInitial: () => (
      <Page title={t.steps.label}>
        <SkeletonPanel />
      </Page>
    ),
    onError: (error) =>
      error._tag === "SourceNotFound" ? (
        <Page title={t.errors.notFoundTitle}>
          <p className="empty">{t.errors.sourceNotFound}</p>
          <p style={{ marginTop: 16 }}>
            <Link to="/" className="button">
              {t.errors.backToToday}
            </Link>
          </p>
        </Page>
      ) : (
        <Page title={t.steps.label}>
          <StorageProblem onRetry={refresh} />
        </Page>
      ),
    onDefect: () => (
      <Page title={t.steps.label}>
        <StorageProblem onRetry={refresh} />
      </Page>
    ),
    onSuccess: ({ value }) => <SourceView key={value.id} source={value} />,
  });
}

function SourceView({ source }: { readonly source: Source }) {
  const author = [source.givenName, source.familyName].filter(Boolean).join(" ");
  const sub = (
    <span className="button-row">
      {author}
      <CallNumber source={source} />
    </span>
  );
  // Past the Free text, Extraction is the page: the points beside the Session in the margin.
  if (source.readingStep !== "free-text") {
    return (
      <Page title={source.title} sub={sub} fill flush>
        <Extraction
          source={source}
          sourcePanels={
            <div className="columns">
              <FreeText source={source} />
              <Details source={source} />
            </div>
          }
        />
      </Page>
    );
  }
  return (
    <Page title={source.title} sub={sub}>
      <div className="columns">
        <div className="stack">
          <StepBar source={source} />
          <FreeText source={source} />
        </div>
        <div className="stack">
          <Details source={source} />
        </div>
      </div>
    </Page>
  );
}

type SaveState = "idle" | "saving" | "saved" | "failed";

function FreeText({ source }: { readonly source: Source }) {
  const t = useT();
  const textId = useId();
  const hintId = useId();
  const [text, setText] = useState(source.freeText);
  const [state, setState] = useState<SaveState>("idle");
  const saveFreeText = useAtomSet(saveFreeTextAtom, { mode: "promiseExit" });
  const dirty = text !== source.freeText;
  const inFreeText = source.readingStep === "free-text";

  const save = async (finish: boolean) => {
    setState("saving");
    const exit = await saveFreeText({
      payload: { id: source.id, freeText: text, finish },
      reactivityKeys: KEYS.sources,
    });
    setState(Exit.isSuccess(exit) ? "saved" : "failed");
  };

  const status = () => {
    if (state === "saving") return t.reading.saving;
    if (dirty) return t.reading.unsaved;
    if (state === "saved") return t.reading.saved;
    return null;
  };

  return (
    <Panel title={t.reading.freeText} initial="rubric" meta={t.steps.words(wordCount(text))}>
      <div className="panel__body field">
        <p className="field__hint" id={hintId}>
          {inFreeText ? t.reading.freeTextHint : t.reading.finished}
        </p>
        <label className="sr-only" htmlFor={textId}>
          {t.reading.freeTextLabel}
        </label>
        <textarea
          className="textarea"
          id={textId}
          aria-describedby={hintId}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (state === "saved") setState("idle");
          }}
          spellCheck
        />
        {state === "failed" ? (
          <Notice tone="error" title={t.errors.storage}>
            <p>{t.errors.storageRecovery}</p>
          </Notice>
        ) : null}
        <div className="button-row" style={{ marginTop: 8 }}>
          {inFreeText ? (
            <button
              type="button"
              className="button button--primary"
              disabled={state === "saving"}
              onClick={() => save(true)}
            >
              {text.trim() === "" ? t.reading.skip : t.reading.finish}
            </button>
          ) : null}
          <button
            type="button"
            className="button"
            disabled={!dirty || state === "saving"}
            onClick={() => save(false)}
          >
            {t.reading.save}
          </button>
          <span className="status" role="status">
            {status()}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function Details({ source }: { readonly source: Source }) {
  const t = useT();
  const missing = missingDetails(source);
  const author = [source.familyName, source.givenName].filter(Boolean).join(", ");
  const rows: ReadonlyArray<readonly [string, string | number | null]> = [
    [t.source.fields.author, author],
    [t.source.fields.title, source.title],
    [t.source.fields.firstPublished, source.firstPublished],
    [t.source.fields.publisher, source.publisher],
    [t.source.fields.edition, source.edition],
    [t.source.fields.editionYear, source.editionYear],
    [t.source.fields.translator, source.translator],
    [t.source.fields.file, t.source.fileName(source.id)],
  ];
  return (
    <Panel title={t.source.details} initial="lapis">
      <div className="panel__body">
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <Spine source={source} />
          <dl className="details">
            {rows
              .filter(([, value]) => value !== null)
              .map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>
      {missing.length === 0 ? null : (
        <div className="panel__body">
          <Notice tone="warning" title={t.source.missingTitle}>
            <ul>
              {missing.map((detail) => (
                <li key={detail}>{t.source.missing[detail]}</li>
              ))}
            </ul>
            <p style={{ marginTop: 6 }}>{t.source.missingHowTo}</p>
          </Notice>
        </div>
      )}
    </Panel>
  );
}
