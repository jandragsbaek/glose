import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import type { Check, Grade, ScoredCard } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { CircleAlert, Search, TriangleAlert } from "lucide-react";
import { type CSSProperties, type ReactNode, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { cardsAtom, clearAiMarkAtom } from "../state/cards.ts";
import { AiChecksOff, useJudgeShown } from "./CardChecks.tsx";
import { CardItem } from "./CardItem.tsx";
import { AiText } from "./NoteText.tsx";
import { Flourish } from "./ui.tsx";

/** The trays, by the work their Cards need. */
type TrayId = "fix" | "ai" | "good";

/** A tray shows this many Cards at a time: there may be thousands. */
const PAGE = 50;

const FIRST: Record<TrayId, number> = { fix: PAGE, ai: PAGE, good: PAGE };

/** A Card's tray. A Check that warns or fails comes first: fixing a Card rewrites its AI text. */
const trayOf = (card: ScoredCard): TrayId =>
  card.score.grade !== "good" ? "fix" : card.ai ? "ai" : "good";

/** The lift and the closing of its slot (200ms each, the close starting at 160ms). */
const LEAVE_MS = 380;

const motionDone = () =>
  new Promise<void>((done) =>
    setTimeout(done, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : LEAVE_MS),
  );

/** In To fix, the Cards that need work come before those that could be better. */
const GRADE_ORDER: Record<Grade, number> = { poor: 0, fix: 1, good: 2 };

/** The Checks that warn or fail, failures first: they make the Grade poor. */
const faultsOf = (card: ScoredCard): ReadonlyArray<Check> =>
  card.score.checks
    .filter((check) => check.verdict !== "pass")
    .toSorted((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === "fail" ? -1 : 1));

/**
 * Every Card, sorted into trays by the work it needs: To fix, AI text to rewrite, and Good,
 * which stays folded until it is asked for or a search reaches into it. A Card opens in a sheet.
 */
export function CardTrays({ cards }: { readonly cards: ReadonlyArray<ScoredCard> }) {
  const t = useT();
  const findId = useId();
  const [query, setQuery] = useState("");
  const [limits, setLimits] = useState(FIRST);
  const [goodOpen, setGoodOpen] = useState(false);
  const [openFile, setOpenFile] = useState<string | null>(null);

  const needle = query.trim().toLocaleLowerCase();
  const searching = needle !== "";
  const matching = searching
    ? cards.filter((card) =>
        [card.question, card.answer, card.from ?? ""].some((text) =>
          text.toLocaleLowerCase().includes(needle),
        ),
      )
    : cards;
  const trays: Record<TrayId, Array<ScoredCard>> = { fix: [], ai: [], good: [] };
  for (const card of matching) trays[trayOf(card)].push(card);
  const toFix = trays.fix.toSorted(
    (a, b) => GRADE_ORDER[a.score.grade] - GRADE_ORDER[b.score.grade],
  );
  const goodShown = goodOpen || searching;
  const shown: Record<TrayId, ReadonlyArray<ScoredCard>> = {
    fix: toFix.slice(0, limits.fix),
    ai: trays.ai.slice(0, limits.ai),
    good: goodShown ? trays.good.slice(0, limits.good) : [],
  };
  const onScreen = [...shown.fix, ...shown.ai, ...shown.good];
  useJudgeShown(onScreen);

  // The open Card is read from the list, so the sheet shows each change; deleted, it closes.
  const open = openFile === null ? undefined : cards.find((card) => card.file === openFile);
  const more = (tray: TrayId) => setLimits({ ...limits, [tray]: limits[tray] + PAGE });

  return (
    <div className="card-desk">
      <form role="search" className="card-desk__find" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor={findId}>
          {t.recall.findLabel}
        </label>
        <span className="register-tools__find">
          <Search className="register-tools__icon" aria-hidden="true" />
          <input
            id={findId}
            className="input"
            type="search"
            value={query}
            placeholder={t.recall.findLabel}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimits(FIRST);
            }}
          />
        </span>
        <p className="status" role="status">
          {searching ? t.recall.matches(matching.length) : null}
        </p>
        <AiChecksOff scores={onScreen.map((card) => card.score)} />
      </form>
      {searching && matching.length === 0 ? (
        <p className="empty">
          {t.recall.nothingFound}{" "}
          <button type="button" className="link-button" onClick={() => setQuery("")}>
            {t.recall.clearSearch}
          </button>
        </p>
      ) : (
        <div className="trays">
          <Tray title={t.recall.trays.fix} initial="rubric" total={toFix.length}>
            {toFix.length === 0 ? (
              <TrayEmpty
                lead={searching ? null : t.recall.fixEmptyTitle}
                body={searching ? t.recall.nothingFound : t.recall.fixEmpty}
              />
            ) : (
              <Slips
                cards={shown.fix}
                total={toFix.length}
                onOpen={setOpenFile}
                onMore={() => more("fix")}
              />
            )}
          </Tray>
          <Tray title={t.recall.trays.ai} initial="lapis" total={trays.ai.length}>
            {trays.ai.length === 0 ? (
              <TrayEmpty
                lead={searching ? null : t.recall.aiEmptyTitle}
                body={searching ? t.recall.nothingFound : t.recall.aiEmpty}
              />
            ) : (
              <Slips
                cards={shown.ai}
                total={trays.ai.length}
                onOpen={setOpenFile}
                onMore={() => more("ai")}
                rewrite
              />
            )}
          </Tray>
          <Tray
            title={t.recall.trays.good}
            initial="rubric"
            total={trays.good.length}
            action={
              goodOpen && !searching && trays.good.length > 0 ? (
                <button
                  type="button"
                  className="button button--quiet button--small"
                  onClick={() => {
                    setGoodOpen(false);
                    setLimits({ ...limits, good: PAGE });
                  }}
                >
                  {t.recall.foldGood}
                </button>
              ) : undefined
            }
          >
            {trays.good.length === 0 ? (
              <TrayEmpty
                lead={null}
                body={searching ? t.recall.nothingFound : t.recall.goodEmpty}
              />
            ) : goodShown ? (
              <Slips
                cards={shown.good}
                total={trays.good.length}
                onOpen={setOpenFile}
                onMore={() => more("good")}
              />
            ) : (
              <div className="tray__pile">
                <div className="tray__folded">
                  <p className="empty empty--lead">{t.recall.goodFolded(trays.good.length)}</p>
                  <p className="empty">{t.recall.goodFoldedBody}</p>
                  <button type="button" className="button" onClick={() => setGoodOpen(true)}>
                    {t.recall.showGood}
                  </button>
                </div>
                {/* The good Cards lie under it as paper edges, as the Review's leaves do. */}
                {Array.from({ length: Math.min(2, trays.good.length - 1) }, (_, index) => (
                  <span
                    key={`edge-${index + 1}`}
                    className="review__edge"
                    style={{ "--depth": index + 1 } as CSSProperties}
                    aria-hidden="true"
                  />
                ))}
              </div>
            )}
          </Tray>
        </div>
      )}
      {open === undefined ? null : <CardSheet card={open} onClose={() => setOpenFile(null)} />}
    </div>
  );
}

