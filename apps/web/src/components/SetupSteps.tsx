import { useAtomValue } from "@effect/atom-react";
import type { Language } from "@glose/contracts";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Layers, type LucideIcon, NotebookPen, Waypoints } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { LANGUAGES, useT } from "../i18n/I18n.tsx";
import { chatGptStatusAtom } from "../state/chatgpt.ts";
import { AddBook } from "./AddBook.tsx";
import { AppearanceChoices } from "./AppearancePanel.tsx";
import { ChatGptConnection } from "./ChatGptConnection.tsx";
import { Panel } from "./ui.tsx";

function StepFoot({
  onBack,
  children,
}: {
  readonly onBack?: () => void;
  readonly children: ReactNode;
}) {
  const t = useT();
  return (
    <div className="panel__body setup__foot">
      {onBack === undefined ? (
        <span />
      ) : (
        <button type="button" className="button button--quiet" onClick={onBack}>
          {t.setup.back}
        </button>
      )}
      <div className="setup__foot-end">{children}</div>
    </div>
  );
}

export function LookStep({
  language,
  onLanguage,
  onNext,
}: {
  readonly language: Language;
  readonly onLanguage: (language: Language) => void;
  readonly onNext: () => void;
}) {
  const t = useT();
  const next = (event: FormEvent) => {
    event.preventDefault();
    onNext();
  };
  return (
    <Panel title={t.setup.steps.look} initial="rubric">
      <form onSubmit={next}>
        <div className="panel__body setup__fields">
          <fieldset className="appearance__group">
            <legend className="appearance__legend">{t.setup.languageLegend}</legend>
            <div className="choice-list">
              {LANGUAGES.map((option) => (
                <label key={option} className="choice">
                  <input
                    type="radio"
                    name="setup-language"
                    value={option}
                    checked={language === option}
                    onChange={() => onLanguage(option)}
                  />
                  <span lang={option}>{t.languages[option]}</span>
                </label>
              ))}
            </div>
            <p className="field__hint">{t.setup.languageHint}</p>
          </fieldset>
          <AppearanceChoices />
        </div>
        <StepFoot>
          <button type="submit" className="button button--primary">
            {t.setup.continue}
          </button>
        </StepFoot>
      </form>
    </Panel>
  );
}

type Section = "graph" | "writing" | "recall";

const SECTIONS: ReadonlyArray<{ readonly id: Section; readonly icon: LucideIcon }> = [
  { id: "graph", icon: Waypoints },
  { id: "writing", icon: NotebookPen },
  { id: "recall", icon: Layers },
];

export function SectionsStep({
  onBack,
  onNext,
  onToday,
}: {
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
}) {
  const t = useT();
  const names: Record<Section, string> = {
    graph: t.nav.graph,
    writing: t.nav.writingProjects,
    recall: t.nav.recall,
  };
  return (
    <Panel title={t.setup.steps.sections} initial="rubric">
      <div className="panel__body setup__fields">
        <p className="setup__lede">{t.setup.sectionsIntro}</p>
        <ul className="setup-sections">
          {SECTIONS.map(({ id, icon: Icon }) => (
            <li key={id} className="setup-section">
              <Icon className="setup-section__icon" aria-hidden="true" />
              <h3 className="setup-section__name">{names[id]}</h3>
              <p className="setup-section__holds">{t.setup.sections[id].holds}</p>
              <p className="setup-section__ai">{t.setup.sections[id].ai}</p>
              {id === "writing" ? null : (
                <div
                  className="ai-text setup-section__sample"
                  data-scope={id === "recall" ? "card" : "paragraphs"}
                >
                  <p className="ai-text__gloss">
                    {id === "recall" ? t.aiText.card : t.aiText.paragraphs(1)}
                  </p>
                  <p>{t.setup.sections[id].sample}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <StepFoot onBack={onBack}>
        <button type="button" className="button button--quiet" onClick={onToday}>
          {t.setup.toToday}
        </button>
        <button type="button" className="button button--primary" onClick={onNext}>
          {t.setup.continue}
        </button>
      </StepFoot>
    </Panel>
  );
}

export function ChatGptStep({
  last,
  onBack,
  onNext,
  onToday,
}: {
  readonly last: boolean;
  readonly onBack: () => void;
  readonly onNext: (later: boolean) => void;
  readonly onToday: () => void;
}) {
  const t = useT();
  const status = useAtomValue(chatGptStatusAtom);
  const connected = AsyncResult.isSuccess(status) && status.value._tag === "Connected";
  return (
    <Panel title={t.setup.steps.chatgpt} initial="accent">
      <div className="panel__body setup__fields">
        <p className="setup__lede">{t.setup.chatgptIntro}</p>
        <p className="field__hint">{t.setup.chatgptHint}</p>
        <ChatGptConnection />
      </div>
      <StepFoot onBack={onBack}>
        {last ? null : (
          <button type="button" className="button button--quiet" onClick={onToday}>
            {t.setup.toToday}
          </button>
        )}
        <button
          type="button"
          className={connected ? "button button--primary" : "button"}
          onClick={() => onNext(!connected)}
        >
          {connected
            ? last
              ? t.setup.toToday
              : t.setup.continue
            : last
              ? t.setup.laterToday
              : t.setup.later}
        </button>
      </StepFoot>
    </Panel>
  );
}

export function BookStep({
  known,
  onBusy,
  onBack,
  onAdded,
  onToday,
}: {
  readonly known: number;
  readonly onBusy: (busy: boolean) => void;
  readonly onBack: () => void;
  readonly onAdded: (sourceId: string) => void;
  readonly onToday: () => void;
}) {
  const t = useT();
  const [saving, setSaving] = useState(false);
  if (known > 0) {
    return (
      <Panel title={t.setup.steps.book} initial="rubric">
        <div className="panel__body setup__fields">
          <p className="setup__lede">{t.setup.bookKnown(known)}</p>
        </div>
        <StepFoot onBack={onBack}>
          <button type="button" className="button button--primary" onClick={onToday}>
            {t.setup.toToday}
          </button>
        </StepFoot>
      </Panel>
    );
  }
  const notNow = (
    <button type="button" className="button button--quiet" disabled={saving} onClick={onToday}>
      {t.setup.notNow}
    </button>
  );
  return (
    <AddBook
      author={{}}
      title={t.setup.steps.book}
      submitLabel={t.setup.addBook}
      intro={
        <div className="setup__book-intro">
          <p className="setup__lede">{t.setup.bookIntro}</p>
          {notNow}
        </div>
      }
      onSaving={(next) => {
        setSaving(next);
        onBusy(next);
      }}
      onAdded={onAdded}
      back={
        <button type="button" className="button button--quiet" disabled={saving} onClick={onBack}>
          {t.setup.back}
        </button>
      }
    />
  );
}
