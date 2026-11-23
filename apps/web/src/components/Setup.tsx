import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Language, SettingsView } from "@glose/contracts";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { parentOf } from "../domain/folderPlace.ts";
import { SETUP_STEPS, type SetupStep, setupFlow } from "../domain/setupFlow.ts";
import { I18nProvider, useT } from "../i18n/I18n.tsx";
import { chatGptStatusAtom } from "../state/chatgpt.ts";
import { KEYS, setLanguageAtom } from "../state/vault.ts";
import { useAppearance } from "../theme/appearance.ts";
import { BookStep, ChatGptStep, LookStep, SectionsStep } from "./SetupSteps.tsx";
import { usePlaceWords, type Vault, VaultStep } from "./SetupVault.tsx";

export function Setup({
  view,
  initialLanguage,
  onFinish,
}: {
  readonly view: SettingsView;
  readonly initialLanguage: Language;
  readonly onFinish: (sourceId: string | null) => void;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  return (
    <I18nProvider language={language}>
      <SetupFlow view={view} language={language} onLanguage={setLanguage} onFinish={onFinish} />
    </I18nProvider>
  );
}

function SetupFlow({
  view,
  language,
  onLanguage,
  onFinish,
}: {
  readonly view: SettingsView;
  readonly language: Language;
  readonly onLanguage: (language: Language) => void;
  readonly onFinish: (sourceId: string | null) => void;
}) {
  const t = useT();
  const saveLanguage = useAtomSet(setLanguageAtom);
  const [step, setStep] = useState<SetupStep>("look");
  const [reached, setReached] = useState(0);
  const [vault, setVault] = useState<Vault | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatGptLater, setChatGptLater] = useState(false);
  const stage = useRef<HTMLElement>(null);

  const flow = setupFlow(vault?.sources ?? null);
  const at = flow.indexOf(step);
  const show = (target: SetupStep) => {
    flushSync(() => setStep(target));
    const heading = stage.current?.querySelector<HTMLElement>(
      `[data-step="${target}"] .panel__title`,
    );
    if (heading === null || heading === undefined) return;
    heading.tabIndex = -1;
    heading.focus();
  };
  const forward = () => {
    const next = flow[at + 1];
    if (next === undefined) return onFinish(null);
    setReached((furthest) => Math.max(furthest, at + 1));
    show(next);
  };
  const back = () => {
    const before = flow[at - 1];
    if (before !== undefined) show(before);
  };
  const toToday = () => onFinish(null);

  const chooseLanguage = (next: Language) => {
    onLanguage(next);
    saveLanguage({ payload: { language: next }, reactivityKeys: KEYS.settings });
  };

  return (
    <div className="setup">
      <div className="setup__body">
        <aside className="setup__aside">
          <span className="call">{t.app.mark}</span>
          <h1 className="setup__title">{t.setup.title}</h1>
          <p className="setup__purpose">{t.setup.purpose}</p>
          <p className="setup__length">{t.setup.length}</p>
          <nav aria-label={t.setup.stepsLabel}>
            <ol className="setup-steps">
              {SETUP_STEPS.map((id, index) => {
                const place = flow.indexOf(id);
                return (
                  <li key={id}>
                    <StepRow
                      number={index + 1}
                      name={t.setup.steps[id]}
                      state={
                        step === id
                          ? "current"
                          : place === -1
                            ? "skipped"
                            : (id === "vault" ? vault !== null : place < reached)
                              ? "done"
                              : "open"
                      }
                      locked={busy || place === -1 || place > reached}
                      onOpen={() => show(id)}
                    >
                      <StepValue
                        id={id}
                        language={language}
                        vault={vault}
                        home={parentOf(view.suggestedVaultFolder)}
                        read={place !== -1 && place < reached}
                        skipped={place === -1}
                        chatGptLater={chatGptLater}
                      />
                    </StepRow>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>
        <main className="setup__stage" ref={stage}>
          <div data-step="look" hidden={step !== "look"}>
            <LookStep language={language} onLanguage={chooseLanguage} onNext={forward} />
          </div>
          <div data-step="vault" hidden={step !== "vault"}>
            <VaultStep
              view={view}
              language={language}
              vault={vault}
              onVault={setVault}
              onBusy={setBusy}
              onBack={back}
              onNext={forward}
            />
          </div>
          {vault === null ? null : (
            <>
              <div data-step="sections" hidden={step !== "sections"}>
                <SectionsStep onBack={back} onNext={forward} onToday={toToday} />
              </div>
              <div data-step="chatgpt" hidden={step !== "chatgpt"}>
                <ChatGptStep
                  last={flow.at(-1) === "chatgpt"}
                  onBack={back}
                  onNext={(later) => {
                    setChatGptLater(later);
                    forward();
                  }}
                  onToday={toToday}
                />
              </div>
              <div data-step="book" hidden={step !== "book"}>
                <BookStep onBusy={setBusy} onBack={back} onAdded={onFinish} onToday={toToday} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

type RowState = "current" | "done" | "open" | "skipped";

function StepRow({
  number,
  name,
  state,
  locked,
  onOpen,
  children,
}: {
  readonly number: number;
  readonly name: string;
  readonly state: RowState;
  readonly locked: boolean;
  readonly onOpen: () => void;
  readonly children: ReactNode;
}) {
  const t = useT();
  const body = (
    <>
      <span className="setup-step__number" aria-hidden="true">
        {number}
      </span>
      <span className="setup-step__name">{name}</span>
      {state === "done" ? <Check className="setup-step__check" aria-hidden="true" /> : null}
      <span className="setup-step__value">{children}</span>
      <span className="sr-only">
        {state === "open" ? (locked ? t.setup.stepState.locked : "") : t.setup.stepState[state]}
      </span>
    </>
  );
  if (state === "current") {
    return (
      <span className="setup-step" aria-current="step">
        {body}
      </span>
    );
  }
  if (locked) {
    return (
      <span className="setup-step" data-locked="">
        {body}
      </span>
    );
  }
  return (
    <button type="button" className="setup-step" onClick={onOpen}>
      {body}
    </button>
  );
}

function StepValue({
  id,
  language,
  vault,
  home,
  read,
  skipped,
  chatGptLater,
}: {
  readonly id: SetupStep;
  readonly language: Language;
  readonly vault: Vault | null;
  readonly home: string;
  readonly read: boolean;
  readonly skipped: boolean;
  readonly chatGptLater: boolean;
}) {
  const t = useT();
  const placeWords = usePlaceWords();
  const painted = useAppearance();
  switch (id) {
    case "look":
      return t.setup.lookValue(t.languages[language], t.appearance.themes[painted.theme]);
    case "vault":
      return vault === null ? t.setup.stepHints.vault : placeWords(vault.folder, home);
    case "sections":
      return skipped
        ? t.setup.stepState.skipped
        : read
          ? t.setup.sectionsRead
          : t.setup.stepHints.sections;
    case "chatgpt":
      return <ChatGptValue later={chatGptLater} />;
    case "book":
      return vault !== null && vault.sources > 0
        ? t.setup.vaultHasSources(vault.sources)
        : t.setup.stepHints.book;
  }
}

function ChatGptValue({ later }: { readonly later: boolean }) {
  const t = useT();
  const status = useAtomValue(chatGptStatusAtom);
  const connected = AsyncResult.isSuccess(status) && status.value._tag === "Connected";
  if (connected) return t.setup.chatgptConnected;
  return later ? t.setup.chatgptLater : t.setup.stepHints.chatgpt;
}
