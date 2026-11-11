import {
  AI_CHECKS,
  type AiCheckId,
  type Card,
  type CardScore,
  type CardText,
  Check,
  GraphFolderNotSet,
  type JudgeState,
  type Language,
  linkKey,
  ruleChecks,
  type ScoredCard,
  scoreOf,
  StorageError,
  Verdict,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import type * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as NodeCrypto from "node:crypto";

import * as ChatGpt from "../chatgpt/ChatGpt.ts";
import { Responses, ResponsesError } from "../chatgpt/Responses.ts";
import * as ServerConfig from "../config.ts";
import * as Graph from "../graph/Graph.ts";
import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import * as Cards from "./Cards.ts";

type GraphError = GraphFolderNotSet | StorageError;

/** One Card for the AI Checks: its words and the file it is made from. */
export interface JudgeItem extends CardText {
  readonly from: string | null;
}

/** The AI Checks of one item, or why there are none. */
export type Judged = ReadonlyArray<Check> | "off" | "failed";

export class CardChecks extends Context.Service<
  CardChecks,
  {
    /** Rule Checks, and the AI Checks the AI already made; it never calls the AI. */
    readonly score: (cards: ReadonlyArray<Card>) => Effect.Effect<ReadonlyArray<ScoredCard>>;
    /** Runs the AI Checks of these Card files that have none yet. */
    readonly judgeFiles: (files: ReadonlyArray<string>) => Effect.Effect<void, GraphError>;
    /** Runs the AI Checks of Cards that are not saved yet, such as proposed Cards. */
    readonly judge: (items: ReadonlyArray<JudgeItem>) => Effect.Effect<ReadonlyArray<Judged>>;
  }
>()("glose/cards/CardChecks") {}

/** Change it when the prompts change, so the AI checks every Card again. */
export const JUDGE_VERSION = 1;

/** Cards per pair of AI calls; more makes long input and a slow answer. */
export const BATCH = 10;

/** A Note longer than this reaches the AI cut, so a Rich note cannot fill the context. */
const NOTE_CHARS = 12_000;

/** A failed AI Check is tried again after this long, not on every list. */
const RETRY_AFTER_MS = 10 * 60 * 1000;

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", da: "Danish" };

/**
 * The first call sees the questions without their answers, as the reader in a Review does.
 * What it finds shows whether a question has one exact answer, which a judge that sees the
 * expected answer does poorly (docs/ideas.md, "Card Checks").
 */
export const BLIND_INSTRUCTIONS = `You test questions for a spaced-repetition app (like Anki). Each question is shown alone, months after the person read the Note it is made from. You do not see the expected answer.

For each question, write every distinct answer that a fair grader who knows the Note would have to accept as correct.
- If only one answer fits, write one.
- If the question is broad or vague, or can be read in more than one way, write the different correct answers, one for each reading. Write at most four.
- Answers that say the same thing in other words count as one.
- Keep each answer short. Do not explain.
- Write in the language of the question.`;

export const JUDGE_INSTRUCTIONS = (
  language: Language,
) => `You check Cards for a spaced-repetition app (like Anki), against what research says a good Card is (Wozniak's rules of formulating knowledge, Matuschak's properties of good prompts). A Card is a question and its expected answer, reviewed for years.

For each Card you get its question, its expected answer, its Note, and the blind answers: answers another reader gave to the question alone, without seeing the expected answer.

Give each Check a verdict: pass, warn or fail.
- one-answer: The question has one exact correct answer, the expected one. Use the blind answers. Fail if they hold two or more different correct answers, or if they differ in substance from the expected answer, so a reader who answers well would be marked wrong. Warn if they agree on the substance but the question leaves the reader unsure what form or detail the answer needs.
- specific: The question is precise. It says exactly what to recall and is not too broad or vague. Fail for a question about a whole topic ("What about X?", "Explain X", "What is important about X?"). Warn when the reader has to guess which aspect of the subject is asked for.
- self-contained: A reader who sees only the Card, months later and without the Note, knows what it asks. It names its subject and does not lean on "the text", "the author", "this" or "it" without a name. Fail when the question cannot be understood alone; warn when a cue is weak.
- one-idea: The Card asks for one fact or one idea (the minimum information principle). Fail when the answer joins two or more things that a reader could recall separately. Warn when it holds one idea with extra detail to recall.
- true-to-note: The expected answer is correct according to the Note and adds no facts that the Note does not hold. Fail for a wrong or added fact; warn for a stretch of the Note. When a Card has no Note, pass.

Judge strictly, because a weak Card costs the reader time in every Review for years. Do not invent faults: a Card that does its job passes.

For warn or fail, write a note: one short sentence in ${LANGUAGE_NAMES[language]} that says what is wrong and how to fix it, at most 25 words. For pass, write an empty note.`;

const VerdictNote = Schema.Struct({ verdict: Verdict, note: Schema.String });

const BlindAnswers = Schema.Struct({
  cards: Schema.Array(Schema.Struct({ id: Schema.String, answers: Schema.Array(Schema.String) })),
});
const Judgements = Schema.Struct({
  cards: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      checks: Schema.Struct({
        "one-answer": VerdictNote,
        specific: VerdictNote,
        "self-contained": VerdictNote,
        "one-idea": VerdictNote,
        "true-to-note": VerdictNote,
      }),
    }),
  ),
});

