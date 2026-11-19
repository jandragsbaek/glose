import { useAtom, useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  type ArticlePassage,
  openQuestion,
  parseArticle,
  type Session,
  type Source,
} from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { articleAtom, markPassageAtom, setPlaceAtom, unsavedWordsAtom } from "../state/vault.ts";
import {
  extractionSessionAtom,
  goDeeperAtom,
  probeSessionAtom,
  SESSION_KEYS,
  noSessionAtom,
  sessionAtom,
} from "../state/sessions.ts";
import { ArticleText, type PassageLook } from "./ArticleText.tsx";
import { passageKey, passageStates, toneOf } from "./readerState.ts";
import { textLanguage } from "../domain/textLanguage.ts";
import { Notebook, PassageMargin } from "./ReaderMargin.tsx";
import { Apparatus, Contents, DoneReading, LessonNav } from "./ReaderParts.tsx";
import {
  MarkBar,
  ReaderFoot,
  type ReaderNotice,
  readSelectionIn,
  type Selected,
} from "./ReaderBars.tsx";
import { pointsOf, useChatGptReady } from "./Session.tsx";
import { StepBar } from "./StepBar.tsx";
import { Notice, Page, SkeletonPanel, StorageProblem } from "./ui.tsx";

export function Reader({
  source,
  sub,
  focus,
}: {
  readonly source: Source;
  readonly sub: ReactNode;
  readonly focus: number | null;
}) {
  const t = useT();
  const result = useAtomValue(articleAtom(source.id));
  const refresh = useAtomRefresh(articleAtom(source.id));
  return AsyncResult.matchWithError(result, {
    onInitial: () => (
      <Page title={source.title} sub={sub}>
        <SkeletonPanel />
      </Page>
    ),
    onError: (error) => (
      <Page title={source.title} sub={sub}>
        {error._tag === "PassageRefused" ? (
          <Notice tone="warning" title={t.reader.noText}>
            <p>{t.source.fileName(`Articles/${source.id}`)}</p>
          </Notice>
        ) : (
          <StorageProblem onRetry={refresh} />
        )}
      </Page>
    ),
    onDefect: () => (
      <Page title={source.title} sub={sub}>
        <StorageProblem onRetry={refresh} />
      </Page>
    ),
    onSuccess: ({ value }) => (
      <ReaderView source={source} sub={sub} focus={focus} initial={value.markdown} />
    ),
  });
}

const sessionIdOf = (found: AsyncResult.AsyncResult<Session | null, unknown>): string | null =>
  AsyncResult.getOrElse(
    AsyncResult.map(found, (session) => session?.id ?? null),
    () => null,
  );

const NOTES = "notes";

const lostParagraph = (key: string) => Number(key.split(":")[0]);

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

