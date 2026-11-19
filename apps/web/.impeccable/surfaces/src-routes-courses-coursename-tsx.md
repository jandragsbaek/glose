---
version: 1
slug: "src-routes-courses-coursename-tsx"
primary_target: "src/routes/courses.$courseName.tsx"
related_targets:
  [
    "src/components/CourseShelf.tsx",
    "src/components/CourseDay.tsx",
    "src/components/AddCourseDay.tsx",
    "src/components/VideoFields.tsx",
    "src/routes/sources.index.tsx",
  ]
---

# The Course page (The Course Shelf)

Mode: Operate. The page of one Course at `/courses/<course name>` (`?day=<week.day>` picks a day),
plus the Courses panel on Sources and "Open the course" at the end of Add Source → Course lessons.

Audience and task: Jan at his desk with a paid course (mega.dev's AI course, 4 weeks of 5 days)
that arrives one day at a time: a Markdown text and a members-only video per day. He puts each day
in as it comes, for later reading. Success: the whole course is in Glose, each day a Course lesson
with its Lesson video, and the shelf shows at a glance which days are in and which come next.

Picked by Jan on the impeccable decision page (Nov 2026): "The Course Shelf", over "The Day Leaf"
(one day at a time under week tabs) and "Add a Day Sheet" (a modal over Sources).

## Direction contract

THESIS: A course is a shelf, not a table: each week a row of day spines, the gap where the next
day goes. Refuses the import-form-then-register-rows arrangement, where a course has no place.

OWN-WORLD: Glose's Lapis world unchanged: lapis spines with a gilt band and a typed white call
label, dashed Strong Hairline spines for days not added, the next day outlined in Lapis on Lapis
Tint, a 3px Gilt "here" bar under the chosen spine, white Panels with Cinzel initials.

STORY: Jan sees the weeks he has, the day that comes next, and adds it in one leaf: text, title,
video link, optional saved file. He can move on to the following day without leaving.

FIRST VIEWPORT: Page head (course name, Sources link, teacher, call number, counts; "Add Week n ·
Day n" when another day is chosen). Two columns: "The weeks" panel (week label and count at the
left of each shelf row) and the day leaf (420px) beside it, which adds an empty day or shows an
added one with Read the day, its text and its video.

FORM: The Course Shelf, dealt lead (position 5 of 7 on the ranked list). seed:f106538277042565

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