const strictObject = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const BLIND_SCHEMA = strictObject({
  cards: {
    type: "array",
    items: strictObject({
      id: { type: "string" },
      answers: { type: "array", items: { type: "string" } },
    }),
  },
});

const VERDICT_SCHEMA = strictObject({
  verdict: { type: "string", enum: ["pass", "warn", "fail"] },
  note: { type: "string" },
});

const JUDGE_SCHEMA = strictObject({
  cards: {
    type: "array",
    items: strictObject({
      id: { type: "string" },
      checks: strictObject(Object.fromEntries(AI_CHECKS.map((id) => [id, VERDICT_SCHEMA]))),
    }),
  },
});

/** The AI Checks the app keeps, by a hash of what they were made from. */
const CacheFile = Schema.Struct({
  version: Schema.Literal(1),
  entries: Schema.Record(Schema.String, Schema.Array(Check)),
});
const decodeBlind = Schema.decodeUnknownEffect(Schema.fromJsonString(BlindAnswers));
const decodeJudgements = Schema.decodeUnknownEffect(Schema.fromJsonString(Judgements));

const CacheJson = Schema.fromJsonString(CacheFile);
const decodeCache = Schema.decodeUnknownEffect(CacheJson);
const encodeCache = Schema.encodeEffect(CacheJson);

