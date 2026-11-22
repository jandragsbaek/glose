import { useAtomSet } from "@effect/atom-react";
import { type GraphNode, type GraphView, linkKey, type Source } from "@glose/contracts";
import { Link, useNavigate } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

import { noteSegments } from "../graph/noteEdit.ts";
import { useT } from "../i18n/I18n.tsx";
import { savePersonWordsAtom } from "../state/vault.ts";
import { draftOf, keepDraft, restoreDraft, saveNotes } from "../state/watchNotes.ts";
import { NoteEditor } from "./NoteEditor.tsx";
import { NoteText, type WikilinkPart } from "./NoteText.tsx";
import { Notice, Panel } from "./ui.tsx";
import { isMac } from "./WritingDeskBar.tsx";

const SAVE_AFTER_MS = 700;

const asWritten = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/^(?:[ \t]*\n)+/, "")
    .trimEnd();

type SaveState = "idle" | "saving" | "saved" | "failed";

export function PersonWords({
  person,
  view,
  sources,
  renderLink,
}: {
  readonly person: GraphNode;
  readonly view: GraphView;
  readonly sources: ReadonlyArray<Source>;
  readonly renderLink: (part: WikilinkPart) => ReactNode;
}) {
  const t = useT();
  const [state, setState] = useState<SaveState>("idle");
  const wholeAi = person.aiText && !person.aiTitle;
  const aiWords = noteSegments(person.body, wholeAi).some((segment) => segment.kind === "ai");
  return (
    <Panel
      title={t.people.words}
      initial="rubric"
      meta={
        state === "saving" || state === "saved" ? (
          <span>{state === "saving" ? t.people.saving : t.people.saved}</span>
        ) : undefined
      }
    >
      <div className="panel__body">
        {aiWords ? (
          <>
            <NoteText markdown={person.body} aiText={wholeAi} renderLink={renderLink} />
            <Notice tone="info" title={t.people.aiWords}>
              <p>
                <Link to="/graph" search={{ node: person.id, rewrite: true }} className="button">
                  {t.people.rewrite}
                </Link>
              </p>
            </Notice>
          </>
        ) : (
          <OwnWords person={person} view={view} sources={sources} onState={setState} />
        )}
      </div>
    </Panel>
  );
}

function OwnWords({
  person,
  view,
  sources,
  onState,
}: {
  readonly person: GraphNode;
  readonly view: GraphView;
  readonly sources: ReadonlyArray<Source>;
  readonly onState: (state: SaveState) => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const save = useAtomSet(savePersonWordsAtom, { mode: "promiseExit" });
  const key = `person:${person.id}`;
  const [body, setBody] = useState(() => restoreDraft(key, person.body) ?? person.body);
  const [failed, setFailed] = useState(false);

  const write = () => {
    if (draftOf(key) === undefined) return;
    onState("saving");
    void saveNotes(key, async (text) => {
      const exit = await save({
        id: person.id,
        title: person.title,
        aiTitle: person.aiTitle,
        page: null,
        body: text,
        aiNote: false,
      });
      return Exit.isSuccess(exit) ? 1 : false;
    }).then((ok) => {
      setFailed(!ok);
      onState(!ok ? "failed" : draftOf(key) === undefined ? "saved" : "idle");
    });
  };

  const change = (text: string) => {
    keepDraft(key, asWritten(text), person.body);
    setBody(text);
    onState("idle");
  };

  const latest = useRef(write);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: the save timer and the closing page use the newest save.
  useLayoutEffect(() => {
    latest.current = write;
  });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a timer, not state: the words are written to the Person's file when the user pauses.
  useEffect(() => {
    if (draftOf(key) !== asWritten(body)) return;
    const timer = window.setTimeout(() => latest.current(), SAVE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [body, key]);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a save, not state: the words are written when the page closes or the window is hidden; the draft keeps them until then.
  useEffect(() => {
    const flush = () => latest.current();
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const follow = (target: string) => {
    const node = view.nodes.find((other) => linkKey(other.id) === linkKey(target));
    if (node === undefined) return false;
    if (node.kind === "person") {
      void navigate({ to: "/people/$personName", params: { personName: node.id }, search: {} });
    } else {
      void navigate({ to: "/graph", search: { node: node.id } });
    }
    return true;
  };

  return (
    <>
      <NoteEditor
        initial={body}
        self={person.id}
        autoFocus={body.trim() === ""}
        label={t.people.wordsLabel(person.title)}
        placeholder={t.people.wordsPlaceholder(person.title)}
        nodes={view.nodes}
        sources={sources}
        onChange={change}
        onBlur={() => latest.current()}
        onFollow={follow}
      />
      <p className="field__hint">{t.people.linkHint(isMac() ? "⌘" : "Ctrl")}</p>
      {failed ? (
        <p className="field__error" role="alert">
          {t.people.saveFailed}
        </p>
      ) : null}
    </>
  );
}
