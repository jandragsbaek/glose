import {
  type Confidence,
  judgmentsOf,
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
    choice: "Your choice",
    rightOption: "right",
    tests: "tests",
    sure: "How sure",
    confidence: { sure: "Sure", unsure: "Not sure", guess: "Guessing" } satisfies Record<
      Confidence,
      string
    >,
    hint: "Hint",
    you: "You",
    plan: "Topics planned",
    judged: "Judged",
    judgedAgain: "Judged again",
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
    fromText: (paragraph: number) => `From the text, ¶ ${paragraph}.`,
    focus: (paragraph: number) => `Went deeper on ¶ ${paragraph} while reading:`,
    found: "What the Probe found",
    states: {
      asking: "Asked",
      known: "Known",
      "known-after-teaching": "Known after help",
      taught: "Taught, not confirmed yet",
      gap: "Still open",
      unconfirmed: "Right, not confirmed yet",
      "not-asked": "Not asked",
    } satisfies Record<TopicState, string>,
  },
  da: {
    title: (title: string) => `Sondering: ${title}`,
    question: "S",
    again: (number: number) => `S${number} igen`,
    reasoning: "Dit ræsonnement",
    answer: "Dit svar",
    teachMe: "Du bad om at blive undervist.",
    choice: "Dit valg",
    rightOption: "rigtigt",
    tests: "tester",
    sure: "Hvor sikker",
    confidence: { sure: "Sikker", unsure: "Ikke sikker", guess: "Gætter" },
    hint: "Hint",
    you: "Dig",
    plan: "Planlagte emner",
    judged: "Vurderet",
    judgedAgain: "Vurderet igen",
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
    fromText: (paragraph: number) => `Fra teksten, ¶ ${paragraph}.`,
    focus: (paragraph: number) => `Gik i dybden med ¶ ${paragraph} under læsningen:`,
    found: "Hvad sonderingen fandt",
    states: {
      asking: "Spurgt",
      known: "Kendt",
      "known-after-teaching": "Kendt efter hjælp",
      taught: "Undervist, ikke bekræftet endnu",
      gap: "Stadig åben",
      unconfirmed: "Rigtigt, ikke bekræftet endnu",
      "not-asked": "Ikke spurgt",
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
          `## ${labels.question}${entry.number} · ${entry.topic}${entry.paragraph === undefined ? "" : ` · ¶ ${entry.paragraph}`}${entry.again === null ? "" : ` (${labels.again(entry.again)})`}`,
          entry.text,
        );
        if (entry.choice !== undefined) {
          const { options, right, tests } = entry.choice;
          blocks.push(
            options
              .map((option, index) => {
                const key = right?.includes(index)
                  ? ` *(${labels.rightOption})*`
                  : tests?.[index]
                    ? ` *(${labels.tests}: ${tests[index]})*`
                    : "";
                return `${String.fromCharCode(65 + index)}. ${option}${key}`;
              })
              .join("\n"),
          );
        }
        break;
      case "ProbeAnswer": {
        if (entry.teachMe) blocks.push(`*${labels.teachMe}*`);
        if (entry.reasoning !== "") blocks.push(`**${labels.reasoning}:** ${entry.reasoning}`);
        if (entry.answer !== "") blocks.push(`**${labels.answer}:** ${entry.answer}`);
        if (entry.choice !== undefined) {
          const letters = entry.choice.map((index) => String.fromCharCode(65 + index));
          blocks.push(`**${labels.choice}:** ${letters.join(", ")}`);
        }
        if (entry.confidence !== undefined) {
          blocks.push(`**${labels.sure}:** ${labels.confidence[entry.confidence]}`);
        }
        break;
      }
      case "ProbeHint":
        blocks.push(callout(`> [!ai] ${labels.hint}`, entry.text));
        break;
      case "UserMessage":
        blocks.push(
          `**${entry.question === undefined ? labels.you : `${labels.you} · ${labels.question}${entry.question}`}:** ${entry.text}`,
        );
        break;
      case "AiMessage":
        if (entry.text.trim() !== "") blocks.push(callout("> [!ai] AI", entry.text));
        break;
      case "ProbePlan":
        blocks.push(`*${labels.plan}: ${entry.topics.join(" · ")}*`);
        break;
      case "ProbeJudgment":
        blocks.push(
          callout(
            `> [!ai] ${judgmentsOf(input.entries, entry.question)[0] === entry ? labels.judged : `${labels.judgedAgain} · ${labels.question}${entry.question}`}`,
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
            `${entry.text}\n\n*${entry.paragraph === undefined ? labels.checkCopy : labels.fromText(entry.paragraph)}*`,
          ),
        );
        break;
      case "ProbeFocus":
        blocks.push(`*${labels.focus(entry.paragraph)}*`, `> ${entry.text}`);
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
