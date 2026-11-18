import type { WebPage } from "../research/WebPages.ts";
import { toolCall } from "./sessions.ts";

export const URL_A = "https://learning.example/retrieval";
export const URL_B = "https://study.example/rereading";

export const PAGE_A: WebPage = {
  url: URL_A,
  title: "Retrieval practice, explained",
  author: "Sample Author",
  site: "Learning Example",
  published: "2024-03-01T10:00:00Z",
  markdown:
    "# Retrieval practice\n\nRetrieval practice means bringing information to mind without looking.\n\nStudents who tested themselves remembered more a week later than students who reread.\n",
};

export const PAGE_B: WebPage = {
  url: URL_B,
  title: "When rereading is enough",
  author: null,
  site: "Study Example",
  published: null,
  markdown: "For simple facts read once, rereading did as well as a test.\n",
};

export const DRAFT = "new-abc123def";

export const searchThenRead = {
  status: 200,
  sse: true,
  body: [
    {
      type: "response.output_item.done",
      item: {
        id: "ws_1",
        type: "web_search_call",
        status: "completed",
        action: {
          type: "search",
          query: "testing effect rereading",
          sources: [
            { type: "url", url: URL_A },
            { type: "url", url: URL_B },
          ],
        },
      },
    },
    ...toolCall("read_web_page", { url: URL_A }).body,
  ],
};

export const proposePages = toolCall("propose_pages", {
  pages: [
    {
      url: URL_A,
      stance: "supports",
      kind: "web",
      why: "It reports the finding.",
      author: null,
      quotes: [
        "“Students who tested themselves remembered more a week later than students who reread.”",
        "Words that are not on the page.",
      ],
    },
    {
      url: URL_B,
      stance: "pulls-against",
      kind: "web",
      why: "It finds no gain for simple facts.",
      author: null,
      quotes: ["Rereading always wins."],
    },
  ],
});
