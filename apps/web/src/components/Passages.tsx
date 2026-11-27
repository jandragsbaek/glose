import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { BookPassage, Source } from "@glose/contracts";
import { Link, useNavigate } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useId, useState } from "react";

import { bandsOf, furthestPage, type PageBand } from "../domain/passages.ts";
import { wordCount } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import { addBookPassagesPointAtom, passagesAtom } from "../state/passages.ts";
import { SESSION_KEYS, startSessionAtom } from "../state/sessions.ts";
import { advanceReadingAtom, sourceKeys } from "../state/vault.ts";
import { PassageCapture } from "./PassageCapture.tsx";
import { PassageEntry, passageElement } from "./PassageEntry.tsx";
import { PassageNote, type PointIds, useDeskSession } from "./PassageNote.tsx";
import { Notebook } from "./ReaderMargin.tsx";
import { useChatGptReady } from "./Session.tsx";
import { StepBar } from "./StepBar.tsx";
import { Flourish, Notice, Page, SkeletonPanel, StorageProblem } from "./ui.tsx";

export function PassagesStage({
  source,
  sub,
}: {
  readonly source: Source;
  readonly sub: ReactNode;
}) {
  const t = useT();
  const result = useAtomValue(passagesAtom(source.id));
  const refresh = useAtomRefresh(passagesAtom(source.id));
  return AsyncResult.matchWithError(result, {
    onInitial: () => (
      <Page title={source.title} sub={sub}>
        <SkeletonPanel />
      </Page>
    ),
    onError: () => (
      <Page title={source.title} sub={sub}>
        <StorageProblem onRetry={refresh} />
      </Page>
    ),
    onDefect: () => (
      <Page title={source.title} sub={sub}>
        <StorageProblem onRetry={refresh} />
      </Page>
    ),
    onSuccess: ({ value }) => (
      <Page
        title={source.title}
        sub={sub}
        fill
        flush
        actions={
          source.readingStep === "passages" ? undefined : (
            <Link
              to="/sources/$sourceId"
              params={{ sourceId: source.id }}
              search={{}}
              className="button button--quiet"
            >
              <ArrowLeft className="button__icon" aria-hidden="true" />
              {t.passages.back}
            </Link>
          )
        }
      >
        <PassagesDesk source={source} passages={value} />
      </Page>
    ),
  });
}

export function PassagesLink({ source }: { readonly source: Source }) {
  const t = useT();
  return (
    <Link
      to="/sources/$sourceId"
      params={{ sourceId: source.id }}
      search={{ passages: 1 }}
      className="button button--quiet"
    >
      {t.passages.open}
    </Link>
  );
}

const typing = (target: EventTarget) =>
  target instanceof HTMLElement && target.closest("input, textarea, button, a, select") !== null;

