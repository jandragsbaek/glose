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

const NAMED_COLORS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue " +
    "blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk " +
    "crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
    "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue " +
    "dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite " +
    "gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen " +
    "lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen " +
    "magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
    "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream " +
    "mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen " +
    "steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" "),
);

const COLOR_IN_VALUE =
  /#[0-9a-f]{3,8}\b|%23[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const WORD = /(?<![\w-])[a-z]+(?![\w-])/gi;

interface Declaration {
  readonly property: string;
  readonly value: string;
  readonly line: number;
}

const declarations = (css: string): ReadonlyArray<Declaration> =>
  Array.from(css.matchAll(/[^{};]+/g), (match) => {
    const text = match[0];
    const colon = text.indexOf(":");
    const property = text.slice(0, colon).trim();
    const line = css.slice(0, match.index + text.search(/\S|$/)).split("\n").length;
    return { property, value: text.slice(colon + 1), line };
  }).filter(({ property }) => /^(?:--)?[a-z-]+$/.test(property));

const hasColor = (value: string) =>
  COLOR_IN_VALUE.test(value) ||
  Array.from(value.matchAll(WORD), ([word]) => word.toLowerCase()).some((word) =>
    NAMED_COLORS.has(word),
  );

const codeFiles = (dir: string): ReadonlyArray<string> =>
  NodeFS.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = NodePath.join(dir, entry.name);
    if (entry.isDirectory()) return codeFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
  });

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
  ["verdigris", "ground", 4.5],
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
        declarations(withoutComments(NodeFS.readFileSync(file, "utf8")))
          .filter(({ value }) => hasColor(value))
          .map(
            ({ property, value, line }) =>
              `${NodePath.relative(source, file)}:${line}: ${property}:${value.trim()}`,
          ),
      );
    expect(strays).toEqual([]);
  });

  it("defines every token a stylesheet reads", () => {
    const css = cssFiles(source).map((file) => withoutComments(NodeFS.readFileSync(file, "utf8")));
    const defined = new Set([
      ...css.flatMap((text) =>
        Array.from(text.matchAll(/(--[a-z-]+)\s*:/g), ([, name = ""]) => name),
      ),
      ...codeFiles(source).flatMap((file) =>
        Array.from(
          NodeFS.readFileSync(file, "utf8").matchAll(/["'](--[a-z-]+)["']\s*:/g),
          ([, name = ""]) => name,
        ),
      ),
    ]);
    const missing = [
      ...new Set(
        css.flatMap((text) =>
          Array.from(text.matchAll(/var\((--[a-z-]+)/g), ([, name = ""]) => name),
        ),
      ),
    ].filter((name) => !defined.has(name));
    expect(missing).toEqual([]);
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
