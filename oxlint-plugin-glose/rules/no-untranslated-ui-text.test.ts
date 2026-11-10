import { describe } from "@effect/vitest";

import { createOxlintRuleHarness } from "../test/utils.ts";

const rule = createOxlintRuleHarness("glose/no-untranslated-ui-text", {
  filename: "apps/web/src/components/Example.tsx",
});

describe("glose/no-untranslated-ui-text", () => {
  rule.valid(
    "allows catalog messages, separators and non-user-facing attributes",
    `
      const node = (
        <p className="call-number" data-step="free-text">
          {t.today.title} · {count} ¶
        </p>
      );
    `,
  );

  rule.invalid("reports JSX text", `const node = <h1>Today</h1>;`);

  rule.invalid("reports a Danish string", `const node = <span>I dag</span>;`);

  rule.invalid("reports an aria-label literal", `const node = <nav aria-label="Sections" />;`);

  rule.invalid(
    "reports a placeholder in an expression container",
    `const node = <input placeholder={"Family name"} />;`,
  );
});
