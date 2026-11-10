import { defineRule, type ESTree } from "@oxlint/plugins";

const MESSAGE =
  "Every user-facing string goes through the EN/DA message catalogs. Move this text to apps/web/src/i18n and read it with useT().";

/** Attributes that users read or hear. */
const USER_FACING_ATTRIBUTES = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "label",
  "placeholder",
  "title",
]);

// Separators, numbers and marks such as "·" or "¶" carry no language.
const HAS_LETTER = /\p{L}/u;

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow JSX text and user-facing attributes that bypass the i18n catalogs.",
    },
  },
  create(context) {
    const check = (node: ESTree.Node, text: string) => {
      if (HAS_LETTER.test(text)) context.report({ node, message: MESSAGE });
    };
    return {
      JSXText(node) {
        check(node, node.value);
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || !USER_FACING_ATTRIBUTES.has(node.name.name)) {
          return;
        }
        const value = node.value;
        if (value?.type === "Literal" && typeof value.value === "string") check(value, value.value);
        if (
          value?.type === "JSXExpressionContainer" &&
          value.expression.type === "Literal" &&
          typeof value.expression.value === "string"
        ) {
          check(value.expression, value.expression.value);
        }
      },
    };
  },
});
