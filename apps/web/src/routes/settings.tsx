import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import { Page, Panel } from "../components/ui.tsx";
import { LANGUAGES, useT } from "../i18n/I18n.tsx";
import { KEYS, setLanguageAtom, settingsAtom } from "../state/graph.ts";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const t = useT();
  const settings = useAtomValue(settingsAtom);
  const setLanguage = useAtomSet(setLanguageAtom);
  const current = AsyncResult.getOrElse(
    AsyncResult.map(settings, (view) => view.settings),
    () => null,
  );
  return (
    <Page title={t.settings.title}>
      <div className="narrow stack">
        <Panel title={t.settings.language} initial="rubric">
          <div className="panel__body">
            <fieldset className="fieldset" style={{ display: "block" }}>
              <legend className="sr-only">{t.settings.language}</legend>
              <div className="choice-list">
                {LANGUAGES.map((language) => (
                  <label key={language} className="choice">
                    <input
                      type="radio"
                      name="settings-language"
                      value={language}
                      checked={current?.language === language}
                      onChange={() =>
                        setLanguage({ payload: { language }, reactivityKeys: KEYS.settings })
                      }
                    />
                    <span lang={language}>{t.languages[language]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Panel>
        <Panel title={t.settings.graphFolder} initial="lapis">
          <div className="panel__body field">
            <code className="call" style={{ alignSelf: "flex-start", whiteSpace: "normal" }}>
              {current?.graphFolder}
            </code>
            <p className="field__hint">{t.settings.graphFolderHint}</p>
          </div>
        </Panel>
      </div>
    </Page>
  );
}
