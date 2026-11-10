import { createFileRoute } from "@tanstack/react-router";

import { Page, Panel } from "../components/ui.tsx";
import { useT } from "../i18n/I18n.tsx";

export const Route = createFileRoute("/recall")({ component: Section });

function Section() {
  const t = useT();
  return (
    <Page title={t.recall.title}>
      <div className="narrow">
        <Panel title={t.recall.title} initial="rubric">
          <div className="panel__body">
            <p className="empty">{t.recall.empty}</p>
          </div>
        </Panel>
      </div>
    </Page>
  );
}
