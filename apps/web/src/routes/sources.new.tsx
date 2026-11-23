import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";

import { AddArticle } from "../components/AddArticle.tsx";
import { AddBook } from "../components/AddBook.tsx";
import { AddLessons } from "../components/AddLessons.tsx";
import { AddVideo } from "../components/AddVideo.tsx";
import { Page } from "../components/ui.tsx";
import { useT } from "../i18n/I18n.tsx";

type AddKind = "book" | "article" | "lesson" | "video";
const KINDS = ["book", "article", "lesson", "video"] as const satisfies ReadonlyArray<AddKind>;

export const Route = createFileRoute("/sources/new")({
  component: AddSource,
  validateSearch: (search: Record<string, unknown>): AddSearch => ({
    ...(search.kind === "article" || search.kind === "lesson" || search.kind === "video"
      ? { kind: search.kind }
      : {}),
    ...(typeof search.family === "string" ? { family: search.family } : {}),
    ...(typeof search.given === "string" ? { given: search.given } : {}),
  }),
});

type AddSearch = {
  readonly kind?: AddKind;
  readonly family?: string;
  readonly given?: string;
};

function AddSource() {
  const t = useT();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const kind = search.kind ?? "book";
  const hintId = useId();
  const [saving, setSaving] = useState(false);
  return (
    <Page title={t.addSource.title}>
      <div className="add-source">
        <div className="add-source__kind">
          <fieldset className="kind-choice" aria-describedby={hintId} disabled={saving}>
            <legend className="sr-only">{t.kinds.label}</legend>
            {KINDS.map((option) => (
              <label key={option} className="kind-choice__option">
                <input
                  type="radio"
                  name="add-kind"
                  value={option}
                  checked={kind === option}
                  onChange={() =>
                    void navigate({
                      to: "/sources/new",
                      search: {
                        ...(option === "book" ? {} : { kind: option }),
                        ...(search.family === undefined ? {} : { family: search.family }),
                        ...(search.given === undefined ? {} : { given: search.given }),
                      },
                      replace: true,
                    })
                  }
                />
                <span className="kind-choice__name">{t.kinds.names[option]}</span>
              </label>
            ))}
          </fieldset>
          <p className="kind-choice__hint" id={hintId}>
            {t.kinds.hints[kind]}
          </p>
        </div>
        <div hidden={kind !== "book"}>
          <AddBook author={search} onSaving={setSaving} />
        </div>
        <div hidden={kind !== "article"}>
          <AddArticle author={search} onSaving={setSaving} />
        </div>
        <div hidden={kind !== "lesson"}>
          <AddLessons onSaving={setSaving} />
        </div>
        <div hidden={kind !== "video"}>
          <AddVideo author={search} onSaving={setSaving} />
        </div>
      </div>
    </Page>
  );
}
