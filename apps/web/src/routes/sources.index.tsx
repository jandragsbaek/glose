import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { ReadingStep } from "@glose/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check, ChevronDown, Plus, Search, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";

import {
  CallNumber,
  Page,
  Panel,
  SkeletonPanel,
  Spine,
  StorageProblem,
} from "../components/ui.tsx";
import {
  type CitationFilter,
  filterRecords,
  groupRecords,
  type ReadingFilter,
  type RegisterGroupKey,
  type RegisterOrder,
  type SourceRecord,
  sourceRecords,
} from "../domain/register.ts";
import { wordCount } from "../domain/source.ts";
import { useLanguage, useT } from "../i18n/I18n.tsx";
import { graphAtom, sourcesAtom } from "../state/graph.ts";

/** The Source whose Links light up the register is in the address, so Back returns to it. */
export const Route = createFileRoute("/sources/")({
  component: SourcesPage,
  validateSearch: (search: Record<string, unknown>): { readonly source?: string } =>
    typeof search.source === "string" ? { source: search.source } : {},
});

const STEPS: ReadonlyArray<ReadingStep> = ["free-text", "extraction", "probe", "done"];
const ORDERS: ReadonlyArray<RegisterOrder> = ["added", "call", "author"];
const READING_FILTERS: ReadonlyArray<ReadingFilter> = ["all", "in-progress", "done"];
const CITATION_FILTERS: ReadonlyArray<CitationFilter> = ["all", "ready", "missing"];

function SourcesPage() {
  const t = useT();
  const sources = useAtomValue(sourcesAtom);
  const graph = useAtomValue(graphAtom);
  const refreshSources = useAtomRefresh(sourcesAtom);
  const refreshGraph = useAtomRefresh(graphAtom);
  const addSource = (
    <Link to="/sources/new" className="button button--primary">
      <Plus size={16} aria-hidden="true" />
      {t.today.addSource}
    </Link>
  );
  const result = AsyncResult.all([sources, graph]);
  if (AsyncResult.isFailure(result)) {
    return (
      <Page title={t.sources.title} actions={addSource}>
        <StorageProblem
          onRetry={() => {
            refreshSources();
            refreshGraph();
          }}
        />
      </Page>
    );
  }
  if (!AsyncResult.isSuccess(result)) {
    return (
      <Page title={t.sources.title} actions={addSource}>
        <div className="stack">
          <SkeletonPanel />
          <SkeletonPanel />
        </div>
      </Page>
    );
  }
  const records = sourceRecords(...result.value);
  // Today's order: the Source worked on last comes first.
  const desk = records.filter((record) => record.source.readingStep !== "done");
  return (
    <Page
      title={t.sources.title}
      sub={records.length === 0 ? undefined : t.sources.counts(records.length, desk.length)}
      actions={addSource}
    >
      <div className="stack">
        <Desk records={desk} empty={records.length === 0} />
        {records.length === 0 ? null : <Register records={records} />}
      </div>
    </Page>
  );
}

/** Three marks for the Reading steps: filled when done, gilt-underlined at the current one. */
function ReadingMarks({
  step,
  labelled,
}: {
  readonly step: ReadingStep;
  readonly labelled: boolean;
}) {
  const t = useT();
  const at = STEPS.indexOf(step);
  const label = t.sources.steps[step];
  return (
    <span
      className="marks"
      {...(labelled ? { role: "img", "aria-label": label, title: label } : { "aria-hidden": true })}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="marks__dot"
          data-state={index < at ? "done" : index === at ? "current" : "later"}
        />
      ))}
    </span>
  );
}

const authorOf = (record: SourceRecord) =>
  [record.source.givenName, record.source.familyName].filter(Boolean).join(" ");

