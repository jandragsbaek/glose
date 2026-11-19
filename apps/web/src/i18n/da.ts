import { coreMessages } from "./da/core.ts";
import { sourceMessages } from "./da/sources.ts";
import { readingMessages } from "./da/reading.ts";
import { graphMessages } from "./da/graph.ts";
import { writingMessages } from "./da/writing.ts";
import { triesMessages } from "./da/tries.ts";
import { recallMessages } from "./da/recall.ts";
import { settingsMessages } from "./da/settings.ts";
import { articleMessages } from "./da/article.ts";
import { videoMessages } from "./da/video.ts";
import { courseMessages } from "./da/course.ts";
import type { Messages } from "./en.ts";

export const da: Messages = {
  ...coreMessages,
  ...sourceMessages,
  ...readingMessages,
  ...graphMessages,
  ...writingMessages,
  ...triesMessages,
  ...recallMessages,
  ...settingsMessages,
  ...articleMessages,
  ...videoMessages,
  ...courseMessages,
};
