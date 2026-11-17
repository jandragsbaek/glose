import {
  choiceResult,
  judgmentsOf,
  type Language,
  linkKey,
  probeFindings,
  type ReadingStart,
  type SessionEntry,
  type SourceKind,
} from "@glose/contracts";
import * as Effect from "effect/Effect";

import type { AgentTool, InputItem } from "./agent.ts";
import { readArticleTool } from "./articleTools.ts";
import { readNoteTool, searchGraphTool } from "./graphTools.ts";
import { answerOf, type Context, NO_ARGUMENTS, probeTools, questionsOf } from "./probeTools.ts";

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", da: "Danish" };

export const INSTRUCTIONS = `You are the AI in Glose, a desktop app where a person learns from what they read. You run the Probe of the Reading Stage for one Source (usually a book): one adaptive conversation that finds what the user knows about it, what they do not know, and what they still must learn. You are a tutor, not an examiner: the goal is that the user understands, and that both of you know exactly where they stand.

The loop:
1. Plan. Start with read_source (and read_article for an Article or a Course lesson), look at the user's Notes, then call plan_topics with the Source's main topics, the most important first (often 5 to 10). Revise the plan with plan_topics when the answers show a topic you missed.
2. Ask ONE question with ask_question, then end your turn. The user answers with their Reasoning (how they got there, in their own words), their answer, and how sure they are (sure, unsure, guess; it may be missing).
3. Judge every answer with judge_answer. Judge the Reasoning and the result apart: the Reasoning can be sound while the result is wrong, or the other way round. Say why in one short sentence each. When one sentence of their Reasoning shows the misunderstanding, give its exact words as quote, copied character for character. When the user gave no Reasoning, its verdict is "none".
4. When the answer shows a gap (the result is not right, or the Reasoning is not sound), teach that part with teach (kind "gap"): short, plain, true to the Source, aimed at the exact misunderstanding. Then ask about the same topic again in other words, with again_of set to the question you repeat. A gap closes only when the user answers it.
5. When the user asks to be taught instead of answering, teach the topic (kind "gap"), then ask again in other words.
6. When the answer shows no gap, move on to the next topic of your plan that matters.

Question forms (ask_question's form):
- "open": the user explains in their own words. Use it most: questions that make the user explain, apply or connect, not recall a word: why, how, what follows, what would change.
- "choice": 2 to 5 short options; select "one" (exactly one right option) or "many" (choose all that apply; at least one right). Glose shows "Choose one" or "Choose all that apply" itself, so do not say it in the question. Use it to tell apart ideas the user may confuse, to check a claim quickly before going deeper, or as a step down when an open question on the topic went badly. Every wrong option must be plausible and test one specific misconception, named in its tests field (for example "confuses attention residue with fatigue"); a right option's tests is null. No trick options, no "all of the above", no options that differ only in wording. Glose checks the choice itself: in judge_answer, give the result Glose's check gives (judge_answer refuses another), judge the Reasoning ("why this one?"), and say in result_why what the choice shows. A right choice with no Reasoning is not yet understanding: follow it later with an open question on the same topic.
- Mix the forms. Do not ask two choice questions in a row on the same topic.

How sure:
- Sure and wrong is a misconception: teach it plainly and ask again.
- Guess and right is not known yet, and neither is a right choice with no Reasoning: Glose counts them "right, not confirmed yet". Ask about the topic again later in another form, usually open.
- Unsure and right: say what was right in result_why, so the user can trust it.

Help and talk:
- The user may ask for a hint (a message "(Hint for question N)"). Give ONE hint with give_hint: a nudge toward the idea, a smaller question, or where to look, never the answer itself. Then end your turn; the question stays open.
- The user may write to you at any time. A message that starts "(While question N is open)" is not an answer. Answer it in one to three sentences, then end your turn; do not ask a new question, the question stays open. If they ask what the question means, say it in other words without giving the answer away. Never say anything that settles the open question; if they want help with it, point them to "Give me a hint". If they ask about the Source, answer, and say when you are unsure.
- If the user disputes a judgment (a message "(About your judgment of question N)"), consider it honestly. If they are right, call judge_answer again on that question with the corrected verdicts; if the key of a choice question was wrong, also give corrected_options (each option, in order: right, and what a wrong one tests), and Glose corrects the key. If not, say why in one or two sentences. Never change a judgment only to please.

How to work:
- Use list_notes, search_graph and read_note to see what the user's Graph already holds about the Source.
- Cover the Source's main ideas, one topic at a time, the most important first. Name each topic in a few words; use the same name for every question on it, and the names of your plan.
- One question at a time; never a list of questions.
- Your teaching comes from your knowledge of the Source, not from the user's copy. If you are unsure what the Source says, say so in the teaching.
- An Article or a Course lesson brings its text: read it with read_article. Then your questions and your teaching come from the text, the user's own copy. When you teach, give the paragraph your teaching rests on in teach's paragraph, so the user can read it there.
- Go deeper: a user's message may start with "(Go deeper on ¶ N)". The user is reading and marked that Passage. Ask about that Passage only, one question at a time, and teach its gap as always; do not make a plan for it. When the user's answers show they understand it, call close_passage, say so in one short sentence, and end your turn. Do not move on to another topic then: the Probe of the whole Source comes later, when the user asks for it.
- When you have covered the topics of your plan (often after 8 to 15 questions), call mark_covered and tell the user they can finish the Probe. Keep going if they answer more.
- Your messages are optional and short: one or two sentences at most. Never repeat in a message the question, the options, the judgment, the hint or the teaching; they show by themselves.
- Write in the language the user answers in; before their first answer, in the interface language named in the first message. Write plain text.`;

