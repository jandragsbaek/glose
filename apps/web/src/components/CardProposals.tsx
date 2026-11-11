import { useAtomSet } from "@effect/atom-react";
import type { CardProposal } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { CARD_KEYS } from "../state/cards.ts";
import { dropProposalAtom, keepProposalAtom } from "../state/sessions.ts";
import { AiChecksOff, CardChecks } from "./CardChecks.tsx";
import { CardFields } from "./CardFields.tsx";
import { AiText } from "./NoteText.tsx";
import { Notice } from "./ui.tsx";

/** The Cards the AI proposed in one turn. Each is a Card only once the user keeps it. */
export function CardProposals({
  sessionId,
  proposals,
}: {
  readonly sessionId: string;
  readonly proposals: ReadonlyArray<CardProposal>;
}) {
  const t = useT();
  return (
    <div className="stack">
      <AiChecksOff
        scores={proposals.filter(({ state }) => state === "open").map(({ score }) => score)}
      />
      <ol className="stack" aria-label={t.cards.proposals}>
        {proposals.map((proposal) => (
          <li key={proposal.id}>
            <Proposal sessionId={sessionId} proposal={proposal} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Proposal({
  sessionId,
  proposal,
}: {
  readonly sessionId: string;
  readonly proposal: CardProposal;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const keep = useAtomSet(keepProposalAtom, { mode: "promiseExit" });
  const drop = useAtomSet(dropProposalAtom, { mode: "promiseExit" });

  const decide = async (run: () => Promise<Exit.Exit<unknown, unknown>>) => {
    setBusy(true);
    const exit = await run();
    setBusy(false);
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) setEditing(false);
  };
  const keepAs = (text: { readonly question: string; readonly answer: string }) =>
    decide(() =>
      keep({
        payload: {
          id: sessionId,
          proposal: proposal.id,
          question: text.question,
          answer: text.answer,
        },
        reactivityKeys: CARD_KEYS.cards,
      }),
    );

  return (
    <article className="card" data-state={proposal.state}>
      <p className="field__hint">{t.cards.states[proposal.state]}</p>
      {editing ? (
        <CardFields
          initial={proposal}
          submitLabel={t.cards.keep}
          busy={busy}
          onSubmit={keepAs}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <AiText scope="card">
            <p>
              <strong>{proposal.question}</strong>
            </p>
            {proposal.answer === "" ? null : <p>{proposal.answer}</p>}
          </AiText>
          {proposal.state === "open" && proposal.score !== undefined ? (
            <CardChecks score={proposal.score} />
          ) : null}
          {proposal.state === "open" ? (
            <div className="button-row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="button button--primary"
                disabled={busy}
                onClick={() => keepAs(proposal)}
              >
                {t.cards.keep}
              </button>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                {t.cards.edit}
              </button>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() =>
                  decide(() => drop({ payload: { id: sessionId, proposal: proposal.id } }))
                }
              >
                {t.cards.drop}
              </button>
            </div>
          ) : null}
        </>
      )}
      {failed ? (
        <Notice tone="error">
          <p>{t.cards.keepFailed}</p>
        </Notice>
      ) : null}
    </article>
  );
}
