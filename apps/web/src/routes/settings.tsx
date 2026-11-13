import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useState } from "react";

import { BackupPanel } from "../components/Backup.tsx";
import { ChatGptConnection } from "../components/ChatGptConnection.tsx";
import { Page, Panel } from "../components/ui.tsx";
import { SiteFolderSheet } from "../components/WritingSheets.tsx";
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
        <BackupPanel />
        <Panel title={t.chatgpt.title} initial="lapis">
          <div className="panel__body stack">
            <p className="field__hint">{t.chatgpt.intro}</p>
            <ChatGptConnection />
          </div>
        </Panel>
        <SitePanel folder={current?.siteFolder ?? null} />
      </div>
    </Page>
  );
}

/** Where Blog posts are published: the folder of the user's Bridgetown site on this computer. */
function SitePanel({ folder }: { readonly folder: string | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Panel title={t.settings.site} initial="rubric">
      <div className="panel__body field">
        {folder === null ? (
          <p className="empty">{t.settings.siteNotChosen}</p>
        ) : (
          <code className="call" style={{ alignSelf: "flex-start", whiteSpace: "normal" }}>
            {folder}
          </code>
        )}
        <p className="field__hint">{t.settings.siteHint}</p>
        <p>
          <button type="button" className="button" onClick={() => setOpen(true)}>
            {t.writing.chooseSite}
          </button>
        </p>
      </div>
      {open ? (
        <SiteFolderSheet
          initial={folder ?? ""}
          onDone={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Panel>
  );
}