const outputText = (item: Readonly<Record<string, unknown>>) => {
  if (item.type !== "message" || !Array.isArray(item.content)) return "";
  return item.content
    .map((part: unknown) =>
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      part.type === "output_text" &&
      "text" in part &&
      typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("");
};

/** The Note as the AI reads it, under its name. */
const noteBlock = (name: string, text: string) =>
  `=== Note: ${name} ===\n${text.length > NOTE_CHARS ? `${text.slice(0, NOTE_CHARS)}\n[…]` : text}`;

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { dataDir } = yield* ServerConfig.ServerConfig;
  const settings = yield* Settings.Settings;
  const graph = yield* Graph.Graph;
  const cards = yield* Cards.Cards;
  const chatGpt = yield* ChatGpt.ChatGpt;
  const responses = yield* Responses;

  // Per computer, beside the app settings: a cache that a sync client must not merge.
  const cacheFile = path.join(dataDir, "card-checks.json");
  let cache: Map<string, ReadonlyArray<Check>> | null = null;
  /** When the AI Checks of a hash last failed. */
  const failures = new Map<string, number>();
  const judging = yield* Semaphore.make(1);

  const loadCache = Effect.gen(function* () {
    if (cache !== null) return cache;
    const read = yield* fs.readFileString(cacheFile).pipe(
      Effect.flatMap(decodeCache),
      // A missing or unreadable cache only means the AI checks the Cards again.
      Effect.option,
    );
    cache = new Map(
      Option.match(read, { onNone: () => [], onSome: (file) => Object.entries(file.entries) }),
    );
    return cache;
  });

  const saveCache = Effect.gen(function* () {
    if (cache === null) return;
    yield* fs.makeDirectory(dataDir, { recursive: true });
    const json = yield* encodeCache({ version: 1, entries: Object.fromEntries(cache) });
    yield* writeFileAtomic(fs, cacheFile, json);
  }).pipe(Effect.catch((error) => Effect.logWarning("Card Checks not saved", error)));

  const language = settings.get.pipe(
    Effect.map(({ settings }) => settings.language ?? "en"),
    Effect.orElseSucceed((): Language => "en"),
  );

  /** The text of each Graph file by its link key; empty when the Graph cannot be read. */
  const noteTexts = graph.read.pipe(
    Effect.map(
      (view) =>
        new Map(view.nodes.map((node) => [linkKey(node.id), { name: node.id, text: node.body }])),
    ),
    Effect.orElseSucceed(() => new Map<string, { name: string; text: string }>()),
  );

  /** True when the AI may run on the user's ChatGPT plan now. */
  const connected = chatGpt.status.pipe(
    Stream.runHead,
    Effect.map((status) =>
      Option.match(status, {
        onNone: () => false,
        onSome: (now) => now._tag === "Connected" && now.planUsage,
      }),
    ),
  );

  const keyOf = (
    lang: Language,
    item: JudgeItem,
    notes: ReadonlyMap<string, { readonly text: string }>,
  ) => {
    const note = item.from === null ? null : (notes.get(linkKey(item.from))?.text ?? null);
    return NodeCrypto.createHash("sha256")
      .update(JSON.stringify([JUDGE_VERSION, lang, item.question, item.answer, note]))
      .digest("hex");
  };

  /** A Card without a Note has nothing to be true to. */
  const relevant = (item: JudgeItem, checks: ReadonlyArray<Check>) =>
    item.from === null ? checks.filter((check) => check.id !== "true-to-note") : checks;

  const recentlyFailed = (key: string, now: number) => {
    const at = failures.get(key);
    return at !== undefined && now - at < RETRY_AFTER_MS;
  };

  /** One call with a structured answer. */
  const ask = Effect.fn("CardChecks.ask")(function* <A>(
    token: Redacted.Redacted<string>,
    model: string,
    instructions: string,
    input: string,
    name: string,
    schema: Readonly<Record<string, unknown>>,
    decode: (text: string) => Effect.Effect<A, Schema.SchemaError>,
  ) {
    let text = "";
    let completed = false;
    yield* responses
      .stream(token, {
        model,
        instructions,
        input: [{ type: "message", role: "user", content: input }],
        tools: [],
        tool_choice: "auto",
        parallel_tool_calls: false,
        store: false,
        stream: true,
        text: { format: { type: "json_schema", name, strict: true, schema } },
      })
      .pipe(
        Stream.runForEach((event) =>
          Effect.sync(() => {
            if (event._tag === "ItemDone") text += outputText(event.item);
            if (event._tag === "Completed") completed = true;
          }),
        ),
      );
    if (!completed) {
      return yield* new ResponsesError({
        status: null,
        code: null,
        detail: "stream ended early",
      });
    }
    return yield* decode(text).pipe(
      Effect.mapError(
        (error) => new ResponsesError({ status: null, code: null, detail: String(error) }),
      ),
    );
  });

  /** The AI Checks of one batch: a blind call, then the judge. */
  const judgeBatch = Effect.fn("CardChecks.judgeBatch")(function* (
    token: Redacted.Redacted<string>,
    model: string,
    lang: Language,
    batch: ReadonlyArray<{ readonly key: string; readonly item: JudgeItem }>,
    notes: ReadonlyMap<string, { readonly name: string; readonly text: string }>,
  ) {
    const noteOf = (item: JudgeItem) =>
      item.from === null ? null : (notes.get(linkKey(item.from)) ?? null);
    const used = new Map(
      batch.flatMap(({ item }) => {
        const note = noteOf(item);
        return note === null ? [] : [[note.name, note.text] as const];
      }),
    );
    const notesText =
      used.size === 0
        ? "No Notes."
        : [...used].map(([name, text]) => noteBlock(name, text)).join("\n\n");
    const ids = batch.map((_, index) => String(index + 1));

    const blind = yield* ask(
      token,
      model,
      BLIND_INSTRUCTIONS,
      `${notesText}\n\nQuestions:\n${JSON.stringify(
        batch.map(({ item }, index) => ({
          id: ids[index],
          note: noteOf(item)?.name ?? null,
          question: item.question,
        })),
        null,
        1,
      )}`,
      "blind_answers",
      BLIND_SCHEMA,
      decodeBlind,
    );
    const blindById = new Map(blind.cards.map((card) => [card.id, card.answers]));

    const judged = yield* ask(
      token,
      model,
      JUDGE_INSTRUCTIONS(lang),
      `${notesText}\n\nCards:\n${JSON.stringify(
        batch.map(({ item }, index) => ({
          id: ids[index],
          note: noteOf(item)?.name ?? null,
          question: item.question,
          expectedAnswer: item.answer,
          blindAnswers: blindById.get(ids[index] ?? "") ?? [],
        })),
        null,
        1,
      )}`,
      "card_checks",
      JUDGE_SCHEMA,
      decodeJudgements,
    );
    const byId = new Map(judged.cards.map((card) => [card.id, card.checks]));
    return batch.map((_, index): ReadonlyArray<Check> | null => {
      const checks = byId.get(ids[index] ?? "");
      if (checks === undefined) return null;
      return AI_CHECKS.map((id: AiCheckId) => ({
        id,
        verdict: checks[id].verdict,
        note:
          checks[id].verdict === "pass" || checks[id].note.trim() === ""
            ? null
            : checks[id].note.trim(),
      }));
    });
  });

  const judge = Effect.fn("CardChecks.judge")(
    function* (items: ReadonlyArray<JudgeItem>) {
      const lang = yield* language;
      const notes = yield* noteTexts;
      const known = yield* loadCache;
      const keys = items.map((item) => keyOf(lang, item, notes));

      const waiting = new Map<string, JudgeItem>();
      keys.forEach((key, index) => {
        const item = items[index];
        if (item !== undefined && !known.has(key)) waiting.set(key, item);
      });

      let unavailable: "off" | "failed" | null = null;
      if (waiting.size > 0) {
        const access = yield* chatGpt.accessToken.pipe(Effect.result);
        if (access._tag === "Failure") {
          unavailable = access.failure.reason === "unavailable" ? "failed" : "off";
          // Recorded, so a list shows them failed for a while, not pending to be asked again.
          const now = yield* Clock.currentTimeMillis;
          for (const key of waiting.keys()) failures.set(key, now);
        } else {
          const token = access.success;
          const model = yield* responses.models(token).pipe(
            Effect.map((models) => models[0]?.slug ?? null),
            Effect.orElseSucceed(() => null),
          );
          const pending = [...waiting].map(([key, item]) => ({ key, item }));
          for (let start = 0; start < pending.length; start += BATCH) {
            const batch = pending.slice(start, start + BATCH);
            const results =
              model === null
                ? null
                : yield* judgeBatch(token, model, lang, batch, notes).pipe(
                    Effect.catch((error) =>
                      Effect.logWarning("Card Checks failed", error).pipe(Effect.as(null)),
                    ),
                  );
            const now = yield* Clock.currentTimeMillis;
            batch.forEach(({ key }, index) => {
              const checks = results?.[index] ?? null;
              if (checks === null) failures.set(key, now);
              else {
                known.set(key, checks);
                failures.delete(key);
              }
            });
            yield* saveCache;
          }
        }
      }

      return items.map((item, index): Judged => {
        const checks = known.get(keys[index] ?? "");
        if (checks !== undefined) return relevant(item, checks);
        return unavailable ?? "failed";
      });
    },
    (effect) => judging.withPermit(effect),
  );

  /** Cards made from the same Note can be confused with each other in a Review. */
  const siblingsOf = (all: ReadonlyArray<Card>) => {
    const byNote = new Map<string, Array<Card>>();
    for (const card of all) {
      const key = card.from === null ? "" : linkKey(card.from);
      byNote.set(key, [...(byNote.get(key) ?? []), card]);
    }
    return (card: Card) =>
      (byNote.get(card.from === null ? "" : linkKey(card.from)) ?? []).filter(
        (other) => other.file !== card.file,
      );
  };

  return CardChecks.of({
    score: Effect.fn("CardChecks.score")(function* (all) {
      const lang = yield* language;
      const notes = yield* noteTexts;
      const known = yield* loadCache;
      const now = yield* Clock.currentTimeMillis;
      const canJudge = yield* connected;
      const siblings = siblingsOf(all);
      return all.map((card): ScoredCard => {
        const rules = ruleChecks(card, siblings(card));
        const key = keyOf(lang, card, notes);
        const ai = known.get(key);
        const score: CardScore =
          ai !== undefined
            ? scoreOf([...rules, ...relevant(card, ai)], "done")
            : scoreOf(rules, judgeState(canJudge, recentlyFailed(key, now)));
        return { ...card, score };
      });
    }),

    judgeFiles: Effect.fn("CardChecks.judgeFiles")(function* (files) {
      const wanted = new Set(files);
      const chosen = (yield* cards.list).filter((card) => wanted.has(card.file));
      if (chosen.length > 0) yield* judge(chosen);
    }),

    judge,
  });
});

const judgeState = (canJudge: boolean, failed: boolean): JudgeState =>
  !canJudge ? "off" : failed ? "failed" : "pending";

export const layer = Layer.effect(CardChecks, make);