const START_NOTES: Record<ReadingStart, string> = {
  write:
    "The user started by writing Free text, then made Notes in Extraction. Question them on the Source; list_notes shows the Notes they wrote, so you can test what the Notes claim.",
  probe:
    "The user read the Source and chose to be questioned first. They have no Notes from it yet; what you find feeds Extraction, which makes the Notes after the Probe.",
  "catch-up":
    'The user read the Source a while ago, or only in part, and chose to be questioned first. Before the first question on each topic, explain the topic briefly with teach (kind "intro"), then ask. What you find feeds Extraction, which makes the Notes after the Probe.',
};

const TEXT_NOTE =
  "This Source is an Article or a Course lesson, read in Glose: read_article gives its text and the Passages the user marked.";

export const kickoff = (
  language: Language,
  start: ReadingStart,
  kind: SourceKind = "book",
): InputItem => ({
  type: "message",
  role: "developer",
  content: `Start the Probe now. The user's interface language is ${LANGUAGE_NAMES[language]}. ${START_NOTES[start]}${kind === "book" ? "" : ` ${TEXT_NOTE}`}`,
});

export const readingKickoff = (language: Language): InputItem => ({
  type: "message",
  role: "developer",
  content: `The user is reading this Source in Glose and asked to go deeper on one Passage. The user's interface language is ${LANGUAGE_NAMES[language]}. ${TEXT_NOTE} Work only on the Passage in the next message; the Probe of the whole Source comes later.`,
});

export const focusMessage = (focus: {
  readonly paragraph: number;
  readonly text: string;
  readonly words: string | null;
}): string =>
  [
    `(Go deeper on ¶ ${focus.paragraph}) I marked this Passage while reading:`,
    `"${focus.text}"`,
    ...(focus.words === null ? [] : [`My words on it:\n${focus.words}`]),
    "Question me on it.",
  ].join("\n\n");

export const continueMessage: InputItem = {
  type: "message",
  role: "developer",
  content:
    "The user has finished reading and asks for the Probe of the whole Source now. Make your plan with plan_topics, then cover its main ideas you have not asked about yet, the most important first.",
};

const LETTERS = "ABCDEFGH";

export const optionLetter = (index: number) => LETTERS[index] ?? String(index + 1);

const CONFIDENCE_WORDS = { sure: "sure", unsure: "unsure", guess: "guessing" } as const;

export const answerMessage = (
  answer: Extract<SessionEntry, { _tag: "ProbeAnswer" }>,
  question?: Extract<SessionEntry, { _tag: "ProbeQuestion" }>,
): string => {
  if (answer.teachMe) {
    return `(Answer to question ${answer.question}) I do not know. Please teach me.${answer.reasoning === "" ? "" : `\n\nWhat I thought:\n${answer.reasoning}`}`;
  }
  const choice = question?.choice;
  const chosen = answer.choice ?? [];
  const picked =
    choice === undefined
      ? null
      : chosen.map((index) => `${optionLetter(index)}) ${choice.options[index] ?? ""}`).join("\n");
  const checked =
    choice?.right === undefined
      ? null
      : `Glose checked the choice: ${choiceResult(choice.select, choice.right, chosen)}.${chosen
          .map((index) => choice.tests?.[index] ?? null)
          .filter((tests): tests is string => tests !== null)
          .map((tests) => ` A chosen option tests: ${tests}.`)
          .join("")}`;
  return [
    `(Answer to question ${answer.question})`,
    `My Reasoning:\n${answer.reasoning === "" ? "(none given)" : answer.reasoning}`,
    picked === null
      ? `My answer:\n${answer.answer === "" ? "(none given)" : answer.answer}`
      : `My choice:\n${picked}`,
    ...(answer.confidence === undefined
      ? []
      : [`How sure I am: ${CONFIDENCE_WORDS[answer.confidence]}`]),
    ...(checked === null ? [] : [checked]),
  ].join("\n\n");
};

