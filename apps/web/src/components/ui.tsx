import type { Source } from "@glose/contracts";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { type ReactNode, useId } from "react";

import { type CallNumbered, callNumber } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";

export function Page({
  title,
  sub,
  actions,
  fill = false,
  flush = false,
  children,
}: {
  readonly title: string;
  readonly sub?: ReactNode;
  readonly actions?: ReactNode;
  readonly fill?: boolean;
  readonly flush?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <>
      <header className="page-head">
        <h1>{title}</h1>
        {sub === undefined ? null : <span className="page-head__sub">{sub}</span>}
        {actions === undefined ? null : <div className="page-head__actions">{actions}</div>}
      </header>
      <div
        className={
          fill ? `page-body page-body--fill${flush ? " page-body--flush" : ""}` : "page-body"
        }
      >
        {children}
      </div>
    </>
  );
}

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

export function Panel({
  title,
  initial,
  meta,
  level = 2,
  children,
}: {
  readonly title: string;
  readonly initial: "rubric" | "accent";
  readonly meta?: ReactNode;
  readonly level?: 2 | 3;
  readonly children: ReactNode;
}) {
  const headingId = useId();
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <section className="panel" data-initial={initial} aria-labelledby={headingId}>
      <div className="panel__head">
        <Heading className="panel__title" id={headingId}>
          {title}
        </Heading>
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
  page = null,
}: {
  readonly source: CallNumbered;
  readonly page?: string | null;
}) {
  const t = useT();
  const label = callNumber(source);
  const missing = source.firstPublished === null;
  return (
    <span
      className={missing ? "call call--missing" : "call"}
      aria-label={t.source.callNumberLabel(
        page === null ? label : `${label} · ${t.source.page(page)}`,
      )}
    >
      {missing ? <TriangleAlert className="call__icon" aria-hidden="true" /> : null}
      {label}
      {page === null ? null : <span className="call__loc">· {t.source.page(page)}</span>}
    </span>
  );
}

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
  callout = false,
  children,
}: {
  readonly tone: keyof typeof NOTICE_ICONS;
  readonly title?: ReactNode;
  readonly callout?: boolean;
  readonly children?: ReactNode;
}) {
  const Icon = NOTICE_ICONS[tone];
  return (
    <div
      className={`notice notice--${tone}${callout ? " notice--callout" : ""}`}
      role={tone === "error" && !callout ? "alert" : undefined}
    >
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