function PassagesDesk({
  source,
  passages,
}: {
  readonly source: Source;
  readonly passages: ReadonlyArray<BookPassage>;
}) {
  const t = useT();
  const [selected, setSelected] = useState<ReadonlyArray<string>>([]);
  const [desk, setDesk] = useState<ReadonlyArray<string> | null>(null);
  const [deskIds, setDeskIds] = useState<PointIds | null>(null);
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [band, setBand] = useState<string | null>(null);
  const addPoint = useAtomSet(addBookPassagesPointAtom, { mode: "promiseExit" });
  const { session, point } = useDeskSession(deskIds);

  const shown = unusedOnly
    ? passages.filter((passage) => passage.usedBy.length === 0 || desk?.includes(passage.id))
    : passages;
  const bands = bandsOf(shown);
  const onDesk = (desk ?? []).flatMap((id) => passages.filter((passage) => passage.id === id));
  const last = furthestPage(passages);
  const used = passages.filter((passage) => passage.usedBy.length > 0).length;

  const toggle = (id: string) =>
    setSelected((now) => (now.includes(id) ? now.filter((other) => other !== id) : [...now, id]));

  const openDesk = (ids: ReadonlyArray<string>) => {
    if (ids.length === 0 || desk !== null) return;
    setDesk(passages.filter((passage) => ids.includes(passage.id)).map(({ id }) => id));
  };

  const closeDesk = (focus: string | null) => {
    setDesk(null);
    setDeskIds(null);
    setSelected([]);
    if (focus !== null) {
      window.setTimeout(() => document.getElementById(passageElement(focus))?.focus(), 0);
    }
  };

  const nextAfter = (ids: ReadonlyArray<string>): string | null => {
    const lastIndex = Math.max(...ids.map((id) => passages.findIndex((p) => p.id === id)));
    return passages.slice(lastIndex + 1).find((passage) => passage.usedBy.length === 0)?.id ?? null;
  };

  const ensure = async (title: string): Promise<PointIds | null> => {
    if (deskIds !== null) return deskIds;
    if (desk === null) return null;
    const exit = await addPoint({
      payload: { source: source.id, passages: [desk[0] ?? "", ...desk.slice(1)], title },
      reactivityKeys: SESSION_KEYS.sessions,
    });
    if (Exit.isFailure(exit)) return null;
    setDeskIds(exit.value);
    return exit.value;
  };

  const onKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (typing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    const entry =
      event.target instanceof HTMLElement ? event.target.closest("[data-passage]") : null;
    const id = entry?.getAttribute("data-passage") ?? null;
    if (event.key === "x" || event.key === "X") {
      if (id === null || desk !== null) return;
      event.preventDefault();
      toggle(id);
    }
    if (event.key === "w" || event.key === "W") {
      event.preventDefault();
      openDesk(selected.length > 0 ? selected : id === null ? [] : [id]);
    }
  };

  const jump = (target: PageBand) => {
    setBand(target.key);
    const first = target.passages[0];
    if (first !== undefined) {
      document.getElementById(passageElement(first.id))?.scrollIntoView({ block: "start" });
    }
  };

  const bandName = (target: PageBand) =>
    target.pages === null ? t.passages.otherBand : t.passages.band(...target.pages);

  return (
    <div className="reader passages" data-desk={desk === null ? undefined : ""}>
      <div className="reader__band">
        <StepBar
          source={source}
          passagesNote={t.passages.stepNote(
            passages.length,
            last === null ? null : t.passages.page(last),
          )}
        />
        <p className="reader__how">{t.passages.keys}</p>
      </div>
      <div className="reader__desk passages__desk">
        {desk === null ? (
          <nav className="reader__contents" aria-label={t.passages.pages}>
            <h2 className="contents__title">{t.passages.pages}</h2>
            <ol className="contents__list">
              {bands.map((target) => (
                <li key={target.key}>
                  <button
                    type="button"
                    className="contents__item passages__band"
                    aria-current={band === target.key ? "location" : undefined}
                    onClick={() => jump(target)}
                  >
                    <span className="contents__name">{bandName(target)}</span>
                    <span className="contents__count">{target.passages.length}</span>
                  </button>
                </li>
              ))}
            </ol>
            <label className="passages__unused">
              <input
                type="checkbox"
                checked={unusedOnly}
                onChange={(event) => setUnusedOnly(event.target.checked)}
              />
              {t.passages.unusedOnly}
            </label>
          </nav>
        ) : (
          <p className="passages__fold" aria-hidden="true">
            {t.passages.pages}
          </p>
        )}
        <div className="reader__column">
          <div className="reader__scroll">
            <article className="reader__leaf passages__leaf" onKeyDown={onKeys}>
              {shown.length === 0 ? (
                <p className="empty">
                  {unusedOnly && passages.length > 0 ? t.passages.emptyUnused : t.passages.empty}
                </p>
              ) : (
                <ol className="passages__list">
                  {shown.map((passage) => (
                    <PassageEntry
                      key={passage.id}
                      source={source.id}
                      passage={passage}
                      selected={selected.includes(passage.id)}
                      onDesk={desk === null ? null : desk.indexOf(passage.id)}
                      onToggle={() => toggle(passage.id)}
                    />
                  ))}
                </ol>
              )}
              {source.readingStep === "passages" ? (
                <DonePassages
                  source={source}
                  passages={passages.length}
                  used={used}
                  words={wordCount(source.freeText)}
                />
              ) : null}
            </article>
          </div>
          <div className="reader__foot">
            {selected.length > 0 && desk === null ? (
              <div className="passages__chosen" role="status">
                <span>{t.passages.desk.meta(selected.length)}</span>
                <button
                  type="button"
                  className="button button--primary button--small"
                  aria-keyshortcuts="W"
                  onClick={() => openDesk(selected)}
                >
                  {t.passages.desk.title}
                  <kbd className="key" aria-hidden="true">
                    {t.passages.writeKey}
                  </kbd>
                </button>
              </div>
            ) : null}
            <PassageCapture source={source} passages={passages} />
          </div>
        </div>
        <aside className="reader__margin passages__margin">
          {desk === null ? (
            <Notebook
              source={source}
              passages={passages.length}
              pendingNotes={null}
              title={t.reading.freeText}
              hint={t.passages.freeTextHint}
              foot={t.passages.marginRule}
            />
          ) : (
            <DeskPanel count={onDesk.length}>
              <PassageNote
                cites={onDesk.map(({ id, page, words }) => ({ id, page, words }))}
                ids={deskIds}
                session={session}
                point={point}
                ensure={ensure}
                onSaved={() => closeDesk(nextAfter(desk))}
                onClose={() => closeDesk(null)}
              />
            </DeskPanel>
          )}
        </aside>
      </div>
    </div>
  );
}

