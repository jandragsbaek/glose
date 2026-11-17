import {
  effect,
  productCopy,
  react,
  reactCompiler,
  recommended,
  tests,
  theming,
  uiText,
} from "@jandragsbaek/oxlint-plugin/presets";
import "vite-plus/test/config";
import { defineConfig } from "vite-plus";

const GENERATED_AND_BUILD_OUTPUT = [
  "dist",
  "dist-electron",
  "release",
  "node_modules",
  "pnpm-lock.yaml",
  "*.tsbuildinfo",
  "**/routeTree.gen.ts",
];

const REACT_SOURCES = ["apps/web/src/**"];
const tsx = (globs: ReadonlyArray<string>) => globs.map((glob) => `${glob}/*.{ts,tsx}`);

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-electron/**",
      "**/release/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
    hookTimeout: 60_000,
    testTimeout: 60_000,
    allowOnly: !process.env.CI,
    retry: 0,
    fakeTimers: {
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "setImmediate",
        "clearImmediate",
        "Date",
        "performance",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "requestIdleCallback",
        "cancelIdleCallback",
      ],
    },
  },
  staged: {
    "*": ["vp fmt --no-error-on-unmatched-pattern", "vp lint --no-error-on-unmatched-pattern"],
  },
  fmt: {
    ignorePatterns: GENERATED_AND_BUILD_OUTPUT,
    sortPackageJson: {},
  },
  lint: {
    extends: [
      recommended,
      tests,
      effect,
      react,
      reactCompiler({ files: tsx(REACT_SOURCES) }),
      productCopy({ files: ["apps/*/src/**", "packages/*/src/**"] }),
      theming({
        files: ["apps/*/src/**"],
        message:
          "Colors come from the theme. Read a token from apps/web/src/styles/themes (var(--accent), or the Graph's palette) instead of a color literal.",
      }),
      uiText({
        files: REACT_SOURCES,
        message:
          "Every user-facing string goes through the EN/DA message catalogs. Move this text to apps/web/src/i18n and read it with useT().",
      }),
    ],
    ignorePatterns: GENERATED_AND_BUILD_OUTPUT,
    options: {
      typeAware: false,
      typeCheck: false,
    },
  },
});
