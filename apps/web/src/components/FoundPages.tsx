import { useAtomSet } from "@effect/atom-react";
import { type FoundPage, pageAuthorship } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { Check, ExternalLink } from "lucide-react";
import { useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { dropPageAtom, keepPageAtom } from "../state/research.ts";
import { CallNumber, Notice } from "./ui.tsx";

export function FoundPages({
  sessionId,
  pages,
}: {
  readonly sessionId: string;
  readonly pages: ReadonlyArray<FoundPage>;
}) {
  const t = useT();
  return (
    <div className="stack">
      <p className="turn__note">{t.research.pagesProposed(pages.length)}</p>
      <ol className="found" aria-label={t.research.pagesProposed(pages.length)}>
        {pages.map((page) => (
          <li key={page.id}>
            <PageSlip sessionId={sessionId} page={page} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function PageSlip({ sessionId, page }: { readonly sessionId: string; readonly page: FoundPage }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const keep = useAtomSet(keepPageAtom, { mode: "promiseExit" });
  const drop = useAtomSet(dropPageAtom, { mode: "promiseExit" });
  const decide = async (run: typeof keep) => {
    setBusy(true);
    const exit = await run({ payload: { id: sessionId, page: page.id } });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };
  const authorship = pageAuthorship(page);
  const meta = [
    page.author,
    authorship.site,
    authorship.firstPublished === null ? null : String(authorship.firstPublished),
    t.research.kinds[page.articleType],
  ].filter((part) => part !== null);
  const [quote] = page.quotes;

  return (
    <article className="found__slip" data-state={page.state} data-stance={page.stance}>
      <header className="found__head">
        <CallNumber source={authorship} />
        <h4 className="found__title">
          <a href={page.url} target="_blank" rel="noreferrer">
            {page.title}
            <ExternalLink className="found__out" aria-label={t.research.openPage} />
          </a>
        </h4>
      </header>
      <p className="found__meta">{meta.join(" · ")}</p>
      {quote === undefined ? null : (
        <blockquote className="found__quote">
          {quote.text} <span className="found__para">{t.newNote.paragraph(quote.paragraph)}</span>
        </blockquote>
      )}
      {page.quotes.length > 1 ? (
        <p className="found__more">{t.research.moreQuotes(page.quotes.length - 1)}</p>
      ) : null}
      <p className="found__why">{page.why}</p>
      <div className="found__foot">
        <span className="found__stance">{t.research.stances[page.stance]}</span>
        {page.source === null ? null : (
          <span className="found__have">
            <Check className="found__have-icon" aria-hidden="true" />
            {t.research.youHave}
          </span>
        )}
        <span className="found__acts">
          {page.state === "kept" ? (
            <>
              <span className="found__kept">
                <Check className="found__have-icon" aria-hidden="true" />
                {t.research.kept}
              </span>
              <button
                type="button"
                className="button button--quiet button--small"
                disabled={busy}
                onClick={() => void decide(drop)}
              >
                {t.research.unkeep}
              </button>
            </>
          ) : page.state === "dropped" ? (
            <>
              <span className="found__dropped">{t.research.dropped}</span>
              <button
                type="button"
                className="button button--quiet button--small"
                disabled={busy}
                onClick={() => void decide(keep)}
              >
                {t.research.keepAgain}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button button--small"
                disabled={busy}
                onClick={() => void decide(keep)}
              >
                {t.research.keep}
              </button>
              <button
                type="button"
                className="button button--quiet button--small"
                disabled={busy}
                onClick={() => void decide(drop)}
              >
                {t.research.drop}
              </button>
            </>
          )}
        </span>
      </div>
      {failed ? (
        <Notice tone="error">
          <p>{t.research.decideFailed}</p>
        </Notice>
      ) : null}
    </article>
  );
}
