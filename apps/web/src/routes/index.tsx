import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { Source } from "@glose/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Plus, TriangleAlert } from "lucide-react";

import { StepBar } from "../components/StepBar.tsx";
import {
  CallNumber,
  Page,
  Panel,
  SkeletonPanel,
  Spine,
  StorageProblem,
} from "../components/ui.tsx";
import { missingDetails } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import { cardsAtom } from "../state/cards.ts";
import { graphAtom, sourcesAtom } from "../state/graph.ts";
import { writingListAtom } from "../state/writing.ts";

/** The date is read when Today is opened, not on every render. */
export const Route = createFileRoute("/")({
  component: Today,
  loader: () => ({ opened: new Date() }),
});

function Today() {
  const t = useT();
  const { opened } = Route.useLoaderData();
  return (
    <Page
      title={t.today.title}
      sub={t.today.date(opened)}
      actions={
        <Link to="/sources/new" className="button button--primary">
          <Plus size={16} aria-hidden="true" />
          {t.today.addSource}
        </Link>
      }
    >
      <div className="columns">
        <div className="stack">
          <SourcesInProgress />
          <Panel title={t.today.notesNear} initial="lapis">
            <div className="panel__body">
              <p className="empty">{t.today.notesNearEmpty}</p>
            </div>
          </Panel>
        </div>
        <div className="stack">
          <RecallToday />
          <WritingToday />
          <NotesWithAiText />
        </div>
      </div>
    </Page>
  );
}

function SourcesInProgress() {
  const t = useT();
  const sources = useAtomValue(sourcesAtom);
  const refresh = useAtomRefresh(sourcesAtom);
  return AsyncResult.matchWithError(sources, {
    onInitial: () => <SkeletonPanel />,
    onError: () => <StorageProblem onRetry={refresh} />,
    onDefect: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) => {
      const [current, ...others] = value.filter((source) => source.readingStep !== "done");
      return (
        <Panel title={t.today.inProgress} initial="rubric">
          {current === undefined ? <NoSource /> : <CurrentSource source={current} />}
          {others.length === 0 ? null : (
            <div className="panel__body">
              <h3 className="subhead">{t.today.alsoInProgress}</h3>
              <ul className="rows">
                {others.map((source) => (
                  <li key={source.id}>
                    <CallNumber source={source} />
                    <span className="rows__title">{source.title}</span>
                    <span className="rows__meta">{readingStepName(t, source)}</span>
                    <Link
                      to="/sources/$sourceId"
                      params={{ sourceId: source.id }}
                      className="button"
                    >
                      {t.today.open}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      );
    },
  });
}

/** The Cards there are; Review, and so the Cards due today, comes in a later version. */
function RecallToday() {
  const t = useT();
  const cards = useAtomValue(cardsAtom);
  const refresh = useAtomRefresh(cardsAtom);
  return AsyncResult.matchWithError(cards, {
    onInitial: () => <SkeletonPanel />,
    onError: () => <StorageProblem onRetry={refresh} />,
    onDefect: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) => (
      <Panel title={t.today.recall} initial="rubric">
        <div className="panel__body">
          {value.length === 0 ? (
            <p className="empty">{t.today.recallEmpty}</p>
          ) : (
            <p className="button-row">
              <span>
                {t.today.recallCounts(value.length, value.filter((card) => card.ai).length)}
              </span>
              <Link to="/recall" className="button">
                {t.today.openRecall}
              </Link>
            </p>
          )}
        </div>
      </Panel>
    ),
  });
}

/** Few enough to take in at a glance; the rest wait in the Graph. */
const AI_TEXT_SHOWN = 8;

/** Every Note that holds AI text, until the user rewrites it in their own words. */
function NotesWithAiText() {
  const t = useT();
  const graph = useAtomValue(graphAtom);
  const refresh = useAtomRefresh(graphAtom);
  return AsyncResult.matchWithError(graph, {
    onInitial: () => <SkeletonPanel />,
    onError: () => <StorageProblem onRetry={refresh} />,
    onDefect: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) => {
      const notes = value.nodes
        .filter((node) => node.kind === "note" && node.aiText)
        .sort((a, b) => a.title.localeCompare(b.title));
      return (
        <Panel
          title={t.today.aiText}
          initial="rubric"
          meta={notes.length === 0 ? undefined : t.today.aiTextCount(notes.length)}
        >
          <div className="panel__body">
            {notes.length === 0 ? (
              <p className="empty">{t.today.aiTextEmpty}</p>
            ) : (
              <>
                <ul className="rows">
                  {notes.slice(0, AI_TEXT_SHOWN).map((note) => (
                    <li key={note.id}>
                      <Link to="/graph" search={{ node: note.id }} className="rows__title">
                        {note.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                {notes.length > AI_TEXT_SHOWN ? (
                  <p className="empty">{t.today.aiTextMore(notes.length - AI_TEXT_SHOWN)}</p>
                ) : null}
              </>
            )}
          </div>
        </Panel>
      );
    },
  });
}

const readingStepName = (t: ReturnType<typeof useT>, source: Source) =>
  source.readingStep === "done" ? t.today.continue.done : t.steps.names[source.readingStep];

function CurrentSource({ source }: { readonly source: Source }) {
  const t = useT();
  const author = [source.givenName, source.familyName].filter(Boolean).join(" ");
  const missing = missingDetails(source);
  return (
    <div className="panel__body">
      <div className="source">
        <div className="source__spine">
          <Spine source={source} />
        </div>
        <h3 className="source__title">
          <Link to="/sources/$sourceId" params={{ sourceId: source.id }}>
            {source.title}
          </Link>
        </h3>
        <Link
          to="/sources/$sourceId"
          params={{ sourceId: source.id }}
          className="button button--primary source__action"
        >
          {t.today.continue[source.readingStep]}
        </Link>
        <p className="source__line">
          {[
            author,
            source.publisher,
            source.firstPublished === null ? null : t.source.firstPublished(source.firstPublished),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="source__steps">
          <StepBar source={source} />
          {missing.length === 0 ? null : (
            <p className="inline-warning">
              <TriangleAlert className="notice__icon" aria-hidden="true" />
              <span>
                {t.source.missingLine(missing.map((detail) => t.source.missingInline[detail]))}{" "}
                <Link to="/sources/$sourceId" params={{ sourceId: source.id }}>
                  {t.source.howToFix}
                </Link>
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NoSource() {
  const t = useT();
  return (
    <div className="panel__body">
      <p className="empty empty--lead">{t.today.noSourceTitle}</p>
      <p className="empty">{t.today.noSourceBody}</p>
      <p style={{ marginTop: 16 }}>
        <Link to="/sources/new" className="button button--primary">
          <Plus size={16} aria-hidden="true" />
          {t.today.addSource}
        </Link>
      </p>
    </div>
  );
}

/** The piece written last, to go on with it. */
function WritingToday() {
  const t = useT();
  const projects = AsyncResult.getOrElse(useAtomValue(writingListAtom), () => null);
  const latest = projects?.[0] ?? null;
  return (
    <Panel title={t.today.writingProject} initial="lapis">
      <div className="panel__body">
        {latest === null ? (
          <p className="empty">
            {t.today.writingEmpty} <Link to="/writing">{t.writing.title}</Link>
          </p>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            <p>
              <strong>{latest.title}</strong>
              <span className="field__hint"> · {t.writing.types[latest.type]}</span>
            </p>
            <p>
              <Link
                to="/writing/$projectId"
                params={{ projectId: latest.id }}
                className="button button--primary button--small"
              >
                {t.today.writingContinue}
              </Link>
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
