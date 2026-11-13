import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { resolveReferences, type WritingProject, type WritingProjectType } from "@glose/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Notice, Page, Panel, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import { proseWords } from "../domain/writing.ts";
import { useLanguage, useT } from "../i18n/I18n.tsx";
import { graphAtom, sourcesAtom } from "../state/graph.ts";
import { createWritingAtom, WRITING_KEYS, writingListAtom } from "../state/writing.ts";

export const Route = createFileRoute("/writing/")({ component: WritingProjectsPage });

const TYPES: ReadonlyArray<WritingProjectType> = ["blog-post", "assignment"];

/** A new piece is saved at once under a placeholder title, numbered when the name is taken. */
const MAX_UNTITLED = 50;

function WritingProjectsPage() {
  const t = useT();
  const list = useAtomValue(writingListAtom);
  const projects = AsyncResult.getOrElse(list, () => null);
  const published = projects?.filter((project) => project.published !== null).length ?? 0;
  return (
    <Page
      title={t.writing.title}
      sub={projects === null ? undefined : t.writing.sub(projects.length, published)}
    >
      <div className="stack">
        <StartPiece />
        <PiecesLoader />
      </div>
    </Page>
  );
}

function PiecesLoader() {
  const list = useAtomValue(writingListAtom);
  const refresh = useAtomRefresh(writingListAtom);
  return AsyncResult.matchWithError(list, {
    onInitial: () => <SkeletonPanel />,
    onError: () => <StorageProblem onRetry={refresh} />,
    onDefect: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) => <Pieces projects={value} />,
  });
}

function StartPiece() {
  const t = useT();
  const language = useLanguage();
  const navigate = useNavigate();
  const create = useAtomSet(createWritingAtom, { mode: "promiseExit" });
  const [starting, setStarting] = useState<WritingProjectType | null>(null);
  const [failed, setFailed] = useState(false);

  const start = async (type: WritingProjectType) => {
    setStarting(type);
    setFailed(false);
    for (let n = 1; n <= MAX_UNTITLED; n += 1) {
      const exit = await create({
        payload: {
          title: n === 1 ? t.writing.untitled[type] : `${t.writing.untitled[type]} ${n}`,
          type,
          language,
          referenceForm: "footnotes",
          citationStyle: "chicago",
          body: "",
        },
        reactivityKeys: WRITING_KEYS.list,
      });
      if (Exit.isSuccess(exit)) {
        await navigate({
          to: "/writing/$projectId",
          params: { projectId: exit.value.id },
          search: { fresh: true },
        });
        return;
      }
      const error = Cause.findErrorOption(exit.cause);
      if (Option.isNone(error) || error.value._tag !== "WritingProjectNameTaken") break;
    }
    setStarting(null);
    setFailed(true);
  };

  return (
    <Panel title={t.writing.start} initial="rubric" meta={t.writing.startMeta}>
      <div className="panel__body stack">
        {failed ? <Notice tone="error">{t.writing.startFailed}</Notice> : null}
        <div className="specimens">
          {TYPES.map((type) => (
            <section key={type} className="specimen" aria-labelledby={`specimen-${type}`}>
              <Miniature type={type} />
              <div className="specimen__text">
                <h3 className="specimen__title" id={`specimen-${type}`}>
                  {t.writing.types[type]}
                </h3>
                <p className="specimen__lead">{t.writing.typeLead[type]}</p>
                <ul className="specimen__points">
                  {t.writing.typePoints[type].map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={type === "blog-post" ? "button button--primary" : "button"}
                  disabled={starting !== null}
                  onClick={() => void start(type)}
                >
                  {starting === type ? t.writing.starting : t.writing.startType[type]}
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/** A small finished page of the type, so the choice shows what it becomes. */
function Miniature({ type }: { readonly type: WritingProjectType }) {
  const t = useT();
  if (type === "blog-post") {
    const sample = t.writing.specimenBlog;
    return (
      <div className="miniature" aria-hidden="true">
        <p className="miniature__title">{sample.title}</p>
        <p>
          {sample.text}
          <sup>1</sup> {sample.afterNote}
          <sup>2</sup>
        </p>
        <ol className="miniature__notes">
          {sample.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ol>
      </div>
    );
  }
  const sample = t.writing.specimenAssignment;
  return (
    <div className="miniature miniature--page" aria-hidden="true">
      <p className="miniature__title">{sample.title}</p>
      <p>{sample.text}</p>
      <p className="miniature__heading">{sample.bibliography}</p>
      <p className="miniature__entry">{sample.entry}</p>
    </div>
  );
}

function Pieces({ projects }: { readonly projects: ReadonlyArray<WritingProject> }) {
  const t = useT();
  const graph = AsyncResult.getOrElse(useAtomValue(graphAtom), () => null);
  const sources = AsyncResult.getOrElse(useAtomValue(sourcesAtom), () => null);
  return (
    <Panel title={t.writing.pieces} initial="lapis" meta={String(projects.length)}>
      {projects.length === 0 ? (
        <div className="panel__body">
          <p className="empty">{t.writing.piecesEmpty}</p>
        </div>
      ) : (
        <div className="register-scroll">
          <table className="register">
            <thead>
              <tr>
                <th scope="col">{t.writing.columns.title}</th>
                <th scope="col">{t.writing.columns.type}</th>
                <th scope="col" className="register__num">
                  {t.writing.columns.words}
                </th>
                <th scope="col" className="register__num">
                  {t.writing.columns.references}
                </th>
                <th scope="col">{t.writing.columns.citations}</th>
                <th scope="col">{t.writing.columns.changed}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const references =
                  graph === null || sources === null
                    ? null
                    : resolveReferences(project.body, graph.nodes, sources);
                const toFix =
                  references?.filter((reference) => reference.problems.length > 0).length ?? 0;
                return (
                  <tr key={project.id} className="register__row">
                    <th scope="row" className="register__title">
                      <Link to="/writing/$projectId" params={{ projectId: project.id }}>
                        {project.title}
                      </Link>
                    </th>
                    <td>{t.writing.types[project.type]}</td>
                    <td className="register__num">{proseWords(project.body)}</td>
                    <td className="register__num">{references?.length ?? ""}</td>
                    <td>
                      {references === null ? null : toFix > 0 ? (
                        <span className="register__missing">
                          <TriangleAlert className="register__cite-icon" aria-hidden="true" />
                          {t.writing.toFix(toFix)}
                        </span>
                      ) : project.published !== null ? (
                        <span className="register__ready">
                          <Check className="register__cite-icon" aria-hidden="true" />
                          {t.writing.publishedOn(new Date(`${project.published.date}T12:00:00`))}
                        </span>
                      ) : references.length === 0 ? (
                        <span className="register__none">{t.writing.noReferences}</span>
                      ) : (
                        <span className="register__ready">
                          <Check className="register__cite-icon" aria-hidden="true" />
                          {t.writing.ready}
                        </span>
                      )}
                    </td>
                    <td>{t.writing.changed(new Date(project.modified))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
