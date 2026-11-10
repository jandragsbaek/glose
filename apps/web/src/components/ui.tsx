import type { Source } from "@glose/contracts";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { type ReactNode, useId } from "react";

import { callNumber, MISSING_YEAR } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";

export function Page({
  title,
  sub,
  actions,
  children,
}: {
  readonly title: string;
  readonly sub?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <>
      <header className="page-head">
        <h1>{title}</h1>
        {sub === undefined ? null : <span className="page-head__sub">{sub}</span>}
        {actions === undefined ? null : <div className="page-head__actions">{actions}</div>}
      </header>
      <div className="page-body">{children}</div>
    </>
  );
}

/** A pen flourish under a panel heading, drawn once in rubric red. */
export function Flourish() {
  return (
    <svg className="flourish" viewBox="0 0 64 10" aria-hidden="true" focusable="false">
      <path
        d="M2 6.5c8 0 12-3 20-3 4 0 6 2.2 10 2.2s6-4.2 10-4.2c8 0 12 5 20 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="5.7" r="1.3" fill="currentColor" />
    </svg>
  );
}

/**
 * Panel headings open with a decorated initial, alternating rubric and lapis down a page.
 * The initial is CSS (::first-letter), so the heading text stays whole for screen readers.
 */
export function Panel({
  title,
  initial,
  meta,
  children,
}: {
  readonly title: string;
  readonly initial: "rubric" | "lapis";
  readonly meta?: ReactNode;
  readonly children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section className="panel" data-initial={initial} aria-labelledby={headingId}>
      <div className="panel__head">
        <h2 className="panel__title" id={headingId}>
          {title}
        </h2>
        {meta === undefined ? null : <span className="panel__meta">{meta}</span>}
      </div>
      <div className="panel__rule" aria-hidden="true">
        <Flourish />
      </div>
      {children}
    </section>
  );
}

export function CallNumber({
  source,
}: {
  readonly source: Pick<Source, "familyName" | "firstPublished">;
}) {
  const t = useT();
  const label = callNumber(source);
  const missing = label.endsWith(MISSING_YEAR);
  return (
    <span
      className={missing ? "call call--missing" : "call"}
      aria-label={t.source.callNumberLabel(label)}
    >
      {missing ? <TriangleAlert className="call__icon" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

/** A Source's spine: lapis with gilt bands, the call number set vertically. */
export function Spine({
  source,
}: {
  readonly source: Pick<Source, "familyName" | "firstPublished">;
}) {
  return (
    <div className="spine">
      <span className="spine__band" />
      <CallNumber source={source} />
    </div>
  );
}

const NOTICE_ICONS = { warning: TriangleAlert, error: CircleAlert, info: Info } as const;

export function Notice({
  tone,
  title,
  children,
}: {
  readonly tone: keyof typeof NOTICE_ICONS;
  readonly title?: string | undefined;
  readonly children?: ReactNode;
}) {
  const Icon = NOTICE_ICONS[tone];
  return (
    <div className={`notice notice--${tone}`} role={tone === "error" ? "alert" : undefined}>
      <Icon className="notice__icon" aria-hidden="true" />
      <div>
        {title === undefined ? null : <p className="notice__title">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function SkeletonPanel() {
  const t = useT();
  return (
    <div className="panel" aria-busy="true">
      <div className="panel__body">
        <span className="sr-only">{t.common.loading}</span>
        <div className="skeleton" style={{ width: "40%" }} />
        <div className="skeleton" style={{ width: "75%", marginTop: 14 }} />
        <div className="skeleton" style={{ width: "60%", marginTop: 10 }} />
      </div>
    </div>
  );
}

/** A file the server could not read or write, with a way to try again. */
export function StorageProblem({ onRetry }: { readonly onRetry: () => void }) {
  const t = useT();
  return (
    <Notice tone="error" title={t.errors.storage}>
      <p>{t.errors.storageRecovery}</p>
      <p style={{ marginTop: 10 }}>
        <button type="button" className="button" onClick={onRetry}>
          {t.common.retry}
        </button>
      </p>
    </Notice>
  );
}