export const validChoice = (
  question: Extract<SessionEntry, { _tag: "ProbeQuestion" }>,
  choice: ReadonlyArray<number> | undefined,
): ReadonlyArray<number> | undefined => {
  if (question.choice === undefined || choice === undefined) return undefined;
  const count = question.choice.options.length;
  const picked = [...new Set(choice)].toSorted((a, b) => a - b);
  if (picked.length === 0 || picked.some((i) => !Number.isInteger(i) || i < 0 || i >= count)) {
    return undefined;
  }
  if (question.choice.select === "one" && picked.length !== 1) return undefined;
  return picked;
};

export const hintMessage = (question: number): string =>
  `(Hint for question ${question}) Give me a hint, not the answer.`;

export const openMessage = (question: number, text: string): string =>
  `(While question ${question} is open) ${text}`;

export const judgmentMessage = (question: number, text: string, open: number | null): string =>
  `(About your judgment of question ${question}${open === null ? "" : `; question ${open} is still open`}) ${text}`;

export const tools = ({ sources, graph, source, update }: Context): AgentTool[] => [
  {
    name: "read_source",
    entry: "read-source",
    description:
      "Read the Source of this Probe: its bibliographic data, how the user started it, and their Free text.",
    parameters: NO_ARGUMENTS,
    run: () =>
      sources.get(source).pipe(
        Effect.map((found) => ({
          id: found.id,
          kind: found.kind,
          author: { family: found.familyName, given: found.givenName },
          otherAuthors: found.otherAuthors,
          title: found.title,
          appearedIn: found.container,
          lesson: found.part,
          firstPublished: found.firstPublished,
          edition: found.edition,
          translator: found.translator,
          readingStart: found.readingStart,
          readingStep: found.readingStep,
          freeText: found.freeText,
        })),
        Effect.orElseSucceed(() => ({ error: "The Source could not be read." })),
      ),
  },
  {
    name: "list_notes",
    entry: "list-notes",
    description: "List the Notes the user made from this Source, with the start of each.",
    parameters: NO_ARGUMENTS,
    run: () =>
      graph.read.pipe(
        Effect.map((view) => ({
          notes: view.nodes
            .filter(
              (node) =>
                node.kind === "note" &&
                node.sourceId !== null &&
                linkKey(node.sourceId) === linkKey(source),
            )
            .map((node) => ({
              name: node.id,
              page: node.page,
              start: node.body.replace(/\s+/g, " ").trim().slice(0, 240),
            })),
        })),
        Effect.orElseSucceed(() => ({ error: "The Graph could not be read." })),
      ),
  },
  searchGraphTool(graph),
  readNoteTool(graph),
  readArticleTool(sources, source),
  ...probeTools({ sources, graph, source, update }),
];

export const userWords = (entries: ReadonlyArray<SessionEntry>): string =>
  entries
    .flatMap((entry) => (entry._tag === "ProbeAnswer" ? [entry.reasoning, entry.answer] : []))
    .filter((text) => text !== "")
    .join("\n\n");

export const forExtraction = (entries: ReadonlyArray<SessionEntry>) => ({
  findings: probeFindings(entries).map(({ topic, state }) => ({ topic, state })),
  questions: questionsOf(entries).map((question) => {
    const answer = answerOf(entries, question.number);
    const judgment = judgmentsOf(entries, question.number).at(-1);
    return {
      number: question.number,
      topic: question.topic,
      question: question.text,
      ...(question.choice === undefined
        ? {}
        : {
            options: question.choice.options,
            chosen: answer?.choice?.map((index) => question.choice?.options[index] ?? "") ?? null,
          }),
      reasoning: answer?.reasoning ?? null,
      answer: answer?.answer ?? null,
      howSure: answer?.confidence ?? null,
      askedToBeTaught: answer?.teachMe ?? false,
      hints: entries.filter(
        (entry) => entry._tag === "ProbeHint" && entry.question === question.number,
      ).length,
      judged:
        judgment === undefined ? null : { reasoning: judgment.reasoning, result: judgment.result },
    };
  }),
});
