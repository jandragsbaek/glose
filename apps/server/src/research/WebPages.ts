import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as NodeHttp from "node:http";
import * as NodeHttps from "node:https";
import * as NodeNet from "node:net";
import * as NodeStream from "node:stream";
import * as NodeZlib from "node:zlib";

import { pageFromHtml, pageFromText, type WebPage } from "./pageText.ts";
import { AddressRefused, isPublicAddress, publicLookup } from "./publicAddress.ts";

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

export { isPublicAddress } from "./publicAddress.ts";

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

class Refused extends Error {
  readonly reason: UnreadableReason;
  constructor(reason: UnreadableReason) {
    super(reason);
    this.reason = reason;
  }
}

const literalHost = (url: URL) => url.hostname.replace(/^\[|\]$/g, "");

const get = (url: URL, signal: AbortSignal) =>
  new Promise<NodeHttp.IncomingMessage>((resolve, reject) => {
    const client = url.protocol === "https:" ? NodeHttps : NodeHttp;
    const request = client.request(
      url,
      {
        method: "GET",
        signal,
        lookup: publicLookup,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,text/plain,text/markdown;q=0.9,*/*;q=0.1",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      resolve,
    );
    request.on("error", reject);
    request.end();
  });

const decoderFor = (encoding: string | undefined): NodeStream.Transform | null => {
  switch (encoding) {
    case "gzip":
    case "x-gzip":
      return NodeZlib.createGunzip();
    case "deflate":
      return NodeZlib.createInflate();
    case "br":
      return NodeZlib.createBrotliDecompress();
    default:
      return null;
  }
};

const decoded = (response: NodeHttp.IncomingMessage): NodeStream.Readable => {
  const decoder = decoderFor(response.headers["content-encoding"]);
  return decoder === null ? response : NodeStream.pipeline(response, decoder, () => {});
};

export const readCapped = async (response: NodeHttp.IncomingMessage): Promise<string | null> => {
  const chunks: Array<Buffer> = [];
  let size = 0;
  for await (const chunk of decoded(response)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.byteLength;
    if (size > MAX_BYTES) {
      response.destroy();
      return null;
    }
    chunks.push(buffer);
  }
  const charset = /charset=([\w-]+)/i.exec(response.headers["content-type"] ?? "")?.[1];
  try {
    return new TextDecoder(charset ?? "utf-8").decode(Buffer.concat(chunks));
  } catch {
    return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
  }
};

const reasonOf = (cause: unknown): UnreadableReason =>
  cause instanceof Refused ? cause.reason : cause instanceof AddressRefused ? "address" : "failed";

const fetchPage = async (start: URL): Promise<WebPage> => {
  let url = start;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const host = literalHost(url);
    if (NodeNet.isIP(host) !== 0 && !isPublicAddress(host)) throw new Refused("address");
    if (host === "localhost" || host.endsWith(".localhost")) throw new Refused("address");
    const response = await get(url, signal);
    const status = response.statusCode ?? 0;
    const location = response.headers.location;
    if (status >= 300 && status < 400 && location !== undefined) {
      response.resume();
      const next = webUrl(new URL(location, url).href);
      if (next === null) throw new Refused("address");
      url = next;
      continue;
    }
    if (status === 401 || status === 403 || status === 451) throw new Refused("blocked");
    if (status === 404 || status === 410) throw new Refused("not-found");
    if (status < 200 || status >= 300) throw new Refused("failed");
    const type = (response.headers["content-type"] ?? "text/html").toLowerCase();
    const html = type.includes("html") || type.includes("xml");
    const text = type.startsWith("text/plain") || type.includes("markdown");
    if (!html && !text) {
      response.destroy();
      throw new Refused("not-text");
    }
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
            reason: reasonOf(cause),
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
