import { count, numbers } from "./format.ts";

const dayName = (part: string) => {
  const match = /^(\d+)\.(\d+)$/.exec(part);
  return match === null ? `Lesson ${part}` : `Week ${match[1]} · Day ${match[2]}`;
};

export const courseMessages = {
  course: {
    crumb: "Sources",
    sub: (days: number, read: number) =>
      `${count(days, "day", "days")} in · ${numbers.format(read)} read`,
    notFound: "Glose has no course with this name. Its lessons may have moved or been renamed.",
    backToSources: "Back to Sources",
    weeks: "The weeks",
    weeksMeta: (weeks: number, perWeek: number) =>
      `${count(weeks, "week", "weeks")} · ${count(perWeek, "day", "days")} a week`,
    week: (week: number) => `Week ${numbers.format(week)}`,
    weekCount: (added: number, all: number) => `${numbers.format(added)} of ${numbers.format(all)}`,
    day: (day: number) => `Day ${numbers.format(day)}`,
    dayName,
    spineLabel: (part: string, title: string, video: boolean, read: boolean) =>
      `${dayName(part)}: ${title}${video ? ", with its video" : ""}${read ? ", read" : ""}`,
    emptyLabel: (part: string, next: boolean) =>
      next ? `${dayName(part)}, the next day to add` : `${dayName(part)}, not added`,
    textPiece: "Text",
    videoPiece: "Video",
    dropOnlyText: "Drop the day's .md file on the shelf. Add its video file here, under The video.",
    unplaced: "Lessons without a week and day",
    shelfHint:
      "Choose a day to see it. Drop a day's Markdown file on an empty day to start adding it.",
    addNext: (part: string) => `Add ${dayName(part)}`,
    notAdded: "Not added yet",
    addHint: "Its teacher, year and course address come from the course.",
    text: "The text",
    chooseText: "Choose the Markdown file",
    pasteText: "Paste the text instead",
    dropText: "or drop the day's .md file here. Its text goes into Articles, as for every lesson.",
    pasteLabel: "The day's text, in Markdown",
    useText: "Use this text",
    chooseInstead: "Choose a file instead",
    another: "Choose another",
    textCounts: (paragraphs: number, words: number) =>
      `${count(paragraphs, "paragraph", "paragraphs")} · ${count(words, "word", "words")}`,
    title: "Title",
    titleHint: "From the file. The lesson's file name and Citation use it.",
    otherDay: (part: string) =>
      `The file is named for ${dayName(part)}. Glose moved it to that day.`,
    dayTaken: (part: string) =>
      `The file is named for ${dayName(part)}, but that day is already added. It goes on this day.`,
    video: "The video",
    videoOptional: "optional",
    videoLink: "Video address",
    videoLinkHint:
      "The page in the course's members' area where the video plays. It opens in your browser.",
    videoLinkBad: "This is not a web address. Copy it from the browser's address bar.",
    videoFile: "Video file",
    videoFileHint:
      "Only a file you saved yourself. Glose keeps it in “Course videos” in your Vault, out of the git backup, and plays it here.",
    chooseVideo: "Choose a video file",
    noVideoFile: "No file",
    videoFileBad:
      "This is not a video file Glose can play. Choose an .mp4, .m4v, .webm, .mov or .ogv file.",
    removeVideoFile: "Remove the file",
    needText: "Choose, drop or paste the day's text first.",
    needTitle: "Give the day a title.",
    titleTaken: "A Source already has this file name. Change the title.",
    addFailed: "The day could not be added. Try again.",
    adding: "Adding the day…",
    uploading: (percent: number) => `Copying the video file… ${numbers.format(percent)}%`,
    uploadFailed:
      "The day is added, but its video file could not be copied. Choose the file again.",
    addDay: (part: string) => `Add ${dayName(part)}`,
    addThen: (part: string) => `Add, then ${dayName(part)}`,
    added: (part: string) => `${dayName(part)} is added.`,
    read: "Read the day",
    continueReading: "Continue",
    openVideo: "Open the video",
    videoNone: "No video yet.",
    editVideo: "Change the video",
    addVideo: "Add the video",
    savingVideo: "Saving the video…",
    saveVideo: "Save the video",
    cancel: "Cancel",
    videoSaved: "Video saved.",
    videoFailed: "The video could not be saved. Try again.",
    player: (title: string) => `Video file: ${title}`,
    playerFailed: "The video file could not play. It may be missing from “Course videos”.",
    openCourse: "Open the course",
    courses: "Courses",
    coursesMeta: (n: number) => count(n, "course", "courses"),
    courseLine: (days: number, read: number, next: string) =>
      `${count(days, "day", "days")} · ${numbers.format(read)} read · next: ${dayName(next)}`,
    courseLabel: (name: string) => `Open the course ${name}`,
  },
};
