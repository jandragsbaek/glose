import { useAtomSet } from "@effect/atom-react";
import type { Language, SettingsView } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { I18nProvider, LANGUAGES, useT } from "../i18n/I18n.tsx";
import type { Messages } from "../i18n/en.ts";
import { completeSetupAtom, KEYS } from "../state/graph.ts";
import { Notice, Panel } from "./ui.tsx";

type FolderError = keyof Messages["setup"]["folderErrors"] | "storage";

/** The first start: language, Graph folder, and the ChatGPT step that cannot run yet. */
export function Setup({
  view,
  initialLanguage,
}: {
  readonly view: SettingsView;
  readonly initialLanguage: Language;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  return (
    <I18nProvider language={language}>
      <SetupForm view={view} language={language} onLanguage={setLanguage} />
    </I18nProvider>
  );
}

function SetupForm({
  view,
  language,
  onLanguage,
}: {
  readonly view: SettingsView;
  readonly language: Language;
  readonly onLanguage: (language: Language) => void;
}) {
  const t = useT();
  const folderId = useId();
  const errorId = useId();
  const [folder, setFolder] = useState(view.suggestedGraphFolder);
  const [error, setError] = useState<FolderError | null>(null);
  const [busy, setBusy] = useState(false);
  const completeSetup = useAtomSet(completeSetupAtom, { mode: "promiseExit" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const exit = await completeSetup({
      payload: { language, graphFolder: folder },
      reactivityKeys: KEYS.settings,
    });
    setBusy(false);
    if (Exit.isSuccess(exit)) return;
    const failure = Cause.findErrorOption(exit.cause);
    setError(
      Option.isSome(failure) && failure.value._tag === "GraphFolderUnavailable"
        ? failure.value.reason
        : "storage",
    );
  };

  return (
    <div className="setup">
      <div className="setup__band">
        <span className="call">{t.app.mark}</span>
      </div>
      <main className="setup__body">
        <h1 className="setup__title">{t.setup.title}</h1>
        <p className="setup__intro">{t.setup.intro}</p>
        <form className="form" onSubmit={submit}>
          <Panel title={t.setup.languageStep} initial="rubric">
            <div className="panel__body">
              <fieldset className="fieldset" style={{ display: "block" }}>
                <legend className="sr-only">{t.setup.languageStep}</legend>
                <p className="field__hint" style={{ marginBottom: 12 }}>
                  {t.setup.languageHint}
                </p>
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
              </fieldset>
            </div>
          </Panel>

          <Panel title={t.setup.folderStep} initial="lapis">
            <div className="panel__body field">
              <label className="field__label" htmlFor={folderId}>
                {t.setup.folderLabel}
              </label>
              <p className="field__hint">{t.setup.folderHint}</p>
              <input
                id={folderId}
                className="input"
                value={folder}
                onChange={(event) => {
                  setFolder(event.target.value);
                  setError(null);
                }}
                required
                spellCheck={false}
                autoComplete="off"
                aria-invalid={error !== null && error !== "storage"}
                aria-describedby={error === null ? undefined : errorId}
              />
              {error === null || error === "storage" ? null : (
                <p className="field__error" id={errorId}>
                  <CircleAlert className="call__icon" aria-hidden="true" />
                  {t.setup.folderErrors[error]}
                </p>
              )}
            </div>
          </Panel>

          <Panel title={t.setup.chatgptStep} initial="rubric">
            <div className="panel__body">
              <Notice tone="info">
                <p>{t.setup.chatgptHint}</p>
              </Notice>
            </div>
          </Panel>

          {error === "storage" ? (
            <Notice tone="error" title={t.errors.storage}>
              <p id={errorId}>{t.errors.storageRecovery}</p>
            </Notice>
          ) : null}

          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={busy}>
              {t.setup.submit}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
