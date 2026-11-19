import { coreMessages } from "./en/core.ts";
import { sourceMessages } from "./en/sources.ts";
import { readingMessages } from "./en/reading.ts";
import { graphMessages } from "./en/graph.ts";
import { writingMessages } from "./en/writing.ts";
import { triesMessages } from "./en/tries.ts";
import { recallMessages } from "./en/recall.ts";
import { settingsMessages } from "./en/settings.ts";
import { articleMessages } from "./en/article.ts";
import { videoMessages } from "./en/video.ts";
import { courseMessages } from "./en/course.ts";

export const en = {
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

export type Messages = typeof en;
