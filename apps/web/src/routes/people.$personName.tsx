import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { type GraphNode, type GraphView, linkKey, type Source } from "@glose/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type { ReactNode } from "react";

import { CareerLine } from "../components/CareerLine.tsx";
import { MissingLink, NoteText, type WikilinkPart } from "../components/NoteText.tsx";
import { Properties } from "../components/Properties.tsx";
import { CallNumber, Page, Panel, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import { firstChoice, type LinkedPerson, linkedPeople, worksOf } from "../domain/person.ts";
import { type GraphIndex, holdsAiText, indexGraph } from "../graph/graphIndex.ts";
import { useT } from "../i18n/I18n.tsx";
import { graphAtom, sourcesAtom } from "../state/vault.ts";

export const Route = createFileRoute("/people/$personName")({
  component: PersonPage,
  validateSearch: (search: Record<string, unknown>): { readonly work?: string } =>
    typeof search.work === "string" ? { work: search.work } : {},
});

function PersonPage() {
  const t = useT();
  const { personName } = Route.useParams();
  const graph = useAtomValue(graphAtom);
  const sources = useAtomValue(sourcesAtom);
  const refreshGraph = useAtomRefresh(graphAtom);
  const refreshSources = useAtomRefresh(sourcesAtom);
  if (AsyncResult.isFailure(graph) || AsyncResult.isFailure(sources)) {
    return (
      <Page title={personName}>
        <StorageProblem
          onRetry={() => {
            refreshGraph();
            refreshSources();
          }}
        />
      </Page>
    );
  }
  if (!AsyncResult.isSuccess(graph) || !AsyncResult.isSuccess(sources)) {
    return (
      <Page title={personName}>
        <div className="columns">
          <SkeletonPanel />
          <SkeletonPanel />
        </div>
      </Page>
    );
  }
  const person = graph.value.nodes.find(
    (node) => node.kind === "person" && linkKey(node.id) === linkKey(personName),
  );
  if (person === undefined) {
    return (
      <Page title={personName}>
        <p className="empty">{t.people.notFound(personName)}</p>
        <p className="person__back">
          <Link to="/graph" className="button">
            {t.people.backToGraph}
          </Link>
        </p>
      </Page>
    );
  }
  return <PersonView person={person} view={graph.value} sources={sources.value} />;
}

function PersonView({
  person,
  view,
  sources,
}: {
  readonly person: GraphNode;
  readonly view: GraphView;
  readonly sources: ReadonlyArray<Source>;
}) {
  const t = useT();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const index = indexGraph(view, sources);
  const works = worksOf(person, sources, view);
  const people = linkedPeople(person, works, sources, view);
  const chosen = works.find((work) => work.source.id === search.work) ?? firstChoice(works);
  const notes = works.reduce((sum, work) => sum + work.notes.length, 0);
  const year = (key: string) => {
    const value = person.properties.find((property) => property.key === key)?.value;
    return typeof value === "number" || typeof value === "string" ? String(value) : null;
  };
  const born = year("born");
  const died = year("died");
  const showNode = (id: string) => void navigate({ to: "/graph", search: { node: id } });
  const renderLink = personLinks(index);

  return (
    <Page
      title={person.title}
      sub={
        <span className="button-row">
          <Link to="/graph" search={{ node: person.id }} className="page-head__crumb">
            {t.people.crumb}
          </Link>
          <span>{t.people.kind}</span>
          {born === null ? null : (
            <span>{died === null ? t.people.born(born) : t.people.lived(born, died)}</span>
          )}
          <span className="page-head__where">
            {t.people.sub(works.length, notes, people.length)}
          </span>
        </span>
      }
      actions={
        <>
          <Link to="/graph" search={{ node: person.id }} className="button">
            {t.people.edit}
          </Link>
          <Link to="/sources/new" className="button button--primary">
            {t.people.addSource}
          </Link>
        </>
      }
    >
      <div className="columns">
        <div className="stack">
          <Panel title={t.people.works} initial="accent" meta={t.people.worksMeta}>
            <div className="panel__body">
              {works.length === 0 ? (
                <p className="empty">{t.people.noWorks(person.title)}</p>
              ) : (
                <CareerLine
                  name={person.title}
                  works={works}
                  people={people}
                  chosen={chosen?.source.id ?? null}
                  onChoose={(work) => void navigate({ search: { work }, replace: true })}
                />
              )}
            </div>
          </Panel>
          {chosen === null ? null : (
            <Panel
              title={t.people.from(chosen.source.title)}
              initial="rubric"
              meta={
                <Link
                  to="/sources/$sourceId"
                  params={{ sourceId: chosen.source.id }}
                  className="person__open"
                >
                  {t.people.openSource}
                </Link>
              }
            >
              <div className="panel__body">
                {chosen.notes.length === 0 ? (
                  <p className="empty">{t.people.noNotes(chosen.source.title)}</p>
                ) : (
                  <ul className="person__notes">
                    {chosen.notes.map((note) => (
                      <li key={note.id}>
                        <Link
                          to="/graph"
                          search={{ node: note.id }}
                          className="person__note"
                          data-kind="note"
                        >
                          {note.title}
                          {holdsAiText(note) ? (
                            <>
                              <span
                                className="graph__ring"
                                aria-hidden="true"
                                title={t.graph.holdsAi}
                              />
                              <span className="sr-only">{` (${t.graph.holdsAi})`}</span>
                            </>
                          ) : null}
                        </Link>
                        <span className="person__growth">
                          {t.graph.growth.names[note.growth ?? "seed"]}
                        </span>
                        {note.page === null ? (
                          <span />
                        ) : (
                          <CallNumber source={chosen.source} page={note.page} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          )}
        </div>
        <aside className="stack">
          <Panel title={t.people.words} initial="rubric">
            <div className="panel__body">
              {person.body.trim() === "" ? (
                <p className="empty">{t.people.noWords(person.title)}</p>
              ) : (
                <NoteText
                  markdown={person.body}
                  aiText={person.aiText && !person.aiTitle}
                  renderLink={renderLink}
                />
              )}
            </div>
          </Panel>
          <Panel title={t.people.people} initial="accent" meta={people.length}>
            <div className="panel__body">
              {people.length === 0 ? (
                <p className="empty">{t.people.noPeople}</p>
              ) : (
                <ul className="person__people">
                  {people.map((linked) => (
                    <LinkedPersonRow key={linked.node.id} linked={linked} />
                  ))}
                </ul>
              )}
            </div>
          </Panel>
          <Properties key={person.id} node={person} index={index} onShow={showNode} />
        </aside>
      </div>
    </Page>
  );
}

function LinkedPersonRow({ linked }: { readonly linked: LinkedPerson }) {
  const t = useT();
  return (
    <li>
      <Link
        to="/people/$personName"
        params={{ personName: linked.node.id }}
        search={{}}
        className="person__who"
      >
        {linked.node.title}
      </Link>
      <p className="person__why">{linked.reason ?? t.people.throughWorks}</p>
    </li>
  );
}

const personLinks =
  (index: GraphIndex) =>
  (part: WikilinkPart): ReactNode => {
    const target = index.byKey.get(linkKey(part.target));
    if (target === undefined) {
      return <MissingLink key={part.at} name={part.target} label={part.label} />;
    }
    return target.kind === "person" ? (
      <Link
        key={part.at}
        to="/people/$personName"
        params={{ personName: target.id }}
        search={{}}
        className="graph__wikilink"
      >
        {part.label}
      </Link>
    ) : (
      <Link
        key={part.at}
        to="/graph"
        search={{ node: target.id }}
        className="graph__wikilink"
        data-kind={target.kind}
      >
        {part.label}
      </Link>
    );
  };
