---
version: 1
slug: "src-components-watch-tsx"
primary_target: "src/components/Watch.tsx"
related_targets:
  [
    "src/components/WatchNotes.tsx",
    "src/components/youtube.ts",
    "src/components/AddVideo.tsx",
    "src/routes/sources.$sourceId.tsx",
  ]
---

# The Watch step (The Cue Sheet)

Mode: Operate while watching, Read when going back. The Watch step of a Video Source at
`/sources/<Source>` (while `reading-step` is `free-text`, or with `?watch=1` or `?t=<seconds>`
from a later step), plus Add Source for a Video (`/sources/new?kind=video`).

Audience and task: Jan or his girlfriend at a desk with a conference talk or a lecture on YouTube.
They watch, stamp the moments that matter, and write in their own words what the speaker means.
Success: watch notes whose timestamps lead back to the exact second, and Points in Extraction that
keep those times as their Location.

Picked by the agent on Jan's word ("choose impeccable's best recommendation", Nov 2026): "The Cue
Sheet", over a Timeline Ruler with Moment slips kept in their own file and a Reader-like page with
slips beside the video.

## Direction contract

THESIS: The video is a plate in the book, and the watch notes are the Free text written beside
it; each stamped moment is a Location like a page or a paragraph, written in Courier, listed under
the plate like a film's cue sheet. It refuses the video-app timeline with markers and the
transcript-beside-a-player arrangement.

OWN-WORLD: Glose's Call Numbers world unchanged. The plate a Paper sheet with a Hairline; the cue
list in the Contents' form with the Gilt edge for the moment playing; timestamps in Courier Lapis
on Lapis Tint; the margin a Panel with a rubric Initial; Done watching as the Done Reading colophon.

STORY: The viewer adds the Video by its address, watches, stamps (Ctrl+Enter) and writes, plays
back from a cue to check a phrase, and continues to Extraction, where each Point keeps its time.

FIRST VIEWPORT: Page head with title, speaker, channel or event, call number and Open on YouTube.
The Ground band with the Step Bar (Watch · Extraction · Probe) and the keys. Two columns: the
plate (up to 880px) with Timestamps under it, and the watch notes (320–400px) with the Stamp
button in view.

## Open decisions

- Other video sites (Vimeo, a conference's own player).
- Playback speed and skip keys.
- Timestamps inside a Note's own text opening the video in Glose.
