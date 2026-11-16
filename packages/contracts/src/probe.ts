import type { SessionEntry } from "./session.ts";

export type TopicState = "asking" | "known" | "known-after-teaching" | "taught" | "gap";

export interface TopicFinding {
  readonly topic: string;
  readonly state: TopicState;
  readonly questions: ReadonlyArray<number>;
}

type Judgment = Extract<SessionEntry, { _tag: "ProbeJudgment" }>;

export const isKnown = (judgment: Pick<Judgment, "reasoning" | "result">): boolean =>
  judgment.result === "right" && (judgment.reasoning === "sound" || judgment.reasoning === "none");

const topicKey = (topic: string) => topic.trim().toLowerCase();

interface Track {
  topic: string;
  questions: Array<number>;
  known: boolean | null;
  taughtSince: boolean;
  everTaught: boolean;
}

export const probeFindings = (
  entries: ReadonlyArray<SessionEntry>,
): ReadonlyArray<TopicFinding> => {
  const tracks = new Map<string, Track>();
  const byQuestion = new Map<number, Track>();
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
        const track = byQuestion.get(entry.question);
        if (track !== undefined && entry.teachMe) {
          track.known = false;
          track.taughtSince = false;
        }
        break;
      }
      case "ProbeJudgment": {
        const track = byQuestion.get(entry.question);
        if (track !== undefined) {
          track.known = isKnown(entry);
          track.taughtSince = false;
        }
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
  return [...tracks.values()]
    .filter((track) => track.questions.length > 0)
    .map((track) => ({
      topic: track.topic,
      questions: track.questions,
      state:
        track.known === null
          ? track.taughtSince
            ? "taught"
            : "asking"
          : track.known
            ? track.everTaught
              ? "known-after-teaching"
              : "known"
            : track.taughtSince
              ? "taught"
              : "gap",
    }));
};

export const probeTally = (findings: ReadonlyArray<TopicFinding>) => {
  const count = (state: TopicState) => findings.filter((f) => f.state === state).length;
  return {
    known: count("known"),
    afterTeaching: count("known-after-teaching"),
    taught: count("taught"),
    open: count("gap"),
  };
};

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
