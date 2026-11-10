import { useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import { serverInfoAtom } from "../state/server.ts";

export const Route = createFileRoute("/")({ component: Index });

/** Placeholder with no styling: it only proves the window reaches the server over RPC. */
function Index() {
  const status = AsyncResult.match(useAtomValue(serverInfoAtom), {
    onInitial: () => "Connecting to the server.",
    onFailure: () => "The server did not answer.",
    onSuccess: ({ value }) => `Server version ${value.version}`,
  });
  return (
    <main>
      <h1>Glose</h1>
      <p>{status}</p>
    </main>
  );
}