function Tray({
  title,
  initial,
  total,
  action,
  children,
}: {
  readonly title: string;
  readonly initial: "rubric" | "lapis";
  readonly total: number;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useT();
  const headingId = useId();
  return (
    <section className="tray" data-initial={initial} aria-labelledby={headingId}>
      <div className="tray__head">
        <h2 className="panel__title" id={headingId}>
          {title}
        </h2>
        <span className="tray__count">{t.recall.cardCount(total)}</span>
        {action}
      </div>
      {children}
    </section>
  );
}

function TrayEmpty({ lead, body }: { readonly lead: string | null; readonly body: string }) {
  return (
    <div className="tray__empty">
      {lead === null ? null : <p className="empty empty--lead">{lead}</p>}
      <p className="empty">{body}</p>
    </div>
  );
}

function Slips({
  cards,
  total,
  onOpen,
  onMore,
  rewrite = false,
}: {
  readonly cards: ReadonlyArray<ScoredCard>;
  readonly total: number;
  readonly onOpen: (file: string) => void;
  readonly onMore: () => void;
  /** The slips offer "I rewrote it": the tray of AI text. */
  readonly rewrite?: boolean;
}) {
  const t = useT();
  return (
    <>
      <ul className="tray__slips">
        {cards.map((card) => (
          <li key={card.file} className="tray__slot">
            <Slip card={card} onOpen={onOpen} rewrite={rewrite} />
          </li>
        ))}
      </ul>
      {total > cards.length ? (
        <div className="tray__more">
          <span className="status">{t.recall.shown(cards.length, total)}</span>
          <button type="button" className="button button--small" onClick={onMore}>
            {t.recall.showMore}
          </button>
        </div>
      ) : null}
    </>
  );
}

/**
 * One Card as a slip in its tray: the question opens it, the answer under it, and the first
 * Check that fails or warns, in words. In the tray of AI text, "I rewrote it" lifts the slip
 * out of the tray.
 */
function Slip({
  card,
  onOpen,
  rewrite,
}: {
  readonly card: ScoredCard;
  readonly onOpen: (file: string) => void;
  readonly rewrite: boolean;
}) {
  const t = useT();
  const clearAiMark = useAtomSet(clearAiMarkAtom, { mode: "promiseExit" });
  const refresh = useAtomRefresh(cardsAtom);
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const faults = faultsOf(card);
  const first = faults[0];

  const rewrote = async () => {
    setFailed(false);
    setLeaving(true);
    // The list reads again only once the slip has left, so the motion is not cut short.
    const [exit] = await Promise.all([clearAiMark({ payload: { file: card.file } }), motionDone()]);
    if (Exit.isFailure(exit)) {
      setLeaving(false);
      setFailed(true);
    } else {
      refresh();
    }
  };

  const words = (
    <>
      <h3 className="slip__question">
        <button
          type="button"
          className="slip__open"
          aria-haspopup="dialog"
          onClick={() => onOpen(card.file)}
        >
          {card.question}
        </button>
      </h3>
      {card.answer === "" ? null : <p className="slip__answer">{card.answer}</p>}
    </>
  );

  return (
    <article className={leaving ? "slip slip--leaving" : "slip"} aria-busy={leaving}>
      {card.ai ? (
        <AiText
          scope="card"
          action={
            rewrite ? (
              <button
                type="button"
                className="link-button slip__action"
                title={t.cards.rewroteHint}
                disabled={leaving}
                onClick={rewrote}
              >
                {t.cards.rewrote}
              </button>
            ) : undefined
          }
        >
          {words}
        </AiText>
      ) : (
        words
      )}
      {first === undefined ? null : (
        <p className="slip__fault" data-verdict={first.verdict}>
          <TriangleAlert className="slip__icon" aria-hidden="true" />
          <span>
            {t.score.grades[card.score.grade]} · {t.score.checks[first.id].name}
            {faults.length > 1 ? (
              <>
                {" · "}
                <span className="slip__more">{t.recall.moreFaults(faults.length - 1)}</span>
              </>
            ) : null}
          </span>
        </p>
      )}
      {failed ? (
        <p className="slip__error" role="alert">
          <CircleAlert className="slip__icon" aria-hidden="true" />
          <span>{t.cards.saveFailed}</span>
        </p>
      ) : null}
    </article>
  );
}

/** A Card open on its own leaf over the trays: its words, its Checks, and what to do with it. */
function CardSheet({ card, onClose }: { readonly card: ScoredCard; readonly onClose: () => void }) {
  const t = useT();
  const titleId = useId();
  return (
    <dialog
      className="sheet"
      aria-labelledby={titleId}
      tabIndex={-1}
      ref={(node) => {
        if (node && !node.open) {
          node.showModal();
          // The leaf takes focus, so the first thing read is the Card, not its first link.
          node.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="panel" data-initial="rubric">
        <div className="panel__head">
          <h2 className="panel__title" id={titleId}>
            {t.recall.card}
          </h2>
        </div>
        <div className="panel__rule" aria-hidden="true">
          <Flourish />
        </div>
        <div className="panel__body">
          <CardItem
            card={card}
            close={
              <button
                type="button"
                className="button button--quiet sheet__cancel"
                aria-keyshortcuts="Escape"
                onClick={onClose}
              >
                {t.recall.close}
              </button>
            }
          />
        </div>
      </div>
    </dialog>
  );
}
