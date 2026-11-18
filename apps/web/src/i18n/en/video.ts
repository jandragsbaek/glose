import { count } from "./format.ts";

export const videoMessages = {
  addVideo: {
    panel: "The video",
    address: "YouTube address",
    addressHint:
      "Copy the address from YouTube's Share button or the browser, for example https://youtu.be/…",
    lookUp: "Look up",
    lookingUp: "Asking YouTube",
    filled:
      "Filled in from YouTube. The speaker is often not the channel, so check the marked fields.",
    noDetails: "YouTube gives no details for this video. Type them in yourself.",
    notYouTube: "This is not the address of a YouTube video.",
    notFound: "YouTube has no video at this address. It may be private or removed.",
    unavailable:
      "YouTube did not answer. Check the internet connection, or type the details yourself.",
    fromYouTube: "From YouTube",
    needAddress: "Paste the video's YouTube address.",
    speaker: "Speaker",
    speakerHint: "The person who speaks. For a channel's own video, use the channel's name.",
    video: "Video",
    year: "Year",
    yearHint: "The year it was published on YouTube, for example 2024. The call number needs it.",
    channel: "Channel or event",
    channelHint: "Where it appeared: a conference, or the YouTube channel.",
  },
  watch: {
    step: "Watch",
    inStep: "Watching",
    deskState: (stamps: number) => `Watching · ${count(stamps, "timestamp", "timestamps")}`,
    stepNote: (stamps: number, words: number) =>
      `${count(stamps, "timestamp", "timestamps")} · ${count(words, "word", "words")}`,
    howTo: "Write while you watch.",
    keys: (mod: string) =>
      `${mod}+Enter stamps the time · ${mod}+Shift+Enter plays or pauses · Alt+Enter plays from the timestamp before the cursor`,
    player: (title: string) => `Video: ${title}`,
    loading: "Loading the video",
    offline:
      "The video could not load. Glose needs the internet to play it; your watch notes still save.",
    blocked: "The owner of this video does not allow it to play outside YouTube.",
    failed: "YouTube cannot play this video here. It may be private, removed or not yet out.",
    openOnYouTube: "Open on YouTube",
    noAddress: "This Source has no YouTube address. Add it as url in the Source's Markdown file.",
    notes: "Watch notes",
    notesHint:
      "Your Free text. A timestamp ties the words after it to that moment of the video, and a Note made from them keeps the time as its Location.",
    placeholder: "Stamp the time, then say in your own words what the speaker means.",
    stamp: (time: string) => `Stamp ${time}`,
    stampNoPlayer: "Stamp the time",
    stampHint:
      "A click on a timestamp, or Alt+Enter after it, plays the video from there; so does the list beside the video.",
    openHint: "A click on a timestamp, or Alt+Enter after it, opens the video there.",
    cues: "Timestamps",
    cuesEmpty:
      "No timestamps yet. Stamp the time while the video plays, and the moments gather here.",
    cueNoWords: "no words yet",
    playFrom: (time: string) => `Play from ${time}`,
    playing: "playing now",
    doneTitle: "Done watching",
    doneSummary: (stamps: number, words: number) =>
      `${count(stamps, "timestamp", "timestamps")} · ${count(words, "word", "words")}`,
    doneHint:
      "Extraction turns your watch notes into Points. A Point from words after a timestamp keeps that time as its Location.",
    continue: "Continue to Extraction",
    skip: "Skip to Extraction",
    back: "Back to the step",
    watchVideo: "Watch the video",
    watchFrom: (time: string) => `Watch from ${time}`,
    fromNotes: (time: string) => `From your watch notes at ${time}:`,
    time: "Time",
    citeTimeMissing: "The Note has no time. Add it here, for example 12:34.",
    citeTimeSource: "A Video has no time of its own. Add the time you cite, for example 12:34.",
    timePlaceholder: "12:34",
  },
};