function Desk({
  records,
  empty,
}: {
  readonly records: ReadonlyArray<SourceRecord>;
  readonly empty: boolean;
}) {
  const t = useT();
  return (
    <Panel
      title={t.sources.desk}
      initial="rubric"
      meta={records.length === 0 ? undefined : t.sources.deskCount(records.length)}
    >
      <div className="panel__body">
        {empty ? (
          <>
            <p className="empty empty--lead">{t.today.noSourceTitle}</p>
            <p className="empty">{t.today.noSourceBody}</p>
          </>
        ) : records.length === 0 ? (
          <p className="empty">{t.sources.deskEmpty}</p>
        ) : (
          <ul className="desk">
            {records.map((record) => (
              <DeskItem key={record.source.id} record={record} />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function DeskItem({ record }: { readonly record: SourceRecord }) {
  const t = useT();
  const { source } = record;
  if (source.readingStep === "done") return null;
  const params = { sourceId: source.id };
  return (
    <li className="desk__item">
      <Spine source={source} />
      <div className="desk__text">
        <h3 className="desk__title">
          <Link to="/sources/$sourceId" params={params}>
            {source.title}
          </Link>
        </h3>
        <p className="desk__author">{authorOf(record)}</p>
        <p className="desk__state">
          <ReadingMarks step={source.readingStep} labelled={false} />
          {t.sources.state(source.readingStep, wordCount(source.freeText), record.notes)}
        </p>
        {record.missing.length === 0 ? null : (
          <p className="inline-warning desk__missing">
            <TriangleAlert className="notice__icon" aria-hidden="true" />
            <span>
              {t.source.missingLine(record.missing.map((detail) => t.source.missingInline[detail]))}
            </span>
          </p>
        )}
        <p className="desk__action">
          <Link
            to="/sources/$sourceId"
            params={params}
            className="button button--primary button--small"
          >
            {t.today.continue[source.readingStep]}
          </Link>
        </p>
      </div>
    </li>
  );
}

function Register({ records }: { readonly records: ReadonlyArray<SourceRecord> }) {
  const t = useT();
  const navigate = useNavigate();
  const { source: selectedId } = Route.useSearch();
  const ids = { find: useId(), order: useId(), reading: useId(), citation: useId() };
  const [text, setText] = useState("");
  const [order, setOrder] = useState<RegisterOrder>("added");
  const [reading, setReading] = useState<ReadingFilter>("all");
  const [citation, setCitation] = useState<CitationFilter>("all");

  const locale = useLanguage();
  const matching = filterRecords(records, { text, reading, citation }, locale);
  const groups = groupRecords(matching, order, locale);
  const selected = records.find((record) => record.source.id === selectedId);
  const select = (id: string | null) =>
    void navigate({ to: "/sources", search: id === null ? {} : { source: id }, replace: true });
  const clearFilters = () => {
    setText("");
    setReading("all");
    setCitation("all");
  };
  const groupLabel = (key: RegisterGroupKey, n: number) =>
    key.kind === "month"
      ? t.sources.monthGroup(key.year, key.month, n)
      : t.sources.letterGroup(key.letter, n);

  return (
    <Panel
      title={t.sources.register}
      initial="lapis"
      meta={
        matching.length === records.length
          ? t.sources.counts(records.length, 0)
          : t.sources.matching(matching.length, records.length)
      }
    >
      <form className="register-tools" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor={ids.find}>
          {t.sources.find}
        </label>
        <span className="register-tools__find">
          <Search className="register-tools__icon" aria-hidden="true" />
          <input
            id={ids.find}
            className="input"
            type="search"
            value={text}
            placeholder={t.sources.findPlaceholder}
            onChange={(event) => setText(event.target.value)}
          />
        </span>
        <fieldset className="segmented">
          <legend className="sr-only">{t.sources.order}</legend>
          {ORDERS.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={ids.order}
                value={option}
                checked={order === option}
                onChange={() => setOrder(option)}
              />
              <span>{t.sources.orders[option]}</span>
            </label>
          ))}
        </fieldset>
        <div className="register-tools__filters">
          <label className="sr-only" htmlFor={ids.reading}>
            {t.sources.reading}
          </label>
          <span className="select">
            <select
              id={ids.reading}
              className="input"
              value={reading}
              onChange={(event) =>
                setReading(READING_FILTERS.find((option) => option === event.target.value) ?? "all")
              }
            >
              {READING_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {t.sources.readingFilters[option]}
                </option>
              ))}
            </select>
            <ChevronDown className="select__icon" aria-hidden="true" />
          </span>
          <label className="sr-only" htmlFor={ids.citation}>
            {t.sources.citation}
          </label>
          <span className="select">
            <select
              id={ids.citation}
              className="input"
              value={citation}
              onChange={(event) =>
                setCitation(
                  CITATION_FILTERS.find((option) => option === event.target.value) ?? "all",
                )
              }
            >
              {CITATION_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {t.sources.citationFilters[option]}
                </option>
              ))}
            </select>
            <ChevronDown className="select__icon" aria-hidden="true" />
          </span>
        </div>
        <p className="register-tools__hint" role="status">
          {selected === undefined ? (
            t.sources.hint
          ) : (
            <>
              <span className="register-tools__edge" aria-hidden="true" />
              <span>{t.sources.hintSelected(selected.source.title, selected.linked.size)}</span>
              <button type="button" className="link-button" onClick={() => select(null)}>
                {t.sources.clearSelection}
              </button>
            </>
          )}
        </p>
      </form>
      {groups.length === 0 ? (
        <div className="panel__body">
          <p className="empty">{t.sources.nothingFound}</p>
          <p style={{ marginTop: 10 }}>
            <button type="button" className="link-button" onClick={clearFilters}>
              {t.sources.clearFilters}
            </button>
          </p>
        </div>
      ) : (
        <div className="register-scroll">
          <table className="register">
            <caption className="sr-only">{t.sources.register}</caption>
            <thead>
              <tr>
                <th scope="col">{t.sources.columns.call}</th>
                <th scope="col">{t.sources.columns.title}</th>
                <th scope="col">{t.sources.columns.reading}</th>
                <th scope="col" className="register__num">
                  {t.sources.columns.notes}
                </th>
                <th scope="col" className="register__num">
                  {t.sources.columns.located}
                </th>
                <th scope="col">{t.sources.columns.links}</th>
                <th scope="col">{t.sources.columns.citation}</th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.id}>
                <tr className="register__group">
                  <th scope="rowgroup" colSpan={7}>
                    {groupLabel(group.key, group.records.length)}
                  </th>
                </tr>
                {group.records.map((record) => (
                  <RegisterRow
                    key={record.source.id}
                    record={record}
                    selected={selected}
                    onSelect={select}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </Panel>
  );
}

function RegisterRow({
  record,
  selected,
  onSelect,
}: {
  readonly record: SourceRecord;
  readonly selected: SourceRecord | undefined;
  readonly onSelect: (id: string | null) => void;
}) {
  const t = useT();
  const { source } = record;
  const isSelected = selected?.source.id === source.id;
  const shared = isSelected ? undefined : selected?.linked.get(source.id);
  return (
    <tr
      className="register__row"
      data-selected={isSelected ? "" : undefined}
      data-linked={shared === undefined ? undefined : ""}
    >
      <td>
        <CallNumber source={source} />
      </td>
      <th scope="row" className="register__title">
        <Link to="/sources/$sourceId" params={{ sourceId: source.id }}>
          {source.title}
        </Link>{" "}
        <span className="register__author">{authorOf(record)}</span>
      </th>
      <td>
        <ReadingMarks step={source.readingStep} labelled />
      </td>
      <td className="register__num">{record.notes}</td>
      <td className="register__num">
        {record.notes === 0 ? (
          <span className="register__none">
            <span aria-hidden="true">–</span>
            <span className="sr-only">{t.sources.noNotes}</span>
          </span>
        ) : (
          t.sources.located(record.located, record.notes)
        )}
      </td>
      <td>
        {record.linked.size === 0 ? (
          <span className="register__none">{t.sources.standsAlone}</span>
        ) : (
          <button
            type="button"
            className="register__links"
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? null : source.id)}
          >
            {shared === undefined || selected === undefined ? (
              <>
                {t.sources.linkedSources(record.linked.size)}
                <span className="sr-only"> {t.sources.showLinks(source.title)}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">{t.sources.shared(shared)}</span>
                <span className="sr-only">
                  {t.sources.sharedWith(shared, selected.source.title)}
                </span>
              </>
            )}
          </button>
        )}
      </td>
      <td>
        {record.missing.length === 0 ? (
          <span className="register__ready">
            <Check className="register__cite-icon" aria-hidden="true" />
            {t.sources.ready}
          </span>
        ) : (
          <span className="register__missing">
            <TriangleAlert className="register__cite-icon" aria-hidden="true" />
            {t.sources.missing(record.missing)}
          </span>
        )}
      </td>
    </tr>
  );
}
