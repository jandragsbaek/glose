import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { Card } from "@glose/contracts";
import { createFileRoute } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useId, useState } from "react";

import { CardItem } from "../components/CardItem.tsx";
import { Page, Panel, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import { useT } from "../i18n/I18n.tsx";
import { cardsAtom } from "../state/cards.ts";

export const Route = createFileRoute("/recall")({ component: Section });

function Section() {
  const t = useT();
  return (
    <Page title={t.recall.title}>
      <div className="narrow">
        <AllCards />
      </div>
    </Page>
  );
}

function AllCards() {
  const t = useT();
  const cards = useAtomValue(cardsAtom);
  const refresh = useAtomRefresh(cardsAtom);
  return AsyncResult.matchWithError(cards, {
    onInitial: () => <SkeletonPanel />,
    onError: () => <StorageProblem onRetry={refresh} />,
    onDefect: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <Panel title={t.recall.title} initial="rubric">
          <div className="panel__body">
            <p className="empty">{t.recall.empty}</p>
          </div>
        </Panel>
      ) : (
        <CardList cards={value} />
      ),
  });
}

/** A page of Cards at a time: there may be thousands. */
const PAGE = 50;

function CardList({ cards }: { readonly cards: ReadonlyArray<Card> }) {
  const t = useT();
  const findId = useId();
  const [query, setQuery] = useState("");
  const [onlyAi, setOnlyAi] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const needle = query.trim().toLocaleLowerCase();
  const matching = cards.filter(
    (card) =>
      (!onlyAi || card.ai) &&
      (needle === "" ||
        [card.question, card.answer, card.from ?? ""].some((text) =>
          text.toLocaleLowerCase().includes(needle),
        )),
  );
  const shown = matching.slice(0, limit);
  const ai = cards.filter((card) => card.ai).length;

  return (
    <Panel title={t.recall.title} initial="rubric" meta={t.recall.counts(cards.length, ai)}>
      <div className="panel__body stack">
        <p className="field__hint">{t.recall.reviewLater}</p>
        <form role="search" className="stack" onSubmit={(event) => event.preventDefault()}>
          <div className="field">
            <label className="field__label" htmlFor={findId}>
              {t.recall.findLabel}
            </label>
            <input
              id={findId}
              className="input"
              type="search"
              value={query}
              placeholder={t.recall.findPlaceholder}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(PAGE);
              }}
            />
          </div>
          {ai === 0 && !onlyAi ? null : (
            <label>
              <input
                type="checkbox"
                checked={onlyAi}
                onChange={(event) => {
                  setOnlyAi(event.target.checked);
                  setLimit(PAGE);
                }}
              />{" "}
              {t.recall.onlyAi}
            </label>
          )}
        </form>
      </div>
      <div className="panel__body stack">
        {matching.length === 0 ? (
          <p className="empty">{t.recall.nothingFound}</p>
        ) : (
          <>
            <ul className="stack">
              {shown.map((card) => (
                <li key={card.file}>
                  <CardItem card={card} />
                </li>
              ))}
            </ul>
            {matching.length > shown.length ? (
              <div className="button-row">
                <span className="status" role="status">
                  {t.recall.shown(shown.length, matching.length)}
                </span>
                <button type="button" className="button" onClick={() => setLimit(limit + PAGE)}>
                  {t.recall.showMore}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Panel>
  );
}
