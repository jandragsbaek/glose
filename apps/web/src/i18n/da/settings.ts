import type { UpdatesProblem } from "@glose/contracts";
import { nightlyOf } from "../../domain/appVersion.ts";
import { numbers, count, clockTime, shortDate } from "./format.ts";
import type { Messages } from "../en.ts";

export const settingsMessages: Pick<Messages, "updates" | "versions" | "backup" | "settings"> = {
  updates: {
    version: (version: string) => {
      const nightly = nightlyOf(version);
      return nightly === null
        ? version
        : `Natversion ${shortDate.format(nightly.built)} (${numbers.format(nightly.run)})`;
    },
    check: "Søg efter opdateringer",
    checking: "Søger…",
    upToDate: "Glose er opdateret.",
    notChecked: "Ikke søgt endnu.",
    checkingLong: "Søger efter opdateringer…",
    update: "Opdater",
    restart: "Genstart for at opdatere",
    percent: (percent: number) => `${numbers.format(percent)} %`,
    downloading: (version: string, percent: number) =>
      `Henter ${version}: ${numbers.format(percent)} %`,
    available: (version: string) => `${version} er klar til at blive hentet.`,
    downloaded: (version: string) => `${version} er hentet.`,
    restartHint: "Glose lukker og åbner igen med den nye version.",
    running: (version: string) => `Du har ${version}.`,
    checked: (at: Date, today: boolean) =>
      `Søgt ${today ? `kl. ${clockTime.format(at)}` : shortDate.format(at)}.`,
    everyHour: "Glose søger hver time.",
    problemsShort: {
      "check-failed": "Ikke søgt",
      "download-failed": "Ikke hentet",
      "install-failed": "Ikke installeret",
    } satisfies Record<UpdatesProblem, string>,
    problems: {
      "check-failed": "Glose kunne ikke nå GitHub. Klik for at prøve igen.",
      "download-failed": "Hentningen stoppede. Klik for at prøve igen.",
      "install-failed": "Opdateringen blev ikke installeret. Klik for at prøve igen.",
    } satisfies Record<UpdatesProblem, string>,
  },
  versions: {
    title: "Versioner af din graf",
    off: "Ingen versioner",
    offReasons: {
      "no-graph": "Glose gemmer versioner, når du har valgt en graf-mappe.",
      "no-git":
        "Git er ikke installeret på denne computer. Installer Git, og start Glose igen for at gemme versioner af din graf.",
      "other-repository":
        "Graf-mappen ligger i et andet git-repository. Glose laver ikke commits der.",
      failed: "Git kunne ikke oprette et repository i graf-mappen.",
    },
    saved: (at: Date, today: boolean) =>
      `Gemt ${today ? clockTime.format(at) : shortDate.format(at)}`,
    notSavedYet: "Ikke gemt endnu",
    saving: "Gemmer…",
    syncing: "Synkroniserer…",
    unsaved: "Ændringer er ikke gemt endnu",
    changes: "Ændringer",
    allSaved: "Alt er gemt.",
    pending: "Ikke gemt endnu. Glose gemmer dem efter 5 minutter uden ændringer.",
    remote: "Remote",
    noRemote: "Kun på denne computer.",
    sync: "Synkronisering",
    synced: (at: Date, today: boolean) =>
      `Synkroniseret ${today ? clockTime.format(at) : shortDate.format(at)}.`,
    notSynced: "Ikke synkroniseret, siden Glose startede.",
    unpushed: (n: number) => `${count(n, "version", "versioner")} er ikke pushet endnu.`,
    problemsShort: {
      conflict: "Konflikt ved synkronisering",
      "sync-failed": "Ikke synkroniseret",
      "save-failed": "Ikke gemt",
    },
    problems: {
      conflict:
        "De samme linjer er ændret på denne computer og på remote. Glose beholdt alle versioner og synkroniserede ikke. Saml ændringerne med git. Så synkroniserer Glose igen.",
      "sync-failed": "Glose kunne ikke synkronisere med remote. Glose prøver igen efter næste gem.",
      "save-failed": "Git kunne ikke gemme en version. Glose prøver igen ved næste ændring.",
    },
    endDay: "Afslut dagen",
    endDayHint: "Skriv én linje om i dag. Glose gemmer den som en version og synkroniserer den.",
    summary: "I dag",
    summaryPlaceholder: "Læste Arendt, skrev to noter",
    dayEnded: "Dagen er gemt som en version.",
  },
  backup: {
    title: "Backup",
    versions: "Versioner",
    onlyHere: "Kun på denne computer",
    lastSaved: "Sidst gemt",
    savedAt: (at: Date, today: boolean) =>
      today ? `I dag ${clockTime.format(at)}` : shortDate.format(at),
    risk: "Hvis computeren bliver væk eller går i stykker, mister du din graf med den.",
    backUpToGitHub: "Tag backup på GitHub",
    useRemote: "Brug et andet git-remote",
    backedUpTo: "Backup på",
    lastSync: "Sidst synkroniseret",
    github: "GitHub",
    notConnected: "Ikke forbundet",
    disconnectGitHub: "Afbryd GitHub",
    stop: "Stop backup",
    stopQuestion: (place: string) =>
      `Stop backup? Glose beholder alle versioner på denne computer, og kopien på ${place} bliver, som den er.`,
    keep: "Fortsæt backup",
    step: (n: number, of: number) => `Trin ${n} af ${of}`,
    intro:
      "GitHub gemmer en privat kopi af alle versioner, gratis. Kun du kan se den, og senere kan du åbne din graf på en anden computer.",
    connect: "Forbind GitHub",
    noAccount: "Ingen GitHub-konto?",
    createAccount: "Opret en gratis",
    unavailable:
      "Denne udgave af Glose kan ikke forbinde til GitHub. Du kan stadig bruge et andet git-remote.",
    codeIntro: "Skriv denne kode på GitHubs side. Så kan Glose oprette dit private repository.",
    code: "Kode til GitHub",
    copy: "Kopiér kode",
    copied: "Kopieret",
    openAgain: "Åbn GitHub igen",
    waiting: "Venter på GitHub. Skriv koden på siden, der åbnede. Glose fortsætter selv.",
    cancel: "Annullér",
    signedIn: (login: string) => `Logget ind på GitHub som ${login}.`,
    otherAccount: "Brug en anden konto",
    repository: "Navn på repository",
    repositoryHint:
      "Privat. Glose opretter det, hvis du ikke har et repository med det navn. Har du et, bruger Glose det.",
    repositoryInvalid: "Brug kun bogstaver, tal og tegnene - _ og .",
    backUp: "Tag backup",
    backingUp: "Tager backup…",
    done: "Backup taget. Alle versioner er på GitHub nu, og Glose holder dem opdateret efter hvert gem.",
    close: "Færdig",
    remoteIntro:
      "Glose pusher til et git-remote, du allerede har, med dit eget git-login: en SSH-nøgle eller en credential helper.",
    remoteUrl: "Adresse på remote",
    remotePlaceholder: "git@example.com:dig/glose-graf.git",
    useThisRemote: "Brug dette remote",
    checking: "Tjekker…",
    remoteDone: "Backup taget. Glose holder remote opdateret efter hvert gem.",
    problems: {
      declined: "Du sagde nej på GitHub, så Glose er ikke forbundet.",
      "timed-out": "Koden udløb, før GitHub fik den. Forbind igen for at få en ny kode.",
      expired: "GitHub godtager ikke længere login. Forbind igen.",
      failed: "Glose kunne ikke forbinde til GitHub. Prøv igen.",
    },
    refused: {
      "versions-off": "Glose gemmer ingen versioner nu, så der er intet at tage backup af.",
      "github-not-connected": "Glose er ikke forbundet til GitHub nu. Forbind igen.",
      "public-repository":
        "Du har et offentligt repository med det navn. Glose lægger aldrig din graf, hvor alle kan læse den. Vælg et andet navn.",
      "github-failed": "GitHub oprettede ikke dit repository. Prøv igen om lidt.",
      unreachable:
        "Git kunne ikke nå det remote eller kunne ikke logge ind på det. Tjek adressen, og at git på denne computer kan pushe dertil.",
      "other-graph":
        "Det remote indeholder en anden graf. Glose blander ikke to grafer. Brug et tomt remote eller grafens eget.",
    },
  },
  settings: {
    title: "Indstillinger",
    language: "Sprog i programmet",
    graphFolder: "Graf-mappe",
    graphFolderHint: "Skift af mappe kommer i en senere version.",
    site: "Dit websted",
    siteNotChosen: "Ikke valgt endnu.",
    siteHint: "Glose skriver blogindlæg i src/_posts i denne mappe.",
  },
};
