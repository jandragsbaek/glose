import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useState } from "react";

import { Page, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import { WritingDesk } from "../components/WritingDesk.tsx";
import { useT } from "../i18n/I18n.tsx";
import { writingProjectAtom } from "../state/writing.ts";

/** `?fresh` marks a piece just started, whose placeholder title waits to be typed over. */
export const Route = createFileRoute("/writing/$projectId")({
  component: WritingProjectPage,
  validateSearch: (search: Record<string, unknown>): { readonly fresh?: boolean } =>
    search.fresh === true || search.fresh === "true" ? { fresh: true } : {},
});

function WritingProjectPage() {
  const { projectId } = Route.useParams();
  const { fresh } = Route.useSearch();
  const navigate = useNavigate();
  // A new title renames the file and the address; the desk stays open with the cursor where it
  // was. Only a move to another project opens another desk.
  const [desk, setDesk] = useState({ opened: projectId, current: projectId });
  if (projectId !== desk.current) setDesk({ opened: projectId, current: projectId });
  return (
    <ProjectLoader
      key={desk.opened}
      id={desk.opened}
      fresh={fresh === true}
      onRenamed={(id) => {
        setDesk((now) => ({ ...now, current: id }));
        void navigate({
          to: "/writing/$projectId",
          params: { projectId: id },
          replace: true,
        });
      }}
    />
  );
}

function ProjectLoader({
  id,
  fresh,
  onRenamed,
}: {
  readonly id: string;
  readonly fresh: boolean;
  readonly onRenamed: (id: string) => void;
}) {
  const t = useT();
  const result = useAtomValue(writingProjectAtom(id));
  const refresh = useAtomRefresh(writingProjectAtom(id));
  return AsyncResult.matchWithError(result, {
    onInitial: () => (
      <Page title={t.writing.title}>
        <SkeletonPanel />
      </Page>
    ),
    onError: (error) =>
      error._tag === "WritingProjectNotFound" ? (
        <Page title={t.errors.notFoundTitle}>
          <p className="empty">{t.writing.notFound}</p>
          <p style={{ marginTop: 16 }}>
            <Link to="/writing" className="button">
              {t.writing.backToList}
            </Link>
          </p>
        </Page>
      ) : (
        <Page title={t.writing.title}>
          <StorageProblem onRetry={refresh} />
        </Page>
      ),
    onDefect: () => (
      <Page title={t.writing.title}>
        <StorageProblem onRetry={refresh} />
      </Page>
    ),
    onSuccess: ({ value }) => <WritingDesk project={value} fresh={fresh} onRenamed={onRenamed} />,
  });
}
