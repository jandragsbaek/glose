import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Source } from "@glose/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { type ReactNode, useId, useState } from "react";

import { Extraction } from "../components/Extraction.tsx";
import { Probe } from "../components/Probe.tsx";
import { PassagesLink, PassagesStage } from "../components/Passages.tsx";
import { PersonProposal } from "../components/PersonProposal.tsx";
import { Reader } from "../components/Reader.tsx";
import { ReadingStart } from "../components/ReadingStart.tsx";
import { StepBar } from "../components/StepBar.tsx";
import { VideoNotes, Watch } from "../components/Watch.tsx";
import {
  CallNumber,
  Notice,
  Page,
  Panel,
  SkeletonPanel,
  Spine,
  StorageProblem,
} from "../components/ui.tsx";
import { authorOf, peopleIn, personOfSource } from "../domain/person.ts";
import { asksWhereToStart, missingDetails, wordCount } from "../domain/source.ts";
import { videoIdOf, youtubeAt } from "../domain/video.ts";
import { useT } from "../i18n/I18n.tsx";
import { graphAtom, KEYS, saveFreeTextAtom, sourceAtom } from "../state/vault.ts";

interface SourceSearch {
  readonly text?: 1;
  readonly p?: number;
  readonly watch?: 1;
  readonly t?: number;
  readonly passages?: 1;
}

export const Route = createFileRoute("/sources/$sourceId")({
  component: ReadingStage,
  validateSearch: (search: Record<string, unknown>): SourceSearch => {
    const p = Number(search.p);
    const at = Number(search.t);
    return {
      ...(search.text === 1 || search.text === "1" ? { text: 1 as const } : {}),
      ...(Number.isInteger(p) && p > 0 ? { p } : {}),
      ...(search.watch === 1 || search.watch === "1" ? { watch: 1 as const } : {}),
      ...(search.passages === 1 || search.passages === "1" ? { passages: 1 as const } : {}),
      ...(search.t !== undefined && Number.isInteger(at) && at >= 0 ? { t: at } : {}),
    };
  },
});

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
  const t = useT();
  const search = Route.useSearch();
  const author = [source.givenName, source.familyName].filter(Boolean).join(" ");
  const where =
    source.kind === "lesson"
      ? [source.container, source.part === null ? null : t.lessonPart(source.part)]
          .filter(Boolean)
          .join(", ")
      : source.kind === "article"
        ? (source.container ?? t.kinds.one.article)
        : source.kind === "video"
          ? (source.container ?? t.kinds.one.video)
          : null;
  const sub = (
    <span className="button-row">
      <AuthorName source={source} name={author} />
      {source.kind === "lesson" && source.container !== null ? (
        <span className="page-head__where">
          <Link
            to="/courses/$courseName"
            params={{ courseName: source.container }}
            search={source.part === null ? {} : { day: source.part }}
            className="page-head__crumb"
          >
            {source.container}
          </Link>
          {source.part === null ? null : `, ${t.lessonPart(source.part)}`}
        </span>
      ) : where === null || where === "" ? null : (
        <span className="page-head__where">{where}</span>
      )}
      <CallNumber source={source} />
    </span>
  );
  if (source.hasText && (source.readingStep === "read" || search.text === 1)) {
    return <Reader source={source} sub={sub} focus={search.p ?? null} />;
  }
  if (source.kind === "book" && (source.readingStep === "passages" || search.passages === 1)) {
    return <PassagesStage source={source} sub={sub} />;
  }
  if (
    source.kind === "video" &&
    (source.readingStep === "free-text" || search.watch === 1 || search.t !== undefined)
  ) {
    return <Watch source={source} sub={sub} start={search.t ?? 0} />;
  }
  const sourcePanels = (
    <div className="columns">
      {source.kind === "video" ? <VideoNotes source={source} /> : <FreeText source={source} />}
      <Details source={source} />
    </div>
  );
  if (source.readingStep === "probe") {
    return <Probe source={source} sub={sub} sourcePanels={sourcePanels} />;
  }
  if (source.readingStep !== "free-text") {
    return (
      <Page
        title={source.title}
        sub={sub}
        fill
        flush
        actions={
          source.hasText ? (
            <Link
              to="/sources/$sourceId"
              params={{ sourceId: source.id }}
              search={{ text: 1 }}
              className="button button--quiet"
            >
              {t.reader.readText}
            </Link>
          ) : source.kind === "video" ? (
            <Link
              to="/sources/$sourceId"
              params={{ sourceId: source.id }}
              search={{ watch: 1 }}
              className="button button--quiet"
            >
              {t.watch.watchVideo}
            </Link>
          ) : source.kind === "book" ? (
            <PassagesLink source={source} />
          ) : undefined
        }
      >
        <Extraction source={source} sourcePanels={sourcePanels} />
      </Page>
    );
  }
  if (asksWhereToStart(source)) {
    return (
      <Page title={source.title} sub={sub}>
        <div className="columns">
          <ReadingStart source={source} />
          <Details source={source} />
        </div>
      </Page>
    );
  }
  return (
    <Page
      title={source.title}
      sub={sub}
      actions={source.kind === "book" ? <PassagesLink source={source} /> : undefined}
    >
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

function AuthorName({ source, name }: { readonly source: Source; readonly name: string }) {
  const graph = useAtomValue(graphAtom);
  if (!AsyncResult.isSuccess(graph)) return <span>{name}</span>;
  const person = personOfSource(source, peopleIn(graph.value));
  if (person === null) {
    return (
      <span className="page-head__author">
        <span>{name}</span>
        <PersonProposal author={authorOf(source)} inline />
      </span>
    );
  }
  return (
    <Link
      to="/people/$personName"
      params={{ personName: person.id }}
      search={{}}
      className="page-head__crumb"
    >
      {person.title}
    </Link>
  );
}

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
          {inFreeText
            ? t.reading.freeTextHint
            : source.readingStart === "probe" || source.readingStart === "catch-up"
              ? t.reading.anytime
              : t.reading.finished}
        </p>
        <label className="sr-only" htmlFor={textId}>
          {t.reading.freeTextLabel}
        </label>
        <textarea
          className="textarea"
          id={textId}
          aria-describedby={hintId}
          value={text}
          autoFocus={inFreeText && source.readingStart === "write" && source.freeText === ""}
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
  const videoId = videoIdOf(source.url);
  const rows: ReadonlyArray<readonly [string, ReactNode]> =
    source.kind === "video"
      ? [
          [t.source.fields.speaker, author],
          [t.source.fields.title, source.title],
          [t.addVideo.year, source.firstPublished],
          [t.source.fields.channel, source.container],
          [
            t.source.fields.address,
            videoId === null ? (
              source.url
            ) : (
              <a
                key="address"
                href={youtubeAt(videoId)}
                target="_blank"
                rel="noreferrer"
                className="details__link"
              >
                {youtubeAt(videoId)}
              </a>
            ),
          ],
          [t.source.fields.file, t.source.fileName(source.id)],
        ]
      : [
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
    <Panel title={t.source.details} initial="accent">
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
