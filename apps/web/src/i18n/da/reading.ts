import { hostOf } from "../../domain/webAddress.ts";
import { numbers, count, list } from "./format.ts";
import type { Messages } from "../en.ts";

export const readingMessages: Pick<
  Messages,
  "reading" | "start" | "chatgpt" | "session" | "aiText" | "extraction" | "probe"
> = {
  reading: {
    freeText: "Fri tekst",
    freeTextHint:
      "Skriv frit om bogen med dine egne ord: hvad der blev hængende, hvad du tvivler på, hvad du vil forstå. Dette trin er valgfrit.",
    freeTextLabel: "Fri tekst om denne kilde",
    save: "Gem",
    saving: "Gemmer",
    saved: "Gemt",
    unsaved: "Ikke gemt",
    finish: "Afslut fri tekst",
    skip: "Spring fri tekst over",
    finished: "Fri tekst er afsluttet. Du kan stadig ændre den.",
    anytime:
      "Skriv frit om bogen med dine egne ord, når du vil. Den står ved siden af sonderingen og udtrækket.",
    nextStep: "Næste trin",
  },
  start: {
    title: "Hvor er du med denne bog?",
    hint: "Dit svar bestemmer det første trin. Du kan stadig tage den anden vej senere.",
    choices: {
      write: "Jeg har tanker, jeg vil skrive ned",
      probe: "Jeg har læst den, og jeg vil udspørges om den",
      "catch-up": "Jeg læste den for længe siden, eller kun delvist",
    },
    choiceHints: {
      write: "Begynd med fri tekst med dine egne ord.",
      probe: "AI'en spørger; du svarer med din begrundelse.",
      "catch-up": "AI'en spørger og forklarer de dele, du mangler.",
    },
    follows: "Det, der følger",
    chooseFirst: "Vælg et svar for at se de trin, der følger.",
    stepNotes: {
      "free-text": "dine egne ord",
      read: "teksten, i Glose",
      extraction: "kernepunkter som noter",
      probe: "spørgsmål og svar",
    },
    startWriting: "Begynd fri tekst",
    startProbe: "Begynd sonderingen",
    starting: "Begynder",
  },
  chatgpt: {
    title: "ChatGPT",
    intro:
      "Udtræk og sondering bruger dit eget ChatGPT-abonnement. Glose har ingen konto selv: ChatGPT beder dig give Glose lov til at bruge dit abonnement og tæller forbruget dér.",
    continue: "Fortsæt med ChatGPT",
    lastAccount: (email: string) => `Sidst brugt med ${email}.`,
    otherAccount: "Brug en anden ChatGPT-konto",
    connecting: "Venter på ChatGPT",
    connectingHint:
      "Glose har åbnet ChatGPT i din browser. Log ind dér, og giv Glose lov til at bruge dit abonnement. Kom så tilbage hertil.",
    openAgain: "Åbn ChatGPT-siden igen",
    cancel: "Annullér",
    connected: (email: string) => `Forbundet som ${email}.`,
    usingPlan: "Bruger ChatGPT-abonnement",
    manageUsage: "Administrér forbrug",
    disconnect: "Afbryd forbindelsen",
    disconnectUnconfirmed:
      "Glose har glemt log-ind'et, men ChatGPT bekræftede ikke, at det er afsluttet. Afbryd Glose i ChatGPT's indstillinger for at være sikker.",
    planNotAllowedTitle: "Glose må ikke bruge dit ChatGPT-abonnement",
    planNotAllowed:
      "Du loggede ind, men gav ikke Glose lov til at bruge dit ChatGPT-abonnement. AI'en kan ikke arbejde uden.",
    allowPlan: "Giv lov til at bruge abonnementet",
    unknown: "Glose kan ikke se forbindelsen til ChatGPT lige nu.",
    problems: {
      declined: "Du sagde nej i ChatGPT, så Glose er ikke forbundet.",
      "port-busy":
        "Et andet program logger ind på ChatGPT samtidig, måske Codex. Gør det log-ind færdigt eller luk det, og prøv så igen.",
      "timed-out": "Log-ind'et tog for lang tid. Prøv igen.",
      "other-account":
        "Browseren loggede ind på en anden ChatGPT-konto. Prøv igen med samme konto, eller vælg Brug en anden ChatGPT-konto.",
      expired:
        "Log-ind'et på ChatGPT virker ikke længere. Det kan være udløbet, eller Glose er afbrudt i ChatGPT. Log ind igen.",
      failed: "Log-ind'et virkede ikke. Prøv igen.",
    },
    noticeTitle: "Du bruger dit ChatGPT-abonnement",
    noticeBody:
      "AI'en i Glose bruger nu dit ChatGPT-abonnement. Du kan se og begrænse forbruget i ChatGPT's indstillinger.",
    gotIt: "Forstået",
  },
  session: {
    needsChatGpt: "Udtræk kræver ChatGPT",
    needsChatGptBody:
      "Forbind dit ChatGPT-abonnement under Indstillinger, og kom så tilbage til denne kilde.",
    openSettings: "Åbn Indstillinger",
    transcript: "Session",
    you: "Dig",
    ai: "AI",
    tools: {
      "read-source": "AI'en læste denne kilde og din frie tekst.",
      "list-sources": "AI'en så på listen over dine kilder.",
      "read-note": "AI'en læste en note.",
      "list-cards": "AI'en så på de kort, noten allerede har.",
      "search-graph": "AI'en søgte i din graf.",
      "list-notes": "AI'en så på de noter, du har lavet fra denne kilde.",
      "read-probe": "AI'en læste din sondering.",
      "read-article": "AI'en læste teksten og dine passager.",
      "search-web": "AI'en søgte på nettet.",
      "read-web-page": "AI'en læste en webside.",
    },
    trail: {
      readSource: "Læste kilden og din frie tekst",
      listSources: "Så på dine kilder",
      readNote: "Læste",
      listCards: "Så på notens kort",
      searchGraph: (query: string) => `Søgte i din graf efter »${query}«`,
      listNotes: "Så på dine noter fra denne kilde",
      readProbe: "Læste din sondering",
      readArticle: "Læste teksten og dine passager",
      searchWeb: (query: string) => `Søgte på nettet efter »${query}«`,
      readWebPage: "Læste",
    },
    trailSummary: (read) => {
      const things = [
        ...(read.webPages > 0 ? [count(read.webPages, "webside", "websider")] : []),
        ...(read.article ? ["teksten"] : []),
        ...(read.freeText ? ["din frie tekst"] : []),
        ...(read.probe ? ["din sondering"] : []),
        ...(read.sourceNotes ? ["dine noter fra denne kilde"] : []),
        ...(read.notes > 0 ? [count(read.notes, "note", "noter")] : []),
        ...(read.sources ? ["dine kilder"] : []),
        ...(read.cards ? ["notens kort"] : []),
      ];
      const searched =
        read.searches === 0
          ? null
          : read.searches === 1
            ? "søgte i din graf"
            : `søgte i din graf ${numbers.format(read.searches)} gange`;
      const web =
        read.webSearches === 0
          ? null
          : read.webSearches === 1
            ? "søgte på nettet"
            : `søgte på nettet ${numbers.format(read.webSearches)} gange`;
      const line = [web, things.length === 0 ? null : `læste ${list.format(things)}`, searched]
        .filter((part) => part !== null)
        .join(" · ");
      return line.charAt(0).toUpperCase() + line.slice(1);
    },
    live: (tool, detail) => {
      switch (tool) {
        case "read-source":
          return "Læser din frie tekst";
        case "list-sources":
          return "Ser på dine kilder";
        case "read-note":
          return detail === undefined ? "Læser en note" : `Læser ${detail}`;
        case "list-cards":
          return "Ser på notens kort";
        case "search-graph":
          return detail === undefined ? "Søger i din graf" : `Søger i din graf efter »${detail}«`;
        case "list-notes":
          return "Ser på dine noter fra denne kilde";
        case "read-probe":
          return "Læser din sondering";
        case "read-article":
          return "Læser teksten";
        case "search-web":
          return detail === undefined ? "Søger på nettet" : `Søger på nettet efter »${detail}«`;
        case "read-web-page":
          return detail === undefined ? "Læser en webside" : `Læser ${hostOf(detail)}`;
        case null:
          return "Tænker";
      }
    },
    thought: (ms: number) =>
      ms < 1000 ? "Tænkte kort" : `Tænkte i ${numbers.format(Math.round(ms / 1000))} s`,
    youAbout: (point: number) => `Dig · om ${numbers.format(point)}`,
    about: "Om",
    clearAbout: "Tal om hele kilden",
    placeholder: "Svar, spørg eller sig imod",
    sendKey: { mac: "⌘ ↵", other: "Ctrl ↵" },
    pointsProposed: (n: number) => `Foreslog ${count(n, "punkt", "punkter")}`,
    pointAdded: "Tilføjede et punkt med dine ord",
    pointRef: (point: number) => `Punkt ${numbers.format(point)}`,
    passage: "Passage",
    messageLabel: "Dit svar",
    messageHint: "Tryk Ctrl+Enter eller Cmd+Enter for at sende.",
    send: "Send",
    stop: "Stop",
    retry: "Prøv igen",
    model: (model: string) => `Model ${model}`,
    sendFailed: "Glose kunne ikke sende din besked. Prøv igen.",
    problems: {
      "not-connected": "Forbindelsen til ChatGPT virker ikke. Log ind igen under Indstillinger.",
      "plan-not-allowed":
        "Glose må ikke bruge dit ChatGPT-abonnement. Giv lov under Indstillinger, og prøv så igen.",
      "usage-limit":
        "Forbrugsgrænsen er nået. Dit ChatGPT-abonnement, eller den andel du har givet Glose, er brugt op for nu. Se grænserne i ChatGPT's indstillinger.",
      "not-eligible":
        "Denne ChatGPT-konto kan ikke bruge sit abonnement i andre programmer. ChatGPT Plus og Pro kan.",
      unavailable: "ChatGPT kunne ikke nås. Prøv igen om lidt.",
      failed: "AI'en stoppede med en fejl. Prøv igen.",
    },
  },
  aiText: {
    paragraphs: () => "AI-afsnit",
    part: "AI-skrevet del",
    note: "AI-skrevet note",
    card: "AI-skrevet kort",
    title: "AI-skrevet titel",
  },
  extraction: {
    title: "Kernepunkter",
    count: (n: number) => count(n, "punkt", "punkter"),
    stepNote: (written: number, total: number) =>
      total === 0
        ? "med ChatGPT"
        : `${numbers.format(written)} af ${count(total, "punkt", "punkter")} skrevet`,
    showFreeText: "Læs",
    hideFreeText: "Skjul",
    startLead: "Find kildens kernepunkter",
    startBody:
      "AI'en læser din frie tekst og søger i din graf. Den foreslår kernepunkterne, siger hvor hvert punkt kommer fra, og hvordan det møder de noter, du har, og spørger dig om dem. Hvert punkt har et udkast til sin note, mærket som AI-tekst, indtil du omskriver det med dine egne ord.",
    start: "Start udtræk",
    waiting: "AI'en læser. Dens punkter kommer her.",
    noPoints: "Ingen åbne punkter. Bed AI'en om flere, eller tilføj et punkt med dine egne ord.",
    proposed: (n: number) => `Foreslået af AI'en · ${numbers.format(n)}`,
    toWrite: "At skrive",
    written: "Skrevet",
    dropped: "Droppet",
    fromFreeText: "Fra din frie tekst:",
    fromProbe: "Fra dine ord i sonderingen:",
    notInFreeText: "Ikke i din frie tekst. Tjek det i dit eget eksemplar.",
    fromText: (paragraph: string | null) =>
      paragraph === null ? "Fra teksten:" : `Fra teksten, ${paragraph}:`,
    fromPassage: (paragraph: string | null) =>
      paragraph === null ? "Din passage:" : `Din passage, ${paragraph}:`,
    ownWords: "Dit eget punkt",
    repeats: "Du har denne note:",
    pullsAgainst: "Trækker imod",
    keep: "Behold",
    discuss: "Drøft",
    drop: "Drop",
    write: "Skriv",
    bringBack: "Hent tilbage",
    titleLabel: "Punkt, notens titel",
    textLabel: "Noten, med dine egne ord",
    page: "Side",
    linksHead: "Links fra din graf",
    addLink: "Tilføj",
    linkAdded: "Tilføjet",
    undo: "Fortryd",
    dropLink: "Drop",
    draftLabel: "Noten, AI'ens udkast",
    draftMarked: "mærket, til du omskriver det",
    rewrote: "Jeg har omskrevet det",
    rewroteHint:
      "Fjerner AI-mærket, også fra tekst, du har redigeret. Vælg det, når teksten er med dine egne ord.",
    save: "Gem note",
    askDraft: "Bed om et udkast",
    draftRequest: "Skriv et udkast til dette punkts note.",
    proposeMore: "Foreslå flere",
    proposeMoreRequest: "Foreslå flere kernepunkter.",
    addOwn: "Tilføj et punkt med dine ord",
    addOwnLabel: "Dit punkt",
    addOwnHint: "Én påstand, som en hel sætning. Den bliver notens titel.",
    add: "Tilføj",
    cancel: "Annullér",
    showDropped: (n: number) => `${numbers.format(n)} droppet`,
    hideDropped: "Skjul droppede",
    openInGraph: "Åbn i grafen",
    links: (n: number) => count(n, "link", "links"),
    states: {
      open: "Foreslået",
      kept: "Beholdt",
      written: "Skrevet",
      dropped: "Droppet",
    },
    nameTaken: (name: string) =>
      `Dit arkiv har allerede en fil med navnet »${name}«. Ret titlen, eller åbn den note.`,
    saveFailed: "Glose kunne ikke gemme noten. Prøv igen.",
    actionFailed: "Glose kunne ikke gemme det. Prøv igen.",
    next: {
      probe: "Fortsæt til sonderingen",
      done: "Markér kilden som læst",
    },
    nextHint: {
      probe: "Nu spørger sonderingen dig om bogen. Dine punkter og noter bliver her.",
      done: "Når punkterne er skrevet, forlader kilden skrivebordet. Noterne bliver i din graf.",
    },
    nextFailed: "Glose kunne ikke gå videre til næste trin. Prøv igen.",
  },
  probe: {
    title: "Sondering",
    stepNote: (questions: number) =>
      questions === 0 ? "med ChatGPT" : count(questions, "spørgsmål", "spørgsmål"),
    tally: (tally) =>
      [
        tally.planned
          ? `${numbers.format(tally.asked)} af ${count(tally.topics, "emne", "emner")} spurgt`
          : null,
        `${numbers.format(tally.known)} kendt`,
        tally.afterTeaching === 0
          ? null
          : `${numbers.format(tally.afterTeaching)} kendt efter hjælp`,
        tally.taught === 0
          ? null
          : `${numbers.format(tally.taught)} undervist, ikke bekræftet endnu`,
        tally.unconfirmed === 0
          ? null
          : `${numbers.format(tally.unconfirmed)} rigtigt, ikke bekræftet endnu`,
        tally.open === 0 ? null : `${numbers.format(tally.open)} stadig åben`,
      ]
        .filter((part) => part !== null)
        .join(" · "),
    startLead: {
      write: "Bliv spurgt om bogen",
      probe: "Bliv spurgt om bogen",
      "catch-up": "Kom ajour med bogen, og bliv så spurgt",
    },
    startBody: {
      write:
        "AI'en spørger om bogens hovedidéer, ét spørgsmål ad gangen, og afprøver de noter, du har lavet. Svar med dit ræsonnement, hvordan du kom frem til det, og så dit svar. Hvor et svar viser et hul, underviser AI'en i netop den del og spørger igen.",
      probe:
        "AI'en spørger om bogens hovedidéer, ét spørgsmål ad gangen. Svar med dit ræsonnement, hvordan du kom frem til det, og så dit svar. Hvor et svar viser et hul, underviser AI'en i netop den del og spørger igen. Bagefter laver udtrækket noter af det, sonderingen fandt.",
      "catch-up":
        "AI'en forklarer kort hver af bogens hovedidéer og spørger så om den. Svar med dit ræsonnement, hvordan du kom frem til det, og så dit svar. Hvor et svar viser et hul, underviser AI'en i netop den del og spørger igen. Bagefter laver udtrækket noter af det, sonderingen fandt.",
    },
    start: "Start sonderingen",
    needsChatGpt: "Sonderingen kræver ChatGPT",
    showFreeText: "Fri tekst",
    hideFreeText: "Skjul fri tekst",
    finish: "Afslut sonderingen",
    finishFailed: "Glose kunne ikke afslutte sonderingen. Prøv igen.",
    question: (n: number) => `S${numbers.format(n)}`,
    questionLabel: (n: number) => `Spørgsmål ${numbers.format(n)}`,
    again: (n: number) => `S${numbers.format(n)} igen`,
    reasoning: "Dit ræsonnement",
    answer: "Dit svar",
    teachMeAsked: "Du bad om at blive undervist.",
    hintAsked: "Du bad om et hint.",
    judged: "Vurderet",
    judgedAgain: "Vurderet igen",
    unconfirmedWhy: {
      guess: "Du gættede, så det tæller ikke som kendt endnu.",
      bare: "Intet ræsonnement for valget, så det tæller ikke som kendt endnu.",
    },
    judgedAgainOf: (n: number) => `AI'en vurderede S${numbers.format(n)} igen.`,
    dispute: "Anfægt vurderingen",
    chooseOne: "Vælg én",
    chooseMany: "Vælg alle, der passer",
    optionsLabel: (n: number) => `Svarmuligheder til S${numbers.format(n)}`,
    option: (letter: string) => `Mulighed ${letter}`,
    yourChoice: "Dit valg",
    noChoice: "Vælg en mulighed i spørgsmålet ovenfor.",
    choiceMark: {
      chosenRight: "Dit valg · rigtigt",
      chosenWrong: "Dit valg · ikke rigtigt",
      right: "Rigtigt svar",
    },
    tests: (misconception: string) => `Tester: ${misconception}`,
    sure: "Hvor sikker er du?",
    sureShort: "Hvor sikker",
    confidence: { sure: "Sikker", unsure: "Ikke sikker", guess: "Gætter" },
    hint: "Giv mig et hint",
    hintGloss: (n: number) => `Hint · S${numbers.format(n)}`,
    hintFailed: "Glose kunne ikke bede om et hint. Prøv igen.",
    planned: "Planlagte emner",
    talk: "Skriv til AI'en i stedet",
    talkLabel: "Besked til AI'en",
    talkAbout: (n: number) => `om S${numbers.format(n)}`,
    talkAboutJudgment: (n: number) => `om vurderingen af S${numbers.format(n)}`,
    talkHint:
      "Spørg, hvad spørgsmålet betyder, anfægt en vurdering, eller spørg om bogen. Dit svar venter.",
    talkHintNoQuestion: "Spørg om bogen eller en vurdering, eller bed om næste spørgsmål.",
    talkPlaceholder: "Skriv til AI'en",
    backToAnswer: "Tilbage til dit svar",
    closeTalk: "Luk beskeden",
    messageFailed: "Glose kunne ikke sende din besked. Prøv igen.",
    you: (about: string | null) => (about === null ? "Dig" : `Dig · ${about}`),
    reasoningVerdicts: {
      sound: "Ræsonnement: holdbart",
      "partly-sound": "Ræsonnement: delvis holdbart",
      flawed: "Ræsonnement: fejlbehæftet",
      none: "Intet ræsonnement givet",
    },
    resultVerdicts: {
      right: "Resultat: rigtigt",
      "partly-right": "Resultat: delvis rigtigt",
      wrong: "Resultat: forkert",
    },
    taught: (question: number | null) =>
      question === null ? "Undervist" : `Undervist · hullet i S${numbers.format(question)}`,
    intro: "Før spørgsmålet",
    checkCopy: "Fra AI'ens viden om bogen, ikke dit eksemplar. Tjek det dér.",
    waiting: "AI'en læser. Dens første spørgsmål kommer her.",
    covered:
      "AI'en har været omkring bogens hovedidéer. Afslut sonderingen, når du er klar, eller svar videre.",
    found: "Hvad sonderingen fandt",
    states: {
      asking: "Spurgt, intet svar endnu",
      known: "Kendt",
      "known-after-teaching": "Kendt efter hjælp",
      taught: "Undervist, ikke bekræftet endnu",
      gap: "Stadig åben",
      unconfirmed: "Rigtigt, ikke bekræftet endnu",
      "not-asked": "Ikke spurgt endnu",
    },
    foundEmpty: "Sonderingen sluttede før noget svar.",
    keptIn: (file: string) => `Sonderingen er gemt i ${file} i dit arkiv.`,
    continueExtraction: "Fortsæt til udtræk",
    continueHint: "Udtrækket laver noter af det, sonderingen fandt, med dine egne ord.",
    doneRead: (title: string) => `Færdig: ${title} er læst`,
    doneHint: "Kilden forlader skrivebordet. Dens noter, frie tekst og sondering bliver.",
    openPlaceholder: "Tænk højt, og slut med dit svar.",
    choiceReasoningPlaceholder: "Tænk højt: hvorfor denne?",
    dictate: {
      mac: "Vil du hellere tale, så start din Macs diktering: tryk to gange på Fn eller på mikrofontasten.",
      windows: "Vil du hellere tale, så tryk Windows + H for Windows' stemmeindtastning.",
      other: "Vil du hellere tale, så brug din computers diktering. Den skriver i feltet.",
    },
    send: "Send",
    teachMe: "Jeg ved det ikke, lær mig det",
    askNext: "Bed om næste spørgsmål",
    sendFailed: "Glose kunne ikke sende dit svar. Prøv igen.",
  },
};
