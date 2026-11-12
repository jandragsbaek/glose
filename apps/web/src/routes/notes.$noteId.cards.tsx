import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { type GraphNode, type GraphView, linkKey, type Session } from "@glose/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useRef, useState } from "react";

import { AiChecksOff, useJudgeShown } from "../components/CardChecks.tsx";
import { CardFields } from "../components/CardFields.tsx";
import { CardItem } from "../components/CardItem.tsx";
import { MissingLink, NoteText } from "../components/NoteText.tsx";
import { LiveSession, NeedsChatGpt, useChatGptReady } from "../components/Session.tsx";
import { Notice, Page, Panel, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import { useT } from "../i18n/I18n.tsx";
import { CARD_KEYS, cardsAtom, createCardAtom } from "../state/cards.ts";
import { graphAtom } from "../state/graph.ts";
import {
  cardExtractionSessionAtom,
  SESSION_KEYS,
  sendPassageAtom,
  startSessionAtom,
} from "../state/sessions.ts";

/** Card Extraction: Cards from one Note, proposed by the AI or written by the user. */
export const Route = createFileRoute("/notes/$noteId/cards")({ component: CardExtractionStage });

function CardExtractionStage() {
  const t = useT();
  const { noteId } = Route.useParams();
  const graph = useAtomValue(graphAtom);
  const refresh = useAtomRefresh(graphAtom);
  return AsyncResult.matchWithError(graph, {
    onInitial: () => (
      <Page title={t.cards.extraction}>
        <SkeletonPanel />
      </Page>
    ),
    onError: () => (
      <Page title={t.cards.extraction}>
        <StorageProblem onRetry={refresh} />
      </Page>
    ),
    onDefect: () => (
      <Page title={t.cards.extraction}>
        <StorageProblem onRetry={refresh} />
      </Page>
    ),
    onSuccess: ({ value }) => {
      // A wikilink names a file without regard to case, and so does this address.
      const note = value.nodes.find((node) => linkKey(node.id) === linkKey(noteId));
      return note === undefined ? (
        <Page title={t.errors.notFoundTitle}>
          <p className="empty">{t.cards.noteNotFound}</p>
          <p style={{ marginTop: 16 }}>
            <Link to="/graph" className="button">
              {t.cards.backToGraph}
            </Link>
          </p>
        </Page>
      ) : (
        <NotePage key={note.id} note={note} view={value} />
      );
    },
  });
}

function NotePage({ note, view }: { readonly note: GraphNode; readonly view: GraphView }) {
  const t = useT();
  const [passage, setPassage] = useState<string | null>(null);
  return (
    <Page
      title={note.title}
      sub={t.cards.extraction}
      actions={
        <Link to="/graph" search={{ node: note.id }} className="button">
          {t.cards.openInGraph}
        </Link>
      }
    >
      <div className="columns">
        <div className="stack">
          <NotePanel note={note} view={view} passage={passage} onPassage={setPassage} />
          <NoteCards note={note} />
        </div>
        <div className="stack">
          <CardSession note={note} passage={passage} onPassageSent={() => setPassage(null)} />
        </div>
      </div>
    </Page>
  );
}

/** The Note's text, where the user may select the passage to make Cards from. */
function NotePanel({
  note,
  view,
  passage,
  onPassage,
}: {
  readonly note: GraphNode;
  readonly view: GraphView;
  readonly passage: string | null;
  readonly onPassage: (passage: string | null) => void;
}) {
  const t = useT();
  const text = useRef<HTMLDivElement>(null);
  const [noSelection, setNoSelection] = useState(false);
  const byKey = new Map(view.nodes.map((node) => [linkKey(node.id), node]));

  const takeSelection = () => {
    const selection = window.getSelection();
    const inside = (node: Node | null | undefined) =>
      node !== null && node !== undefined && text.current?.contains(node) === true;
    const chosen =
      selection !== null && inside(selection.anchorNode) && inside(selection.focusNode)
        ? selection.toString().trim()
        : "";
    setNoSelection(chosen === "");
    if (chosen !== "") onPassage(chosen);
  };

  return (
    <Panel title={note.kind === "source" ? t.graph.source : t.graph.note} initial="rubric">
      <div className="panel__body" ref={text}>
        <NoteText
          markdown={note.body}
          // A Note marked only for its AI title holds no AI text in its body.
          aiText={note.aiText && !note.aiTitle}
          renderLink={(part) => {
            const target = byKey.get(linkKey(part.target));
            return target === undefined ? (
              <MissingLink key={part.at} name={part.target} label={part.label} />
            ) : (
              <Link key={part.at} to="/graph" search={{ node: target.id }}>
                {part.label}
              </Link>
            );
          }}
        />
      </div>
      <div className="panel__body stack">
        <h3 className="subhead">{t.cards.passage}</h3>
        {passage === null ? (
          <p className="field__hint">{t.cards.passageHint}</p>
        ) : (
          <blockquote>{passage}</blockquote>
        )}
        {noSelection ? (
          <p className="field__hint" role="status">
            {t.cards.noSelection}
          </p>
        ) : null}
        <div className="button-row">
          <button type="button" className="button" onClick={takeSelection}>
            {t.cards.useSelection}
          </button>
          {passage === null ? null : (
            <button type="button" className="button" onClick={() => onPassage(null)}>
              {t.cards.clearPassage}
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}

/** The Cards already made from this Note, and a form to write one in the user's own words. */
function NoteCards({ note }: { readonly note: GraphNode }) {
  const t = useT();
  const cards = useAtomValue(cardsAtom);
  const refresh = useAtomRefresh(cardsAtom);
  const create = useAtomSet(createCardAtom, { mode: "promiseExit" });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const fromNote = AsyncResult.getOrElse(
    AsyncResult.map(cards, (all) =>
      all.filter((card) => card.from !== null && linkKey(card.from) === linkKey(note.id)),
    ),
    () => [],
  );
  useJudgeShown(fromNote);

  const write = async (text: { readonly question: string; readonly answer: string }) => {
    setBusy(true);
    const exit = await create({
      payload: { from: note.id, ...text },
      reactivityKeys: CARD_KEYS.cards,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
    return Exit.isSuccess(exit);
  };

  return (
    <Panel title={t.cards.title} initial="lapis" meta={t.cards.fromNote(fromNote.length)}>
      {AsyncResult.isFailure(cards) ? (
        <div className="panel__body">
          <StorageProblem onRetry={refresh} />
        </div>
      ) : fromNote.length === 0 ? null : (
        <div className="panel__body stack">
          <AiChecksOff scores={fromNote.map((card) => card.score)} />
          <ul className="stack">
            {fromNote.map((card) => (
              <li key={card.file}>
                <CardItem card={card} showFrom={false} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="panel__body stack">
        <h3 className="subhead">{t.cards.write}</h3>
        <p className="field__hint">{t.cards.writeHint}</p>
        <CardFields
          initial={{ question: "", answer: "" }}
          submitLabel={t.cards.add}
          busy={busy}
          onSubmit={write}
        />
        {failed ? (
          <Notice tone="error">
            <p>{t.cards.saveFailed}</p>
          </Notice>
        ) : null}
      </div>
    </Panel>
  );
}

function CardSession({
  note,
  passage,
  onPassageSent,
}: {
  readonly note: GraphNode;
  readonly passage: string | null;
  readonly onPassageSent: () => void;
}) {
  const t = useT();
  const found = useAtomValue(cardExtractionSessionAtom(note.id));
  const refresh = useAtomRefresh(cardExtractionSessionAtom(note.id));
  return AsyncResult.matchWithError(found, {
    onInitial: () => <SkeletonPanel />,
    onError: () => <SessionProblem onRetry={refresh} />,
    onDefect: () => <SessionProblem onRetry={refresh} />,
    onSuccess: ({ value }) =>
      value === null ? (
        <StartCardExtraction note={note} passage={passage} onPassageSent={onPassageSent} />
      ) : (
        <LiveSession
          id={value.id}
          title={t.cards.extraction}
          initial="lapis"
          renderControls={(session) =>
            passage === null ? null : (
              <SendPassage session={session} passage={passage} onSent={onPassageSent} />
            )
          }
        />
      ),
  });
}

function SessionProblem({ onRetry }: { readonly onRetry: () => void }) {
  const t = useT();
  return (
    <Panel title={t.cards.extraction} initial="lapis">
      <div className="panel__body">
        <StorageProblem onRetry={onRetry} />
      </div>
    </Panel>
  );
}

function StartCardExtraction({
  note,
  passage,
  onPassageSent,
}: {
  readonly note: GraphNode;
  readonly passage: string | null;
  readonly onPassageSent: () => void;
}) {
  const t = useT();
  const ready = useChatGptReady();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const start = useAtomSet(startSessionAtom, { mode: "promiseExit" });

  const begin = async (from: string | null) => {
    setBusy(true);
    const exit = await start({
      payload: {
        kind: "card-extraction",
        subject: note.id,
        ...(from === null ? {} : { passage: from }),
      },
      reactivityKeys: SESSION_KEYS.sessions,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit) && from !== null) onPassageSent();
  };

  return (
    <Panel title={t.cards.extraction} initial="lapis">
      <div className="panel__body stack">
        {ready ? (
          <>
            <p className="field__hint">{t.cards.startHint}</p>
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
                onClick={() => begin(null)}
              >
                {t.cards.start}
              </button>
              {passage === null ? null : (
                <button
                  type="button"
                  className="button button--primary"
                  disabled={busy}
                  onClick={() => begin(passage)}
                >
                  {t.cards.startPassage}
                </button>
              )}
            </div>
          </>
        ) : (
          <NeedsChatGpt title={t.cards.needsChatGpt} body={t.cards.needsChatGptBody} />
        )}
      </div>
    </Panel>
  );
}

/** In a running Session, the passage the user chose goes to the AI as its own request. */
function SendPassage({
  session,
  passage,
  onSent,
}: {
  readonly session: Session;
  readonly passage: string;
  readonly onSent: () => void;
}) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const send = useAtomSet(sendPassageAtom, { mode: "promiseExit" });
  return (
    <div className="stack">
      <div className="button-row">
        <button
          type="button"
          className="button button--primary"
          disabled={session.working}
          onClick={async () => {
            const exit = await send({ payload: { id: session.id, passage } });
            setFailed(Exit.isFailure(exit));
            if (Exit.isSuccess(exit)) onSent();
          }}
        >
          {t.cards.sendPassage}
        </button>
      </div>
      {failed ? (
        <Notice tone="error">
          <p>{t.session.sendFailed}</p>
        </Notice>
      ) : null}
    </div>
  );
}
