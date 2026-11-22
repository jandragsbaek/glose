import { type Confidence, openQuestion, QuestionNotOpen, SessionBusy } from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import type * as Semaphore from "effect/Semaphore";
import * as SubscriptionRef from "effect/SubscriptionRef";

import type { Load } from "./liveSession.ts";
import * as Probe from "./probe.ts";
import type { SessionStore } from "./sessionStore.ts";
import type * as SessionTurn from "./sessionTurn.ts";

export const make = ({
  load,
  save,
  deciding,
  beginTurn,
}: {
  readonly load: Load;
  readonly save: SessionStore["save"];
  readonly deciding: Semaphore.Semaphore;
  readonly beginTurn: Effect.Success<ReturnType<typeof SessionTurn.make>>["beginTurn"];
}) => {
  return {
    answerProbe: Effect.fn("Sessions.answerProbe")(
      function* ({
        id,
        question,
        reasoning,
        answer,
        teachMe,
        choice,
        confidence,
      }: {
        readonly id: string;
        readonly question: number;
        readonly reasoning: string;
        readonly answer: string;
        readonly teachMe: boolean;
        readonly choice?: ReadonlyArray<number>;
        readonly confidence?: Confidence;
      }) {
        const session = yield* load(id);
        const view = yield* SubscriptionRef.get(session.view);
        const open = view.kind === "probe" ? openQuestion(view.entries) : null;
        if (open === null || open.number !== question) {
          return yield* new QuestionNotOpen({ id, question });
        }
        const picked = teachMe ? undefined : Probe.validChoice(open, choice);
        if (!teachMe && (open.choice === undefined ? answer === "" : picked === undefined)) {
          return yield* new QuestionNotOpen({ id, question });
        }
        const entry = {
          _tag: "ProbeAnswer" as const,
          question,
          reasoning,
          answer: teachMe || open.choice !== undefined ? "" : answer,
          teachMe,
          ...(picked === undefined ? {} : { choice: picked }),
          ...(teachMe || confidence === undefined ? {} : { confidence }),
        };
        yield* beginTurn(
          session,
          [entry],
          [{ type: "message", role: "user", content: Probe.answerMessage(entry, open) }],
        );
      },
      (effect) => deciding.withPermit(effect),
    ),

    askHint: Effect.fn("Sessions.askHint")(
      function* ({ id, question }: { readonly id: string; readonly question: number }) {
        const session = yield* load(id);
        const view = yield* SubscriptionRef.get(session.view);
        const open = view.kind === "probe" ? openQuestion(view.entries) : null;
        if (open === null || open.number !== question) {
          return yield* new QuestionNotOpen({ id, question });
        }
        yield* beginTurn(
          session,
          [{ _tag: "ProbeHintAsked", question }],
          [{ type: "message", role: "user", content: Probe.hintMessage(question) }],
        );
      },
      (effect) => deciding.withPermit(effect),
    ),

    finishProbe: Effect.fn("Sessions.finishProbe")(
      function* (id: string) {
        const session = yield* load(id);
        const at = yield* Clock.currentTimeMillis;
        const finished = yield* SubscriptionRef.modify(session.view, (view) => {
          if (view.working) return ["busy" as const, view];
          if (view.entries.some((entry) => entry._tag === "ProbeFinished")) {
            return ["already" as const, view];
          }
          return [
            "now" as const,
            {
              ...view,
              problem: null,
              entries: [...view.entries, { _tag: "ProbeFinished" as const, at }],
            },
          ];
        });
        if (finished === "busy") return yield* new SessionBusy({ id });
        if (finished === "now") yield* save(session);
      },
      (effect) => deciding.withPermit(effect),
    ),
  };
};
