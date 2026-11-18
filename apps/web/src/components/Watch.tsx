import { useAtomSet } from "@effect/atom-react";
import { type Source, timestampText } from "@glose/contracts";
import { Link, useNavigate } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import { ArrowLeft, ArrowRight, ExternalLink, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { type Cue, cueAt, cuesOf, notesWordCount, videoIdOf, youtubeAt } from "../domain/video.ts";
import { useLanguage, useT } from "../i18n/I18n.tsx";
import { finishWatchingAtom, writeWatchNotesAtom } from "../state/graph.ts";
import {
  draftOf,
  finishNotes,
  keepDraft,
  restoreDraft,
  savedOver,
  saveNotes,
} from "../state/watchNotes.ts";
import { SaveLine, type SaveState } from "./ReaderMargin.tsx";
import { StepBar } from "./StepBar.tsx";
import { Notice, Page, Panel } from "./ui.tsx";
import { WatchNotes, type WatchNotesHandle } from "./WatchNotes.tsx";
import { isMac } from "./WritingDeskBar.tsx";
import { type Player, useYouTubePlayer } from "./youtube.ts";

const modKey = () => (isMac() ? "⌘" : "Ctrl");

const SAVE_AFTER = 900;

function useNotes(source: Source) {
  const writeNotes = useAtomSet(writeWatchNotesAtom, { mode: "promiseExit" });
  const finishWatching = useAtomSet(finishWatchingAtom, { mode: "promiseExit" });
  const [text, setText] = useState(
    () =>
      restoreDraft(source.id, source.freeText) ??
      savedOver(source.id, source.freeText, source.modified) ??
      source.freeText,
  );
  const [state, setState] = useState<SaveState>("idle");
  const mounted = useRef(true);
  const write = (finish: boolean) => async (freeText: string) => {
    const exit = await writeNotes({ id: source.id, freeText, finish });
    return Exit.isSuccess(exit) ? exit.value.modified : false;
  };
  const advance = async () =>
    Exit.isSuccess(await finishWatching({ id: source.id, from: "free-text" }));
  const settle = (ok: boolean) => {
    if (mounted.current) {
      setState(ok ? (draftOf(source.id) === undefined ? "saved" : "idle") : "failed");
    }
    return ok;
  };
  const save = (finish = false) => {
    if (draftOf(source.id) === undefined && !finish) return Promise.resolve(true);
    setState("saving");
    return (
      finish ? finishNotes(source.id, write(true), advance) : saveNotes(source.id, write(false))
    ).then(settle);
  };
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the queue's record, not state: once the Source shows the words a save wrote, the record of that save is retired.
  useEffect(() => {
    savedOver(source.id, source.freeText, source.modified);
  }, [source.id, source.freeText, source.modified]);
  const saveRef = useRef(save);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: the timer and the last save on leaving call the newest writer.
  useEffect(() => {
    saveRef.current = save;
  });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a timer, not state: the notes are written to the Source file once typing pauses.
  useEffect(() => {
    if (draftOf(source.id) !== text) return;
    const timer = window.setTimeout(() => void saveRef.current(), SAVE_AFTER);
    return () => window.clearTimeout(timer);
  }, [text, source.id]);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the file, not state: words typed just before the view closes are still written, in the one queue every view of these notes shares.
  useEffect(() => {
    mounted.current = true;
    const leaving = () => void saveRef.current();
    window.addEventListener("pagehide", leaving);
    return () => {
      mounted.current = false;
      window.removeEventListener("pagehide", leaving);
      leaving();
    };
  }, []);
  return {
    text,
    state,
    change: (value: string) => {
      keepDraft(source.id, value, source.freeText);
      setText(value);
      setState((now) => (now === "saving" ? now : "idle"));
    },
    flush: () => void save(),
    finish: () => save(true),
  };
}

type Notes = ReturnType<typeof useNotes>;

function NotesPanel({
  source,
  notes,
  player,
  onPlay,
}: {
  readonly source: Source;
  readonly notes: Notes;
  readonly player: Player | null;
  readonly onPlay: (seconds: number) => void;
}) {
  const t = useT();
  const hintId = useId();
  const editor = useRef<WatchNotesHandle>(null);
  const videoId = videoIdOf(source.url);
  const canStamp = player !== null && player.state === "ready";
  const stamp = () => {
    const now = player?.now() ?? null;
    if (now !== null) editor.current?.stamp(now);
  };
  const mod = modKey();
  return (
    <Panel
      title={t.watch.notes}
      initial="rubric"
      meta={t.steps.words(notesWordCount(notes.text, videoIdOf(source.url)))}
    >
      <div className="panel__body margin__body">
        <p className="field__hint" id={hintId}>
          {t.watch.notesHint}
        </p>
        <WatchNotes
          ref={editor}
          initial={notes.text}
          videoId={videoId}
          label={t.watch.notes}
          describedBy={hintId}
          placeholder={t.watch.placeholder}
          onChange={notes.change}
          onBlur={notes.flush}
          onPlay={onPlay}
          onStampKey={stamp}
          onToggleKey={() => player?.toggle()}
        />
        <SaveLine state={notes.state} onRetry={notes.flush} />
      </div>
      <div className="panel__body margin__body watch__stamp-row">
        {player === null ? null : (
          <button
            type="button"
            className="button"
            disabled={!canStamp}
            onMouseDown={(event) => event.preventDefault()}
            onClick={stamp}
            aria-keyshortcuts={isMac() ? "Meta+Enter" : "Control+Enter"}
          >
            {canStamp ? t.watch.stamp(timestampText(player.time)) : t.watch.stampNoPlayer}
            <kbd className="key" aria-hidden="true">
              {mod}+↵
            </kbd>
          </button>
        )}
        <p className="field__hint">{player === null ? t.watch.openHint : t.watch.stampHint}</p>
      </div>
    </Panel>
  );
}

function Cues({
  cues,
  current,
  onPlay,
}: {
  readonly cues: ReadonlyArray<Cue>;
  readonly current: Cue | null;
  readonly onPlay: (seconds: number) => void;
}) {
  const t = useT();
  const headingId = useId();
  return (
    <nav className="cues" aria-labelledby={headingId}>
      <h2 className="cues__title" id={headingId}>
        {t.watch.cues}
      </h2>
      {cues.length === 0 ? (
        <p className="cues__empty">{t.watch.cuesEmpty}</p>
      ) : (
        <ol className="cues__list">
          {cues.map((cue) => {
            const here = cue === current;
            return (
              <li key={cue.at}>
                <button
                  type="button"
                  className="cues__item"
                  aria-current={here ? "time" : undefined}
                  aria-label={`${t.watch.playFrom(cue.label)}${cue.words === "" ? "" : `: ${cue.words}`}`}
                  onClick={() => onPlay(cue.seconds)}
                >
                  <span className="cues__time">{cue.label}</span>
                  <span className="cues__words" data-empty={cue.words === "" ? "" : undefined}>
                    {cue.words === "" ? t.watch.cueNoWords : cue.words}
                  </span>
                  {here ? <span className="sr-only">{t.watch.playing}</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}

function Screen({
  source,
  player,
  frame,
  videoId,
}: {
  readonly source: Source;
  readonly player: Player;
  readonly frame: (node: HTMLIFrameElement | null) => void;
  readonly videoId: string;
}) {
  const t = useT();
  const problem =
    player.state === "offline"
      ? t.watch.offline
      : player.state === "blocked"
        ? t.watch.blocked
        : player.state === "failed"
          ? t.watch.failed
          : null;
  return (
    <section className="watch__screen" aria-label={t.watch.player(source.title)}>
      <div className="watch__frame" data-state={player.state}>
        {player.src === null ? null : (
          // oxlint-disable-next-line react/iframe-missing-sandbox -- the player is on YouTube's own origin, so the browser already keeps its code out of Glose; a sandbox that kept it working would need allow-scripts with allow-same-origin, which undoes the sandbox.
          <iframe
            ref={frame}
            className="watch__player"
            src={player.src}
            title={t.watch.player(source.title)}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
        {player.state === "loading" ? (
          <p className="watch__status" role="status">
            {t.watch.loading}
          </p>
        ) : null}
        {problem === null ? null : (
          <div className="watch__problem" role="alert">
            <TriangleAlert className="watch__problem-icon" aria-hidden="true" />
            <p>{problem}</p>
            <a
              className="button"
              href={youtubeAt(videoId, player.time)}
              target="_blank"
              rel="noreferrer"
            >
              {t.watch.openOnYouTube}
              <ExternalLink className="button__icon" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function DoneWatching({
  notes,
  videoId,
}: {
  readonly notes: Notes;
  readonly videoId: string | null;
}) {
  const t = useT();
  const headingId = useId();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const stamps = cuesOf(notes.text, videoId).length;
  const words = notesWordCount(notes.text, videoId);
  const go = async () => {
    setBusy(true);
    const ok = await notes.finish();
    setBusy(false);
    setFailed(!ok);
  };
  return (
    <section className="done-reading done-watching" aria-labelledby={headingId}>
      <div className="done-reading__head">
        <h2 className="done-reading__title" id={headingId}>
          {t.watch.doneTitle}
        </h2>
        <p className="done-reading__summary">{t.watch.doneSummary(stamps, words)}</p>
      </div>
      <p className="done-watching__hint">{t.watch.doneHint}</p>
      {failed ? (
        <Notice tone="error" title={t.errors.storage}>
          <p>{t.errors.storageRecovery}</p>
        </Notice>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          className="button button--primary"
          disabled={busy}
          onClick={() => void go()}
        >
          {words === 0 && stamps === 0 ? t.watch.skip : t.watch.continue}
          <ArrowRight className="button__icon" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function Watch({
  source,
  sub,
  start,
}: {
  readonly source: Source;
  readonly sub: ReactNode;
  readonly start: number;
}) {
  const t = useT();
  const language = useLanguage();
  const videoId = videoIdOf(source.url);
  const player = useYouTubePlayer(videoId, start, language);
  const playAt = (seconds: number) => {
    if (player.state === "ready" || player.state === "loading") player.play(seconds);
    else if (videoId !== null) {
      window.open(youtubeAt(videoId, seconds), "_blank", "noopener,noreferrer");
    }
  };
  const notes = useNotes(source);
  const cues = cuesOf(notes.text, videoId);
  const current = player.state === "ready" ? cueAt(cues, player.time) : null;
  const watching = source.readingStep === "free-text";
  const mod = modKey();
  return (
    <Page
      title={source.title}
      sub={sub}
      fill
      flush
      actions={
        videoId === null ? undefined : (
          <a
            className="button button--quiet"
            href={youtubeAt(videoId, player.time)}
            target="_blank"
            rel="noreferrer"
          >
            {t.watch.openOnYouTube}
            <ExternalLink className="button__icon" aria-hidden="true" />
          </a>
        )
      }
    >
      <div className="watch">
        <div className="reader__band">
          <StepBar source={{ ...source, freeText: notes.text }} />
          <p className="reader__how">
            {t.watch.howTo} <span className="reader__keys">{t.watch.keys(mod)}</span>
          </p>
        </div>
        <div className="watch__desk">
          <div className="watch__column">
            {videoId === null ? (
              <Notice tone="warning">
                <p>{t.watch.noAddress}</p>
              </Notice>
            ) : (
              <Screen source={source} player={player} frame={player.frame} videoId={videoId} />
            )}
            <Cues cues={cues} current={current} onPlay={playAt} />
            {watching ? (
              <DoneWatching notes={notes} videoId={videoId} />
            ) : (
              <div className="reader__back">
                <Link
                  to="/sources/$sourceId"
                  params={{ sourceId: source.id }}
                  search={{}}
                  className="button"
                >
                  <ArrowLeft className="button__icon" aria-hidden="true" />
                  {t.watch.back}
                </Link>
              </div>
            )}
          </div>
          <aside className="watch__margin">
            <NotesPanel source={source} notes={notes} player={player} onPlay={playAt} />
          </aside>
        </div>
      </div>
    </Page>
  );
}

export function VideoNotes({ source }: { readonly source: Source }) {
  const navigate = useNavigate();
  const notes = useNotes(source);
  return (
    <NotesPanel
      source={source}
      notes={notes}
      player={null}
      onPlay={(seconds) =>
        void navigate({
          to: "/sources/$sourceId",
          params: { sourceId: source.id },
          search: { t: Math.floor(seconds) },
        })
      }
    />
  );
}
