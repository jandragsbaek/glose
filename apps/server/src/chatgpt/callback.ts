import type { Language } from "@glose/contracts";
import * as Data from "effect/Data";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import type * as NodeNet from "node:net";
import * as NodeHttp from "node:http";

import { CALLBACK_PATH } from "./OpenAi.ts";

/** The callback port is taken, most likely by a Codex sign-in in progress. */
export class PortBusy extends Data.TaggedError("PortBusy")<{ readonly port: number }> {}

export class ListenFailed extends Data.TaggedError("ListenFailed")<{ readonly cause: unknown }> {}

/** The browser tab after the callback. The app itself shows how the sign-in ended. */
const PAGES: Record<Language, { readonly title: string; readonly body: string }> = {
  en: {
    title: "Glose",
    body: "Glose received the answer from ChatGPT. You can close this tab and go back to Glose.",
  },
  da: {
    title: "Glose",
    body: "Glose har fået svaret fra ChatGPT. Du kan lukke denne fane og gå tilbage til Glose.",
  },
};

const page = (language: Language) => {
  const { title, body } = PAGES[language];
  return `<!doctype html><html lang="${language}"><meta charset="utf-8"><title>${title}</title><p>${body}</p></html>`;
};

export interface Listener {
  readonly port: number;
  /** The query of the first callback that carries the attempt's `state`. */
  readonly callback: Effect.Effect<URLSearchParams>;
}

/**
 * A loopback listener on 127.0.0.1 for one sign-in attempt. It answers from the moment it
 * listens, so a fast browser cannot arrive before Glose waits. Requests without the attempt's
 * `state` are refused. The listener closes with the scope, so an ended, cancelled or timed-out
 * attempt never leaves a port open.
 */
export const listen = (port: number, state: string, language: Language) =>
  Effect.acquireRelease(
    Effect.callback<NodeHttp.Server, PortBusy | ListenFailed>((resume) => {
      const server = NodeHttp.createServer();
      server.once("error", (cause: NodeJS.ErrnoException) =>
        resume(
          Effect.fail(
            cause.code === "EADDRINUSE" ? new PortBusy({ port }) : new ListenFailed({ cause }),
          ),
        ),
      );
      server.listen(port, "127.0.0.1", () => resume(Effect.succeed(server)));
    }),
    (server) =>
      Effect.callback<void>((resume) => {
        server.closeAllConnections();
        server.close(() => resume(Effect.void));
      }),
  ).pipe(
    Effect.map((server): Listener => {
      const received = Deferred.makeUnsafe<URLSearchParams>();
      server.on("request", (request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (url.pathname !== CALLBACK_PATH || url.searchParams.get("state") !== state) {
          response.writeHead(404).end();
          return;
        }
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page(language));
        Deferred.doneUnsafe(received, Effect.succeed(url.searchParams));
      });
      return {
        port: (server.address() as NodeNet.AddressInfo).port,
        callback: Deferred.await(received),
      };
    }),
  );
