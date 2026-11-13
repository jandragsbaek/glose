import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import { CardTrays } from "../components/CardTrays.tsx";
import { ReviewStart } from "../components/Review.tsx";
import { Page, Panel, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import { useT } from "../i18n/I18n.tsx";
import { cardsAtom } from "../state/cards.ts";

export const Route = createFileRoute("/recall")({ component: Section });

/** Recall as a desk: today's Review on top, the Cards in trays by the work they need under it. */
function Section() {
  const t = useT();
  const cards = useAtomValue(cardsAtom);
  const all = AsyncResult.isSuccess(cards) ? cards.value : [];
  const sub =
    all.length === 0
      ? undefined
      : t.recall.counts(all.length, all.filter((card) => card.ai).length);
  return (
    <Page title={t.recall.title} sub={sub}>
      <div className="recall">
        <Desk />
      </div>
    </Page>
  );
}

function Desk() {
  const t = useT();
  const cards = useAtomValue(cardsAtom);
  const refresh = useAtomRefresh(cardsAtom);
  return AsyncResult.matchWithError(cards, {
    onInitial: () => <SkeletonPanel />,
    onError: () => <StorageProblem onRetry={refresh} />,
    onDefect: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <div className="narrow">
          <Panel title={t.recall.title} initial="rubric">
            <div className="panel__body">
              <p className="empty">{t.recall.empty}</p>
            </div>
          </Panel>
        </div>
      ) : (
        <>
          <ReviewStart />
          <CardTrays cards={value} />
        </>
      ),
  });
}
