import type { courseMessages as english } from "../en/course.ts";
import { count, numbers } from "./format.ts";

const dayName = (part: string) => {
  const match = /^(\d+)\.(\d+)$/.exec(part);
  return match === null ? `Lektion ${part}` : `Uge ${match[1]} · Dag ${match[2]}`;
};

export const courseMessages: typeof english = {
  course: {
    crumb: "Kilder",
    sub: (days: number, read: number) =>
      `${count(days, "dag", "dage")} tilføjet · ${numbers.format(read)} læst`,
    notFound:
      "Glose har intet kursus med dette navn. Dets lektioner kan være flyttet eller omdøbt.",
    backToSources: "Tilbage til Kilder",
    weeks: "Ugerne",
    weeksMeta: (weeks: number, perWeek: number) =>
      `${count(weeks, "uge", "uger")} · ${count(perWeek, "dag", "dage")} om ugen`,
    week: (week: number) => `Uge ${numbers.format(week)}`,
    weekCount: (added: number, all: number) => `${numbers.format(added)} af ${numbers.format(all)}`,
    day: (day: number) => `Dag ${numbers.format(day)}`,
    dayName,
    spineLabel: (part: string, title: string, video: boolean, read: boolean) =>
      `${dayName(part)}: ${title}${video ? ", med sin video" : ""}${read ? ", læst" : ""}`,
    emptyLabel: (part: string, next: boolean) =>
      next ? `${dayName(part)}, den næste dag at tilføje` : `${dayName(part)}, ikke tilføjet`,
    textPiece: "Tekst",
    videoPiece: "Video",
    dropOnlyText: "Slip dagens .md-fil på hylden. Tilføj videofilen her, under Videoen.",
    unplaced: "Lektioner uden uge og dag",
    shelfHint:
      "Vælg en dag for at se den. Slip en dags Markdown-fil på en tom dag for at begynde at tilføje den.",
    addNext: (part: string) => `Tilføj ${dayName(part)}`,
    notAdded: "Ikke tilføjet endnu",
    addHint: "Underviser, år og kursusadresse kommer fra kurset.",
    text: "Teksten",
    chooseText: "Vælg Markdown-filen",
    pasteText: "Indsæt teksten i stedet",
    dropText: "eller slip dagens .md-fil her. Teksten lægges i Articles, som for alle lektioner.",
    pasteLabel: "Dagens tekst i Markdown",
    useText: "Brug denne tekst",
    chooseInstead: "Vælg en fil i stedet",
    another: "Vælg en anden",
    textCounts: (paragraphs: number, words: number) =>
      `${count(paragraphs, "afsnit", "afsnit")} · ${count(words, "ord", "ord")}`,
    title: "Titel",
    titleHint: "Fra filen. Lektionens filnavn og henvisning bruger den.",
    otherDay: (part: string) =>
      `Filen er navngivet til ${dayName(part)}. Glose flyttede den til den dag.`,
    dayTaken: (part: string) =>
      `Filen er navngivet til ${dayName(part)}, men den dag er allerede tilføjet. Den lægges på denne dag.`,
    video: "Videoen",
    videoOptional: "valgfri",
    videoLink: "Videoens adresse",
    videoLinkHint:
      "Siden i kursets medlemsområde, hvor videoen afspilles. Den åbner i din browser.",
    videoLinkBad: "Det er ikke en webadresse. Kopiér den fra browserens adresselinje.",
    videoFile: "Videofil",
    videoFileHint:
      "Kun en fil, du selv har gemt. Glose lægger den i “Course videos” i dit arkiv, uden for git-backuppen, og afspiller den her.",
    chooseVideo: "Vælg en videofil",
    noVideoFile: "Ingen fil",
    videoFileBad:
      "Det er ikke en videofil, Glose kan afspille. Vælg en .mp4-, .m4v-, .webm-, .mov- eller .ogv-fil.",
    removeVideoFile: "Fjern filen",
    needText: "Vælg, slip eller indsæt dagens tekst først.",
    needTitle: "Giv dagen en titel.",
    titleTaken: "En kilde har allerede dette filnavn. Ret titlen.",
    addFailed: "Dagen kunne ikke tilføjes. Prøv igen.",
    adding: "Tilføjer dagen…",
    uploading: (percent: number) => `Kopierer videofilen… ${numbers.format(percent)} %`,
    uploadFailed: "Dagen er tilføjet, men videofilen kunne ikke kopieres. Vælg filen igen.",
    addDay: (part: string) => `Tilføj ${dayName(part)}`,
    addThen: (part: string) => `Tilføj, og derefter ${dayName(part)}`,
    added: (part: string) => `${dayName(part)} er tilføjet.`,
    read: "Læs dagen",
    continueReading: "Fortsæt",
    openVideo: "Åbn videoen",
    videoNone: "Ingen video endnu.",
    editVideo: "Skift videoen",
    addVideo: "Tilføj videoen",
    savingVideo: "Gemmer videoen…",
    saveVideo: "Gem videoen",
    cancel: "Annullér",
    videoSaved: "Videoen er gemt.",
    videoFailed: "Videoen kunne ikke gemmes. Prøv igen.",
    player: (title: string) => `Videofil: ${title}`,
    playerFailed: "Videofilen kunne ikke afspilles. Den mangler måske i “Course videos”.",
    openCourse: "Åbn kurset",
    courses: "Kurser",
    coursesMeta: (n: number) => count(n, "kursus", "kurser"),
    courseLine: (days: number, read: number, next: string) =>
      `${count(days, "dag", "dage")} · ${numbers.format(read)} læst · næste: ${dayName(next)}`,
    courseLabel: (name: string) => `Åbn kurset ${name}`,
  },
};
