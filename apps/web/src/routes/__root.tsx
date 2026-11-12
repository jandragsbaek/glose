import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { createRootRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import { PlanNotice } from "../components/PlanNotice.tsx";
import { Rail } from "../components/Rail.tsx";
import { Setup } from "../components/Setup.tsx";
import { BackupSheet } from "../components/Backup.tsx";
import { StatusBar } from "../components/StatusBar.tsx";
import { Notice, Page } from "../components/ui.tsx";
import { I18nProvider, systemLanguage, useT } from "../i18n/I18n.tsx";
import { settingsAtom } from "../state/graph.ts";

import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import "@fontsource/cinzel-decorative/700.css";
import "../styles/app.css";

export const Route = createRootRoute({ component: Root, notFoundComponent: NotFound });

/** Screens that fill the window without the rail, so nothing else asks for attention. */
const FOCUS_SCREENS: ReadonlySet<string> = new Set(["/review"]);

/** Glose opens straight into the user's work; a first start shows the setup instead. */
function Root() {
  const settings = useAtomValue(settingsAtom);
  const focus = useRouterState({ select: (state) => FOCUS_SCREENS.has(state.location.pathname) });
  return AsyncResult.matchWithError(settings, {
    onInitial: () => null,
    onError: () => (
      <I18nProvider language={systemLanguage()}>
        <BootError />
      </I18nProvider>
    ),
    onDefect: () => (
      <I18nProvider language={systemLanguage()}>
        <BootError />
      </I18nProvider>
    ),
    onSuccess: ({ value }) => {
      const language = value.settings.language ?? systemLanguage();
      if (value.settings.graphFolder === null) {
        return <Setup view={value} initialLanguage={language} />;
      }
      if (focus) {
        return (
          <I18nProvider language={language}>
            <Outlet />
          </I18nProvider>
        );
      }
      return (
        <I18nProvider language={language}>
          <div className="frame">
            <Rail language={language} />
            <div className="frame__body">
              <main className="main">
                <Outlet />
              </main>
              <StatusBar />
            </div>
          </div>
          <PlanNotice />
          <BackupSheet />
        </I18nProvider>
      );
    },
  });
}

function BootError() {
  const t = useT();
  const refresh = useAtomRefresh(settingsAtom);
  return (
    <main className="main">
      <Page title={t.app.name}>
        <div className="narrow">
          <Notice tone="error" title={t.errors.storage}>
            <p>{t.errors.storageRecovery}</p>
          </Notice>
          <p style={{ marginTop: 16 }}>
            <button type="button" className="button" onClick={refresh}>
              {t.common.retry}
            </button>
          </p>
        </div>
      </Page>
    </main>
  );
}

function NotFound() {
  const t = useT();
  return (
    <Page title={t.errors.notFoundTitle}>
      <p className="empty">{t.errors.notFound}</p>
      <p style={{ marginTop: 16 }}>
        <Link to="/" className="button">
          {t.errors.backToToday}
        </Link>
      </p>
    </Page>
  );
}
