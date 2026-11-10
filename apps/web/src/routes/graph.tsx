import { createFileRoute } from "@tanstack/react-router";

import { Page, Panel } from "../components/ui.tsx";
import { useT } from "../i18n/I18n.tsx";

export const Route = createFileRoute("/graph")({ component: Section });

function Section() {
  const t = useT();
  return (
    <Page title={t.graph.title}>
      <div className="narrow">
        <Panel title={t.graph.title} initial="rubric">
          <div className="panel__body">
            <p className="empty">{t.graph.empty}</p>
          </div>
        </Panel>
      </div>
    </Page>
  );
}
