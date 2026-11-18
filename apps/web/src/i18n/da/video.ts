import type { videoMessages as english } from "../en/video.ts";
import { count } from "./format.ts";

export const videoMessages: typeof english = {
  addVideo: {
    panel: "Videoen",
    address: "YouTube-adresse",
    addressHint:
      "Kopiér adressen fra YouTubes Del-knap eller fra browseren, for eksempel https://youtu.be/…",
    lookUp: "Slå op",
    lookingUp: "Spørger YouTube",
    filled: "Udfyldt fra YouTube. Taleren er ofte ikke kanalen, så tjek de markerede felter.",
    noDetails: "YouTube giver ingen oplysninger om denne video. Skriv dem selv.",
    notYouTube: "Det er ikke adressen på en YouTube-video.",
    notFound: "YouTube har ingen video på denne adresse. Den kan være privat eller fjernet.",
    unavailable: "YouTube svarede ikke. Tjek internetforbindelsen, eller skriv oplysningerne selv.",
    fromYouTube: "Fra YouTube",
    needAddress: "Indsæt videoens YouTube-adresse.",
    speaker: "Taler",
    speakerHint: "Den person, der taler. Er det kanalens egen video, så brug kanalens navn.",
    video: "Video",
    year: "År",
    yearHint:
      "Året, den blev lagt på YouTube, for eksempel 2024. Opstillingssignaturen skal bruge det.",
    channel: "Kanal eller begivenhed",
    channelHint: "Hvor den udkom: en konference eller YouTube-kanalen.",
  },
  watch: {
    step: "Se",
    inStep: "Ser",
    deskState: (stamps: number) => `Ser · ${count(stamps, "tidsstempel", "tidsstempler")}`,
    stepNote: (stamps: number, words: number) =>
      `${count(stamps, "tidsstempel", "tidsstempler")} · ${count(words, "ord", "ord")}`,
    howTo: "Skriv, mens du ser.",
    keys: (mod: string) =>
      `${mod}+Enter stempler tiden · ${mod}+Skift+Enter afspiller eller pauser · Alt+Enter afspiller fra tidsstemplet før markøren`,
    player: (title: string) => `Video: ${title}`,
    loading: "Henter videoen",
    offline:
      "Videoen kunne ikke hentes. Glose skal bruge internettet for at afspille den; dine noter gemmes stadig.",
    blocked: "Ejeren af denne video tillader ikke, at den afspilles uden for YouTube.",
    failed:
      "YouTube kan ikke afspille denne video her. Den kan være privat, fjernet eller ikke udkommet endnu.",
    openOnYouTube: "Åbn på YouTube",
    noAddress: "Denne kilde har ingen YouTube-adresse. Tilføj den som url i kildens Markdown-fil.",
    notes: "Noter til videoen",
    notesHint:
      "Din frie tekst. Et tidsstempel knytter ordene efter det til netop det sted i videoen, og en note lavet af dem beholder tiden som sin placering.",
    placeholder: "Stempl tiden, og sig så med dine egne ord, hvad taleren mener.",
    stamp: (time: string) => `Stempl ${time}`,
    stampNoPlayer: "Stempl tiden",
    stampHint:
      "Et klik på et tidsstempel, eller Alt+Enter efter det, afspiller videoen derfra; det gør listen ved siden af videoen også.",
    openHint: "Et klik på et tidsstempel, eller Alt+Enter efter det, åbner videoen der.",
    cues: "Tidsstempler",
    cuesEmpty:
      "Ingen tidsstempler endnu. Stempl tiden, mens videoen kører, så samles stederne her.",
    cueNoWords: "ingen ord endnu",
    playFrom: (time: string) => `Afspil fra ${time}`,
    playing: "spiller nu",
    doneTitle: "Færdig med at se",
    doneSummary: (stamps: number, words: number) =>
      `${count(stamps, "tidsstempel", "tidsstempler")} · ${count(words, "ord", "ord")}`,
    doneHint:
      "Udtræk gør dine noter til punkter. Et punkt fra ordene efter et tidsstempel beholder tiden som sin placering.",
    continue: "Fortsæt til udtræk",
    skip: "Spring til udtræk",
    back: "Tilbage til trinnet",
    watchVideo: "Se videoen",
    watchFrom: (time: string) => `Se fra ${time}`,
    fromNotes: (time: string) => `Fra dine noter ved ${time}:`,
    time: "Tid",
    citeTimeMissing: "Noten har ingen tid. Tilføj den her, for eksempel 12:34.",
    citeTimeSource:
      "En video har ingen tid i sig selv. Tilføj den tid, du henviser til, for eksempel 12:34.",
    timePlaceholder: "12:34",
  },
};
