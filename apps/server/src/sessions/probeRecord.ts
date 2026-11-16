import {
  type Language,
  probeFindings,
  type ReasoningVerdict,
  type ResultVerdict,
  type SessionEntry,
  type Source,
  type TopicState,
} from "@glose/contracts";
import * as Yaml from "yaml";

export const PROBES_FOLDER = "Probes";

const LABELS = {
  en: {
    title: (title: string) => `Probe: ${title}`,
    question: "Q",
    again: (number: number) => `Q${number} again`,
    reasoning: "Your Reasoning",
    answer: "Your answer",
    teachMe: "You asked to be taught.",
    judged: "Judged",
    reasoningVerdicts: {
      sound: "Reasoning sound",
      "partly-sound": "Reasoning partly sound",
      flawed: "Reasoning flawed",
      none: "No Reasoning given",
    } satisfies Record<ReasoningVerdict, string>,
    resultVerdicts: {
      right: "Result right",
      "partly-right": "Result partly right",
      wrong: "Result wrong",
    } satisfies Record<ResultVerdict, string>,
    taught: "Taught",
    intro: "Before the question",
    checkCopy: "From the AI's knowledge of the book, not your copy. Check it there.",
    found: "What the Probe found",
    states: {
      asking: "Asked",
      known: "Known",
      "known-after-teaching": "Known after teaching",
      taught: "Taught, not confirmed yet",
      gap: "Still open",
    } satisfies Record<TopicState, string>,
  },
  da: {
    title: (title: string) => `Sondering: ${title}`,
    question: "S",
    again: (number: number) => `S${number} igen`,
    reasoning: "Dit ræsonnement",
    answer: "Dit svar",
    teachMe: "Du bad om at blive undervist.",
    judged: "Vurderet",
    reasoningVerdicts: {
      sound: "Ræsonnement holdbart",
      "partly-sound": "Ræsonnement delvis holdbart",
      flawed: "Ræsonnement fejlbehæftet",
      none: "Intet ræsonnement givet",
    },
    resultVerdicts: {
      right: "Resultat rigtigt",
      "partly-right": "Resultat delvis rigtigt",
      wrong: "Resultat forkert",
    },
    taught: "Undervist",
    intro: "Før spørgsmålet",
    checkCopy: "Fra AI'ens viden om bogen, ikke dit eksemplar. Tjek det dér.",
    found: "Hvad sonderingen fandt",
    states: {
      asking: "Spurgt",
      known: "Kendt",
      "known-after-teaching": "Kendt efter undervisning",
      taught: "Undervist, ikke bekræftet endnu",
      gap: "Stadig åben",
    },
  },
} satisfies Record<Language, unknown>;

const twoDigits = (value: number) => String(value).padStart(2, "0");
const localDate = (time: number) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
};

const callout = (head: string, text: string) =>
  [head, ...text.split(/\r?\n/).map((line) => (line.trim() === "" ? ">" : `> ${line}`))].join("\n");

export const renderRecord = (input: {
  readonly source: Pick<Source, "id" | "title">;
  readonly entries: ReadonlyArray<SessionEntry>;
  readonly created: number;
  readonly language: Language;
}): string => {
  const labels = LABELS[input.language];
  const finished = input.entries.find((entry) => entry._tag === "ProbeFinished");
  const frontmatter = {
    glose: "probe",
    source: `[[${input.source.id}]]`,
    started: localDate(input.created),
    ...(finished?._tag === "ProbeFinished" ? { finished: localDate(finished.at) } : {}),
    ai: true,
  };
  const blocks: Array<string> = [`# ${labels.title(input.source.title)}`];
  for (const entry of input.entries) {
    switch (entry._tag) {
      case "ProbeQuestion":
        blocks.push(
          `## ${labels.question}${entry.number} · ${entry.topic}${entry.again === null ? "" : ` (${labels.again(entry.again)})`}`,
          entry.text,
        );
        break;
      case "ProbeAnswer":
        if (entry.teachMe) blocks.push(`*${labels.teachMe}*`);
        if (entry.reasoning !== "") blocks.push(`**${labels.reasoning}:** ${entry.reasoning}`);
        if (entry.answer !== "") blocks.push(`**${labels.answer}:** ${entry.answer}`);
        break;
      case "ProbeJudgment":
        blocks.push(
          callout(
            `> [!ai] ${labels.judged}`,
            [
              `${labels.reasoningVerdicts[entry.reasoning]}. ${entry.reasoningWhy}`,
              "",
              `${labels.resultVerdicts[entry.result]}. ${entry.resultWhy}`,
            ].join("\n"),
          ),
        );
        break;
      case "ProbeTaught":
        blocks.push(
          callout(
            `> [!ai] ${entry.kind === "gap" ? labels.taught : labels.intro} · ${entry.topic}`,
            `${entry.text}\n\n*${labels.checkCopy}*`,
          ),
        );
        break;
      default:
        break;
    }
  }
  const findings = probeFindings(input.entries);
  if (findings.length > 0) {
    blocks.push(
      `## ${labels.found}`,
      findings.map((finding) => `- ${finding.topic}: ${labels.states[finding.state]}`).join("\n"),
    );
  }
  return `---\n${Yaml.stringify(frontmatter)}---\n\n${blocks.join("\n\n")}\n`;
};
