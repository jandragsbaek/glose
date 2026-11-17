import { type EmphasisSpan, emphasisSpans, maskReferences } from "./emphasis.ts";

export type Emphasis = EmphasisSpan["kind"];

const MARK: Record<Emphasis, string> = { strong: "**", em: "*" };
const KINDS: ReadonlyArray<Emphasis> = ["strong", "em"];

interface StyleMap {
  readonly marker: Uint8Array;
  readonly strong: Uint8Array;
  readonly em: Uint8Array;
}

const isSpace = (char: string) => /\s/u.test(char);

export const styleMap = (text: string): StyleMap => {
  const marker = new Uint8Array(text.length);
  const strong = new Uint8Array(text.length);
  const em = new Uint8Array(text.length);
  for (const span of emphasisSpans(maskReferences(text))) {
    for (let i = 0; i < span.size; i++) {
      marker[span.open + i] = 1;
      marker[span.close + i] = 1;
    }
    const flags = span.kind === "strong" ? strong : em;
    for (let i = span.open + span.size; i < span.close; i++) flags[i] = 1;
  }
  return { marker, strong, em };
};

const selectedIn = (text: string, map: StyleMap, from: number, to: number) => {
  const out: Array<number> = [];
  for (let i = Math.max(0, from); i < Math.min(text.length, to); i++) {
    if (map.marker[i] === 0 && !isSpace(text[i] ?? "")) out.push(i);
  }
  return out;
};

export const hasAnyText = (text: string, from: number, to: number): boolean =>
  selectedIn(text, styleMap(text), from, to).length > 0;

export const hasStyle = (text: string, from: number, to: number, kind: Emphasis): boolean => {
  const map = styleMap(text);
  const chosen = selectedIn(text, map, from, to);
  return chosen.length > 0 && chosen.every((i) => map[kind][i] === 1);
};

export const restyle = (
  text: string,
  from: number,
  to: number,
  kind: Emphasis,
  turnOn?: boolean,
): { readonly text: string; readonly from: number; readonly to: number } | null => {
  const map = styleMap(text);
  const chosen = selectedIn(text, map, from, to);
  const first = chosen[0];
  const last = chosen.at(-1);
  if (first === undefined || last === undefined) return null;
  const on = turnOn ?? !chosen.every((i) => map[kind][i] === 1);
  const content = Array.from({ length: text.length }, (_, i) => i).filter(
    (i) => map.marker[i] === 0,
  );
  const flags: Record<Emphasis, Uint8Array> = {
    strong: map.strong.slice(),
    em: map.em.slice(),
  };
  for (const i of content) if (i >= first && i <= last) flags[kind][i] = on ? 1 : 0;
  for (const style of KINDS) {
    const run: Array<number> = [];
    const trim = () => {
      for (const i of run) {
        if (!isSpace(text[i] ?? "")) break;
        flags[style][i] = 0;
      }
      for (const i of [...run].reverse()) {
        if (!isSpace(text[i] ?? "")) break;
        flags[style][i] = 0;
      }
      run.length = 0;
    };
    for (const i of content) {
      if (flags[style][i] === 1) run.push(i);
      else trim();
    }
    trim();
  }

  let out = "";
  const stack: Array<Emphasis> = [];
  let pending: Array<Emphasis> = [];
  const placed = new Map<number, number>();
  const close = (kinds: ReadonlyArray<Emphasis>) => {
    const space = /\s*$/u.exec(out)?.[0] ?? "";
    out = out.slice(0, out.length - space.length) + kinds.map((k) => MARK[k]).join("") + space;
  };
  for (const i of content) {
    const char = text[i] ?? "";
    const has = (style: Emphasis) => flags[style][i] === 1;
    const broken = stack.findIndex((style) => !has(style));
    if (broken >= 0) {
      const popped = stack.splice(broken).reverse();
      close(popped);
      pending.push(...popped.filter(has).reverse());
    }
    pending = pending.filter(has);
    for (const style of KINDS) {
      if (has(style) && !stack.includes(style) && !pending.includes(style)) pending.push(style);
    }
    if (!isSpace(char) && pending.length > 0) {
      out += pending.map((style) => MARK[style]).join("");
      stack.push(...pending);
      pending = [];
    }
    placed.set(i, out.length);
    out += char;
  }
  close([...stack].reverse());
  return { text: out, from: placed.get(first) ?? 0, to: (placed.get(last) ?? 0) + 1 };
};
