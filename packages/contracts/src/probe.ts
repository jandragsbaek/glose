import type { ChoiceSelect, ResultVerdict, Session, SessionEntry } from "./session.ts";

export type TopicState =
  | "asking"
  | "known"
  | "known-after-teaching"
  | "taught"
  | "gap"
  | "unconfirmed"
  | "not-asked";

export interface TopicFinding {
  readonly topic: string;
  readonly state: TopicState;
  readonly questions: ReadonlyArray<number>;
}

type Judgment = Extract<SessionEntry, { _tag: "ProbeJudgment" }>;
type Question = Extract<SessionEntry, { _tag: "ProbeQuestion" }>;
type Answer = Extract<SessionEntry, { _tag: "ProbeAnswer" }>;

export type AnswerState = "known" | "unconfirmed" | "gap";

export const answerWords = (answer: Pick<Answer, "reasoning" | "answer">): string =>
  [answer.reasoning, answer.answer].filter((text) => text !== "").join("\n\n");

export const answerState = (
  judgment: Pick<Judgment, "reasoning" | "result">,
  answer: Pick<Answer, "confidence" | "choice"> | undefined,
): AnswerState => {
  if (judgment.result !== "right") return "gap";
  if (judgment.reasoning === "flawed" || judgment.reasoning === "partly-sound") return "gap";
  if (answer?.confidence === "guess") return "unconfirmed";
  if (judgment.reasoning === "none" && answer?.choice !== undefined) return "unconfirmed";
  return "known";
};

const topicKey = (topic: string) => topic.trim().toLowerCase();

interface Track {
  topic: string;
  questions: Array<number>;
  known: AnswerState | null;
  taughtSince: boolean;
  everTaught: boolean;
  judged: number;
}

export const probeFindings = (
  entries: ReadonlyArray<SessionEntry>,
): ReadonlyArray<TopicFinding> => {
  const tracks = new Map<string, Track>();
  const byQuestion = new Map<number, Track>();
  const answers = new Map<number, Answer>();
  const trackOf = (topic: string) => {
    const key = topicKey(topic);
    const found = tracks.get(key);
    if (found !== undefined) return found;
    const track: Track = {
      topic: topic.trim(),
      questions: [],
      known: null,
      taughtSince: false,
      everTaught: false,
      judged: 0,
    };
    tracks.set(key, track);
    return track;
  };
  for (const entry of entries) {
    switch (entry._tag) {
      case "ProbeQuestion": {
        const track = trackOf(entry.topic);
        track.questions.push(entry.number);
        byQuestion.set(entry.number, track);
        break;
      }
      case "ProbeAnswer": {
        answers.set(entry.question, entry);
        const track = byQuestion.get(entry.question);
        if (track !== undefined && entry.teachMe) {
          track.known = "gap";
          track.taughtSince = false;
        }
        break;
      }
      case "ProbeJudgment": {
        const track = byQuestion.get(entry.question);
        if (track !== undefined && entry.question >= track.judged) {
          track.known = answerState(entry, answers.get(entry.question));
          track.taughtSince = false;
          track.judged = entry.question;
        }
        break;
      }
      case "ProbeHint": {
        const track = byQuestion.get(entry.question);
        if (track !== undefined) track.everTaught = true;
        break;
      }
      case "ProbeTaught": {
        if (entry.kind !== "gap") break;
        const track =
          (entry.question === null ? undefined : byQuestion.get(entry.question)) ??
          tracks.get(topicKey(entry.topic)) ??
          null;
        if (track !== null) {
          track.taughtSince = true;
          track.everTaught = true;
        }
        break;
      }
      default:
        break;
    }
  }
  const asked = [...tracks.values()].filter((track) => track.questions.length > 0);
  const notAsked = (planOf(entries) ?? [])
    .filter((topic) => !asked.some((track) => topicKey(track.topic) === topicKey(topic)))
    .map((topic) => ({ topic, state: "not-asked" as const, questions: [] }));
  return [
    ...asked.map((track): TopicFinding => ({
      topic: track.topic,
      questions: track.questions,
      state:
        track.known === null
          ? track.taughtSince
            ? "taught"
            : "asking"
          : track.taughtSince && track.known !== "known"
            ? "taught"
            : track.known === "known"
              ? track.everTaught
                ? "known-after-teaching"
                : "known"
              : track.known,
    })),
    ...notAsked,
  ];
};

export const planOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<string> | null => {
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index]!;
    if (entry._tag === "ProbePlan") return entry.topics;
  }
  return null;
};

export const probeTally = (findings: ReadonlyArray<TopicFinding>) => {
  const count = (state: TopicState) => findings.filter((f) => f.state === state).length;
  return {
    known: count("known"),
    afterTeaching: count("known-after-teaching"),
    taught: count("taught"),
    open: count("gap"),
    unconfirmed: count("unconfirmed"),
    asked: findings.filter((f) => f.state !== "not-asked").length,
    topics: findings.length,
  };
};

export const judgmentsOf = (
  entries: ReadonlyArray<SessionEntry>,
  question: number,
): ReadonlyArray<Judgment> =>
  entries.filter(
    (entry): entry is Judgment => entry._tag === "ProbeJudgment" && entry.question === question,
  );

export const choiceResult = (
  select: ChoiceSelect,
  right: ReadonlyArray<number>,
  chosen: ReadonlyArray<number>,
): ResultVerdict => {
  const picked = new Set(chosen);
  const hits = right.filter((option) => picked.has(option)).length;
  if (hits === right.length && picked.size === right.length) return "right";
  if (select === "many" && hits > 0) return "partly-right";
  return "wrong";
};

const isAnswer = (entry: SessionEntry): entry is Answer => entry._tag === "ProbeAnswer";

export const publicEntries = (
  entries: ReadonlyArray<SessionEntry>,
): ReadonlyArray<SessionEntry> => {
  const finished = entries.findLastIndex((entry) => entry._tag === "ProbeFinished");
  if (finished === entries.length - 1) return entries;
  const answered = new Set(
    entries.flatMap((entry) => (entry._tag === "ProbeAnswer" ? [entry.question] : [])),
  );
  const quietFrom = Math.max(entries.findLastIndex(isAnswer), finished) + 1;
  return entries.map((entry, index) => {
    if (index <= finished) return entry;
    if (entry._tag === "Thinking" && index >= quietFrom) return { ...entry, text: "" };
    if (entry._tag !== "ProbeQuestion" || entry.choice === undefined) return entry;
    if (answered.has(entry.number)) return entry;
    const { right: _right, tests: _tests, ...shown } = entry.choice;
    return { ...entry, choice: shown } satisfies Question;
  });
};

export const publicSession = (session: Session): Session =>
  session.kind === "probe" ? { ...session, entries: publicEntries(session.entries) } : session;

export const openQuestion = (
  entries: ReadonlyArray<SessionEntry>,
): Extract<SessionEntry, { _tag: "ProbeQuestion" }> | null => {
  if (entries.some((entry) => entry._tag === "ProbeFinished")) return null;
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index]!;
    if (entry._tag === "ProbeAnswer") return null;
    if (entry._tag === "ProbeQuestion") return entry;
  }
  return null;
};