function DeskPanel({ count, children }: { readonly count: number; readonly children: ReactNode }) {
  const t = useT();
  const headingId = useId();
  return (
    <section
      className="panel passages__deskpanel"
      data-initial="accent"
      aria-labelledby={headingId}
    >
      <div className="panel__head">
        <h2 className="panel__title" id={headingId}>
          {t.passages.desk.title}
        </h2>
        <span className="panel__meta">{t.passages.desk.meta(count)}</span>
      </div>
      <div className="panel__rule" aria-hidden="true">
        <Flourish />
      </div>
      <div className="panel__body">{children}</div>
    </section>
  );
}

function DonePassages({
  source,
  passages,
  used,
  words,
}: {
  readonly source: Source;
  readonly passages: number;
  readonly used: number;
  readonly words: number;
}) {
  const t = useT();
  const headingId = useId();
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const advance = useAtomSet(advanceReadingAtom, { mode: "promiseExit" });
  const start = useAtomSet(startSessionAtom, { mode: "promiseExit" });
  const ready = useChatGptReady();
  const navigate = useNavigate();
  const go = async () => {
    setState("saving");
    const exit = await advance({
      payload: { id: source.id, from: "passages" },
      reactivityKeys: sourceKeys(source.id),
    });
    setState(Exit.isSuccess(exit) ? "idle" : "failed");
    if (Exit.isSuccess(exit)) {
      void navigate({ to: "/sources/$sourceId", params: { sourceId: source.id }, search: {} });
    }
    if (Exit.isSuccess(exit) && ready) {
      void start({
        payload: { kind: "extraction", subject: source.id },
        reactivityKeys: SESSION_KEYS.sessions,
      });
    }
  };
  return (
    <section className="done-reading" aria-labelledby={headingId}>
      <div className="done-reading__head">
        <h2 className="done-reading__title" id={headingId}>
          {t.passages.end.title}
        </h2>
        <p className="done-reading__summary">{t.passages.end.summary(passages, used, words)}</p>
      </div>
      <p className="field__hint">{t.passages.end.hint(passages - used)}</p>
      {state === "failed" ? (
        <Notice tone="error">
          <p>{t.passages.end.failed}</p>
        </Notice>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          className="button button--primary"
          disabled={state === "saving"}
          onClick={() => void go()}
        >
          {t.passages.end.go}
          <ArrowRight className="button__icon" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
