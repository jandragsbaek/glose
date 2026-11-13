import type { SessionEntry } from "./session.ts";

/**
 * Where a topic of a Probe stands. `asking`: asked, not judged yet. `known`: answered right with
 * sound Reasoning. `known-after-teaching`: the same, after the AI taught a gap in it. `taught`:
 * a gap the AI taught, not asked again yet. `gap`: an answer showed a gap, not taught yet.
 */
export type TopicState = "asking" | "known" | "known-after-teaching" | "taught" | "gap";

export interface TopicFinding {
  /** The topic as the AI first named it. */
  readonly topic: string;
  readonly state: TopicState;
  /** The numbers of the questions on it, in order. */
  readonly questions: ReadonlyArray<number>;
}

type Judgment = Extract<SessionEntry, { _tag: "ProbeJudgment" }>;

/** An answer shows no gap: the result is right and the Reasoning sound, or not given. */
export const isKnown = (judgment: Pick<Judgment, "reasoning" | "result">): boolean =>
  judgment.result === "right" && (judgment.reasoning === "sound" || judgment.reasoning === "none");

const topicKey = (topic: string) => topic.trim().toLowerCase();

interface Track {
  topic: string;
  questions: Array<number>;
  /** The last judgment showed no gap; null before the first. */
  known: boolean | null;
  /** The AI taught a gap since the last judgment. */
  taughtSince: boolean;
  /** The AI taught a gap in this topic at some time. */
  everTaught: boolean;
}

/** What a Probe found, topic by topic, in the order the topics were first asked about. */
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

/** The counts a Probe shows while it runs: topics known, gaps still open, gaps taught. */
export const probeTally = (findings: ReadonlyArray<TopicFinding>) => ({
  known: findings.filter((f) => f.state === "known" || f.state === "known-after-teaching").length,
  open: findings.filter((f) => f.state === "gap" || f.state === "taught").length,
  taught: findings.filter((f) => f.state === "taught" || f.state === "known-after-teaching").length,
});

/** The question the user may answer now: the last one asked, while it has no answer. */
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
