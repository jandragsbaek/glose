import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as NodeDnsPromises from "node:dns/promises";
import * as NodeNet from "node:net";

import { pageFromHtml, pageFromText, type WebPage } from "./pageText.ts";

export type { WebPage } from "./pageText.ts";

export type UnreadableReason =
  | "address"
  | "blocked"
  | "not-found"
  | "not-text"
  | "too-large"
  | "no-text"
  | "failed";

export class PageUnreadable extends Data.TaggedError("PageUnreadable")<{
  readonly url: string;
  readonly reason: UnreadableReason;
}> {}

export class WebPages extends Context.Service<
  WebPages,
  {
    readonly read: (url: string) => Effect.Effect<WebPage, PageUnreadable>;
  }
>()("glose/research/WebPages") {}

const MAX_BYTES = 5_000_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 20_000;
const CACHED = 60;
const USER_AGENT = "Mozilla/5.0 (compatible; Glose; +https://github.com/jandragsbaek/glose)";

const ipv4Private = (address: string): boolean => {
  const [a = 0, b = 0] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
};

export const isPublicAddress = (address: string): boolean => {
  const kind = NodeNet.isIP(address);
  if (kind === 4) return !ipv4Private(address);
  if (kind !== 6) return false;
  const lower = address.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped !== null) return !ipv4Private(mapped[1]!);
  return !(
    lower === "::" ||
    lower === "::1" ||
    /^f[cd]/.test(lower) ||
    /^fe[89ab]/.test(lower) ||
    /^ff/.test(lower)
  );
};

export const webUrl = (text: string): URL | null => {
  try {
    const url = new URL(text.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username !== "" || url.password !== "") return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
};

const publicHost = async (url: URL): Promise<boolean> => {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (NodeNet.isIP(host) !== 0) return isPublicAddress(host);
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  const addresses = await NodeDnsPromises.lookup(host, { all: true, verbatim: true });
  return addresses.length > 0 && addresses.every(({ address }) => isPublicAddress(address));
};

const readCapped = async (response: Response): Promise<string | null> => {
  const reader = response.body?.getReader();
  if (reader === undefined) return "";
  const chunks: Array<Uint8Array> = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const charset = /charset=([\w-]+)/i.exec(response.headers.get("content-type") ?? "")?.[1];
  const decoder = new TextDecoder(charset ?? "utf-8", { fatal: false });
  return chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") + decoder.decode();
};

class Refused extends Error {
  readonly reason: UnreadableReason;
  constructor(reason: UnreadableReason) {
    super(reason);
    this.reason = reason;
  }
}

const fetchPage = async (start: URL): Promise<WebPage> => {
  let url = start;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await publicHost(url))) throw new Refused("address");
    const response = await fetch(url, {
      redirect: "manual",
      signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,text/plain,text/markdown;q=0.9,*/*;q=0.1",
      },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location !== null) {
      const next = webUrl(new URL(location, url).href);
      if (next === null) throw new Refused("address");
      url = next;
      continue;
    }
    if (response.status === 401 || response.status === 403 || response.status === 451) {
      throw new Refused("blocked");
    }
    if (response.status === 404 || response.status === 410) throw new Refused("not-found");
    if (!response.ok) throw new Refused("failed");
    const type = (response.headers.get("content-type") ?? "text/html").toLowerCase();
    const html = type.includes("html") || type.includes("xml");
    const text = type.startsWith("text/plain") || type.includes("markdown");
    if (!html && !text) throw new Refused("not-text");
    const body = await readCapped(response);
    if (body === null) throw new Refused("too-large");
    const page = html ? pageFromHtml(body, url.href) : pageFromText(body, url.href);
    if (page === null) throw new Refused("no-text");
    return page;
  }
  throw new Refused("failed");
};

export const make = Effect.sync(() => {
  const cache = new Map<string, WebPage>();
  const remember = (key: string, page: WebPage) => {
    cache.delete(key);
    cache.set(key, page);
    while (cache.size > CACHED) cache.delete(cache.keys().next().value!);
  };
  return WebPages.of({
    read: (text) => {
      const url = webUrl(text);
      if (url === null) return Effect.fail(new PageUnreadable({ url: text, reason: "address" }));
      const cached = cache.get(url.href);
      if (cached !== undefined) return Effect.succeed(cached);
      return Effect.tryPromise({
        try: () => fetchPage(url),
        catch: (cause) =>
          new PageUnreadable({
            url: url.href,
            reason: cause instanceof Refused ? cause.reason : "failed",
          }),
      }).pipe(
        Effect.tap((page) =>
          Effect.sync(() => {
            remember(url.href, page);
            remember(page.url, page);
          }),
        ),
      );
    },
  });
});

export const layer = Layer.effect(WebPages, make);

export const layerTest = (pages: ReadonlyMap<string, WebPage>) =>
  Layer.succeed(
    WebPages,
    WebPages.of({
      read: (text) => {
        const url = webUrl(text);
        const page = url === null ? undefined : pages.get(url.href);
        return page === undefined
          ? Effect.fail(new PageUnreadable({ url: text, reason: "not-found" }))
          : Effect.succeed(page);
      },
    }),
  );
