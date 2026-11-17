import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { describe, expect, it } from "vite-plus/test";

import { THEMES } from "../theme/paint.ts";

const here = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));
const source = NodePath.resolve(here, "..");
const themesDir = NodePath.join(here, "themes");

const cssFiles = (dir: string): ReadonlyArray<string> =>
  NodeFS.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = NodePath.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });

const COLOR_LITERAL =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|:\s*(?:[^;]*\s)?(?:white|black|red|green|blue|gray|grey|silver|navy|orange|yellow|purple|pink|brown)\s*(?:[;!)]|$)/i;
const ALPHA_ONLY = /^\s*(?:-webkit-)?mask(?:-image)?\s*:|^\s*#000\b/;

const withoutComments = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));

interface Block {
  readonly theme: string;
  readonly appearance: string;
  readonly tokens: ReadonlyMap<string, string>;
}

const themeBlocks = (): ReadonlyArray<Block> =>
  THEMES.flatMap((theme) => {
    const css = withoutComments(
      NodeFS.readFileSync(NodePath.join(themesDir, `${theme}.css`), "utf8"),
    );
    return Array.from(
      css.matchAll(/\[data-theme="([a-z]+)"\]\[data-appearance="([a-z]+)"\]\s*\{([^}]*)\}/g),
      ([, blockTheme = "", appearance = "", body = ""]) => ({
        theme: blockTheme,
        appearance,
        tokens: new Map(
          Array.from(body.matchAll(/--([a-z-]+):\s*([^;]+);/g), ([, name = "", value = ""]) => [
            name,
            value.trim(),
          ]),
        ),
      }),
    );
  });

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) =>
    channel(Number.parseInt(hex.slice(at, at + 2), 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

const READABLE: ReadonlyArray<readonly [string, string, number]> = [
  ["ink", "paper", 7],
  ["ink", "ground", 7],
  ["ink", "tint", 7],
  ["ink", "gold-wash", 7],
  ["ink", "rubric-wash", 7],
  ["mute", "paper", 4.5],
  ["mute", "ground", 4.5],
  ["mute", "tint", 4.5],
  ["mute", "tray", 4.5],
  ["accent", "paper", 4.5],
  ["accent", "ground", 4.5],
  ["accent", "tint", 4.5],
  ["rubric", "paper", 4.5],
  ["rubric", "rubric-wash", 4.5],
  ["verdigris", "paper", 4.5],
  ["on-primary", "primary", 4.5],
  ["on-primary", "primary-raised", 4.5],
  ["on-field", "field", 7],
  ["on-field", "field-raised", 4.5],
  ["on-field-mute", "field", 4.5],
  ["gold", "field", 3],
  ["gold", "field-raised", 3],
];

describe("themes", () => {
  it("keeps color values in the theme files, so every stylesheet follows the chosen theme", () => {
    const strays = cssFiles(source)
      .filter((file) => !file.startsWith(themesDir + NodePath.sep))
      .flatMap((file) =>
        withoutComments(NodeFS.readFileSync(file, "utf8"))
          .split("\n")
          .flatMap((line, index) =>
            COLOR_LITERAL.test(line) && !ALPHA_ONLY.test(line)
              ? [`${NodePath.relative(source, file)}:${index + 1}: ${line.trim()}`]
              : [],
          ),
      );
    expect(strays).toEqual([]);
  });

  it("gives every theme a light and a dark variant with the same tokens", () => {
    const blocks = themeBlocks();
    const reference = blocks[0]?.tokens;
    expect(reference?.size).toBeGreaterThan(0);
    expect(blocks.map(({ theme, appearance }) => `${theme}-${appearance}`)).toEqual(
      THEMES.flatMap((theme) => [`${theme}-light`, `${theme}-dark`]),
    );
    for (const block of blocks) {
      expect([...block.tokens.keys()].sort(), `${block.theme} ${block.appearance}`).toEqual(
        [...(reference?.keys() ?? [])].sort(),
      );
    }
  });

  it("keeps text and marks readable in every theme and appearance", () => {
    const failures = themeBlocks().flatMap(({ theme, appearance, tokens }) =>
      READABLE.flatMap(([front, back, floor]) => {
        const ratio = contrast(tokens.get(front) ?? "", tokens.get(back) ?? "");
        return ratio >= floor
          ? []
          : [`${theme} ${appearance}: ${front} on ${back} is ${ratio.toFixed(2)}, needs ${floor}`];
      }),
    );
    expect(failures).toEqual([]);
  });
});