function ReaderView({
  source,
  sub,
  focus,
  initial,
}: {
  readonly source: Source;
  readonly sub: ReactNode;
  readonly focus: number | null;
  readonly initial: string;
}) {
  const t = useT();
  const [markdown, setMarkdown] = useState(initial);
  const article = parseArticle(markdown);
  const [current, setCurrent] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [notice, setNotice] = useState<ReaderNotice | null>(null);
  const [unsaved, setUnsaved] = useAtom(unsavedWordsAtom);
  const [atEnd, setAtEnd] = useState(false);
  const [visible, setVisible] = useState<ReadonlySet<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLElement>(null);

  const probeId = sessionIdOf(useAtomValue(probeSessionAtom(source.id)));
  const probe = AsyncResult.getOrElse(
    useAtomValue(probeId === null ? noSessionAtom : sessionAtom(probeId)),
    () => null,
  );
  const extraction = AsyncResult.getOrElse(
    useAtomValue(extractionSessionAtom(source.id)),
    () => null,
  );
  const points = pointsOf(extraction?.entries ?? []);
  const states = passageStates(article.passages, probe, points);
  const keyOf = passageKey;
  const currentPassage = article.passages.find((passage) => keyOf(passage) === current) ?? null;
  const unsavedKey = (key: string) => `${source.id}|${key}`;
  const keep = (key: string, words: string) =>
    setUnsaved((before) => new Map(before).set(unsavedKey(key), words));
  const forget = (key: string) =>
    setUnsaved((before) => {
      if (!before.has(unsavedKey(key))) return before;
      const next = new Map(before);
      next.delete(unsavedKey(key));
      return next;
    });
  const openKey = currentPassage === null ? NOTES : keyOf(currentPassage);
  const lost = [...unsaved.keys()]
    .filter((key) => key.startsWith(`${source.id}|`))
    .map((key) => key.slice(source.id.length + 1))
    .find((key) => key !== openKey);
  const looks = new Map<string, PassageLook>(
    article.passages.map((passage) => [
      passage.id,
      { tone: toneOf(passage, states), current: passage === currentPassage },
    ]),
  );
  const say = (text: string | null) => setNotice(text === null ? null : { text, reopen: null });

  const mark = useAtomSet(markPassageAtom, { mode: "promiseExit" });
  const goDeeper = useAtomSet(goDeeperAtom, { mode: "promiseExit" });
  const setPlace = useAtomSet(setPlaceAtom, { mode: "promiseExit" });
  const ready = useChatGptReady();

  const top = visible.size === 0 ? null : atEnd ? Math.max(...visible) : Math.min(...visible);
  const placeRef = useRef(source.readingPlace);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a timer, not state: the place is written to the Source file once scrolling settles.
  useEffect(() => {
    if (top === null || top === placeRef.current) return;
    const timer = window.setTimeout(() => {
      placeRef.current = top;
      void setPlace({ payload: { id: source.id, place: top } });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [top, source.id, setPlace]);

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the DOM, not state: which paragraphs are in view is read from the page, again when the text changes.
  useEffect(() => {
    const leaf = leafRef.current;
    if (leaf === null) return;
    const seen = new Set<number>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          const target = record.target as HTMLElement;
          if (target.dataset.end !== undefined) {
            setAtEnd(record.isIntersecting);
            continue;
          }
          const n = Number(target.dataset.n);
          if (record.isIntersecting) seen.add(n);
          else seen.delete(n);
        }
        setVisible((before) =>
          before.size === seen.size && [...seen].every((n) => before.has(n))
            ? before
            : new Set(seen),
        );
      },
      { rootMargin: "-40px 0px -140px 0px" },
    );
    for (const node of leaf.querySelectorAll<HTMLElement>(".unit[data-n], [data-end]")) {
      observer.observe(node);
    }
    return () => observer.disconnect();
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the paragraphs are observed again when the text changes.
  }, [markdown]);

  const opened = useRef(false);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the DOM, once: the text opens where the reader left off.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const at = focus ?? source.readingPlace;
    if (at === null || at <= 1) return;
    document.getElementById(`p-${at}`)?.scrollIntoView({ block: "start" });
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- once, at opening; the place moves as the reader scrolls.
  }, []);

  const readSelection = () => {
    const read = readSelectionIn(leafRef.current, columnRef.current);
    setSelected(read.selected);
    if (read.problem === "outside") say(t.reader.notHere);
    else if (read.selected !== null)
      say(read.problem === "clipped" ? t.reader.oneParagraph(read.selected.n) : null);
  };

  const placeBar = (bar: HTMLDivElement | null) => {
    const leaf = leafRef.current;
    if (bar === null || leaf === null || selected === null) return;
    const half = bar.offsetWidth / 2;
    const room = leaf.clientWidth;
    bar.style.left = `${Math.min(Math.max(selected.left, half + 8), room - half - 8)}px`;
  };

  const readLater = useRef(0);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the DOM: a selection the reader clears takes the mark bar away, and a touch selection shows it once it settles.
  useEffect(() => {
    const onChange = () => {
      const selection = window.getSelection();
      window.clearTimeout(readLater.current);
      if (selection === null || selection.isCollapsed) {
        setSelected(null);
        setNotice((now) => (now?.reopen == null ? null : now));
      } else readLater.current = window.setTimeout(readSelection, 350);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      window.clearTimeout(readLater.current);
      document.removeEventListener("selectionchange", onChange);
    };
  }, [readSelection]);

  const ownerOf = (question: number) =>
    article.passages.find((passage) =>
      states.get(passage.id)?.asked.some((asked) => asked.number === question),
    )?.id ?? null;

  const canGoDeeper = (passage: ArticlePassage) => {
    const state = states.get(passage.id);
    const open = probe === null ? null : openQuestion(probe.entries);
    const owner = open === null ? null : ownerOf(open.number);
    return (
      ready &&
      probe?.working !== true &&
      (open === null || owner === passage.id) &&
      ((state?.asked.length ?? 0) === 0 || state?.understood === true)
    );
  };

  const deeper = async (passage: string, open = true) => {
    const target = open ? article.passages.find((other) => other.id === passage) : undefined;
    if (target !== undefined) setCurrent(keyOf(target));
    if (!ready) return;
    const exit = await goDeeper({
      payload: { source: source.id, passage },
      reactivityKeys: SESSION_KEYS.sessions,
    });
    if (Exit.isSuccess(exit)) return;
    const error = Exit.findErrorOption(exit);
    say(
      error._tag === "None"
        ? t.errors.storage
        : error.value._tag === "PassageRefused"
          ? t.reader.refused[error.value.reason]
          : error.value._tag === "SessionBusy"
            ? t.reader.busy
            : t.errors.storage,
    );
  };

  const markSelected = async (thenDeeper: boolean) => {
    if (selected === null || busy) return;
    setBusy(true);
    const exit = await mark({
      payload: { id: source.id, paragraph: selected.n, start: selected.start, end: selected.end },
    });
    setBusy(false);
    if (Exit.isSuccess(exit)) {
      window.getSelection()?.removeAllRanges();
      setSelected(null);
      say(null);
      setMarkdown(exit.value.markdown);
      const after = parseArticle(exit.value.markdown).passages;
      const made = after.find((passage) => passage.id === exit.value.passage);
      if (made !== undefined) {
        setCurrent(passageKey(made));
        if (thenDeeper) void deeper(made.id, false);
      }
    } else {
      const reason = Exit.findErrorOption(exit);
      say(
        reason._tag === "Some" && reason.value._tag === "PassageRefused"
          ? t.reader.refused[reason.value.reason]
          : t.errors.storage,
      );
    }
  };

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the keyboard: M, D and Esc act on the selection in the text.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || editable(event.target)) return;
      if (event.key === "Escape") {
        if (selected !== null) {
          window.getSelection()?.removeAllRanges();
          setSelected(null);
        } else setCurrent(null);
        say(null);
        return;
      }
      if (selected === null) {
        if (
          (event.key === "d" || event.key === "D") &&
          currentPassage !== null &&
          canGoDeeper(currentPassage)
        ) {
          event.preventDefault();
          void deeper(currentPassage.id);
        }
        return;
      }
      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        void markSelected(false);
      } else if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        void markSelected(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, markSelected, currentPassage, canGoDeeper, deeper, say]);

  const openPassage = (id: string) => {
    const target = article.passages.find((passage) => passage.id === id);
    setCurrent(target === undefined ? null : keyOf(target));
    const [n] = id.split(".");
    document.getElementById(`p-${n}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const sections = article.sections.filter((section) => section.level <= 3);
  const inView = article.passages.filter((passage) => visible.has(passage.n));
  const deeperCount = article.passages.filter(
    (passage) => (states.get(passage.id)?.asked.length ?? 0) > 0,
  ).length;
  const pointCount = article.passages.filter(
    (passage) => states.get(passage.id)?.point != null,
  ).length;
  const reading = source.readingStep === "read";

  return (
    <Page title={source.title} sub={sub} fill flush actions={<LessonNav source={source} />}>
      <div className="reader">
        <div className="reader__band">
          <StepBar
            source={source}
            readNote={t.reader.stepNote(article.passages.length, top, article.units.length)}
          />
          <p className="reader__how">
            {t.reader.howTo} <span className="reader__keys">{t.reader.keys}</span>
          </p>
        </div>
        <div className="reader__desk">
          <Contents article={article} sections={sections} top={top} title={source.title} />
          <div className="reader__column">
            <div className="reader__scroll" ref={columnRef}>
              <article
                className="reader__leaf"
                ref={leafRef}
                lang={textLanguage(article)}
                onMouseUp={readSelection}
                onKeyUp={(event) => {
                  if (event.shiftKey || event.key.startsWith("Arrow")) readSelection();
                }}
              >
                <ArticleText
                  article={article}
                  looks={looks}
                  onPassage={openPassage}
                  skipTitle={source.title}
                />
                <span className="reader__end" data-end="" aria-hidden="true" />
                {selected === null ? null : (
                  <MarkBar
                    selected={selected}
                    busy={busy}
                    place={placeBar}
                    onMark={(thenDeeper) => void markSelected(thenDeeper)}
                  />
                )}
                {reading ? (
                  <DoneReading
                    source={source}
                    passages={article.passages.length}
                    deeper={deeperCount}
                    points={pointCount}
                  />
                ) : (
                  <div className="reader__back">
                    <Link
                      to="/sources/$sourceId"
                      params={{ sourceId: source.id }}
                      search={{}}
                      className="button"
                    >
                      <ArrowLeft className="button__icon" aria-hidden="true" />
                      {t.reader.backToStep}
                    </Link>
                  </div>
                )}
              </article>
            </div>
            <ReaderFoot
              notice={
                lost === undefined
                  ? notice
                  : {
                      text:
                        lost === NOTES
                          ? t.reader.margin.lostNotes
                          : t.reader.margin.lost(lostParagraph(lost)),
                      reopen: lost,
                    }
              }
              onReopen={(key) => setCurrent(key === NOTES ? null : key)}
            >
              <Apparatus
                passages={inView}
                states={states}
                current={currentPassage?.id ?? null}
                onOpen={openPassage}
              />
            </ReaderFoot>
          </div>
          <aside className="reader__margin">
            {currentPassage === null ? (
              <Notebook
                source={source}
                passages={article.passages.length}
                pendingNotes={unsaved.get(unsavedKey(NOTES)) ?? null}
                onLost={(words) => keep(NOTES, words)}
                onSaved={() => forget(NOTES)}
              />
            ) : (
              <PassageMargin
                key={keyOf(currentPassage)}
                pendingWords={unsaved.get(unsavedKey(keyOf(currentPassage))) ?? null}
                canGoDeeper={canGoDeeper(currentPassage)}
                onLost={(words) => keep(keyOf(currentPassage), words)}
                onSaved={() => forget(keyOf(currentPassage))}
                source={source}
                passage={currentPassage}
                probe={probe}
                passageState={states.get(currentPassage.id)}
                ownerOf={ownerOf}
                ready={ready}
                onClose={() => setCurrent(null)}
                onDeeper={() => void deeper(currentPassage.id)}
                onChanged={setMarkdown}
                onRemoved={() => setCurrent(null)}
                onOpen={openPassage}
                article={article}
              />
            )}
          </aside>
        </div>
      </div>
    </Page>
  );
}
