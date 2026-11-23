import { assert, describe, it } from "@effect/vitest";

import { echoesAt, keptKey, pencilMarks } from "./pencil.ts";

const marked = (body: string, language = "en") =>
  pencilMarks(body, language).map((mark) => `${mark.rule}:${body.slice(mark.from, mark.to)}`);

const echoed = (body: string, caret: number, language = "en") =>
  echoesAt(body, caret, language).map((span) => body.slice(span.from, span.to));

describe("pencilMarks", () => {
  it("marks habits and clichés in English prose", () => {
    const body =
      "There was a time when I just wanted to actually finish every book. I decided to read " +
      "faster, and I very quickly forgot it all. At the end of the day, speed was never the point.";
    assert.deepStrictEqual(marked(body), [
      "there-is:There was",
      "crutch:just",
      "crutch:actually",
      "filter:decided to",
      "adverb:very quickly",
      "cliche:At the end of the day",
    ]);
  });

  it("lets a cliché win over the smaller marks inside it", () => {
    assert.deepStrictEqual(marked("It was a dark and stormy night."), [
      "cliche:It was a dark and stormy night",
    ]);
  });

  it("finds phrases across bold, italic and a line break", () => {
    assert.deepStrictEqual(marked("Little did *I\nknow* what came."), [
      "cliche:Little did *I\nknow",
    ]);
  });

  it("marks the passive voice but not an adjective after a verb", () => {
    assert.deepStrictEqual(marked("The tray was carried by him. She was tired. It was taken."), [
      "passive:was carried",
      "passive:was taken",
    ]);
  });

  it("marks three sentences in a row that open on the same word", () => {
    assert.deepStrictEqual(marked("I went. I saw. I left. Then home."), [
      "same-start:I",
      "same-start:I",
      "same-start:I",
    ]);
  });

  it("marks three paragraphs in a row that open on the same word", () => {
    assert.deepStrictEqual(marked("Notes help.\n\nNotes last.\n\nNotes link."), [
      "same-start:Notes",
      "same-start:Notes",
      "same-start:Notes",
    ]);
  });

  it("reads no References, code or comments", () => {
    assert.deepStrictEqual(
      marked("Reading [[Just a note]]{p. 4} is `really` fine.<!-- just -->"),
      [],
    );
  });

  it("does not mark a word inside a longer word", () => {
    assert.deepStrictEqual(marked("A just-in-time plan; justice; adjust."), []);
  });

  it("marks Danish habits and clichés", () => {
    assert.deepStrictEqual(
      marked(
        "Der var engang en bog. Jeg ville bare læse den, og i sidste ende blev den læst.",
        "da",
      ),
      ["there-is:Der var", "crutch:bare", "cliche:i sidste ende", "passive:blev den læst"],
    );
  });

  it("gives other languages only the mechanics", () => {
    assert.deepStrictEqual(marked("Das ist just das das Buch.", "de"), ["doubled:das"]);
  });

  it("marks doubled words, but not those that may be doubled", () => {
    assert.deepStrictEqual(marked("I read the the book. She had had enough."), ["doubled:the"]);
  });

  it("marks a quote, a bracket and bold left open", () => {
    assert.deepStrictEqual(marked("He said “wait. (Later **now. A “closed” one."), [
      "open-quote:“",
      "open-bracket:(",
      "open-emphasis:**",
    ]);
  });

  it("reads Danish quotes the Danish way", () => {
    assert.deepStrictEqual(marked("Han sagde »vent« og „kom“.", "da"), []);
    assert.deepStrictEqual(marked("Han sagde »vent og gik.", "da"), ["open-quote:»"]);
  });

  it("leaves a list bullet and a lone star alone", () => {
    assert.deepStrictEqual(marked("* one item\n* two items\n\n2 * 3 is six."), []);
  });
});

describe("echoesAt", () => {
  const body =
    "Notes changed that. A note sends me back to the page. The pages I skimmed.\n\nA page.";

  it("finds the caret's word and its forms in the paragraph only", () => {
    assert.deepStrictEqual(echoed(body, body.indexOf("page")), ["page", "pages"]);
  });

  it("finds nothing for a short or common word", () => {
    assert.deepStrictEqual(echoed(body, body.indexOf("the")), []);
  });

  it("finds nothing for a word used once", () => {
    assert.deepStrictEqual(echoed(body, body.indexOf("skimmed")), []);
  });
});

describe("keptKey", () => {
  it("changes when the sentence around the mark changes", () => {
    const before = "I just read. Then I wrote.";
    const after = "I just read it. Then I wrote.";
    const [one] = pencilMarks(before, "en");
    const [two] = pencilMarks(after, "en");
    assert.ok(one !== undefined && two !== undefined);
    assert.notStrictEqual(keptKey(before, one), keptKey(after, two));
    assert.strictEqual(
      keptKey(before, one),
      keptKey(`Hello. ${before}`, { ...one, from: one.from + 7, to: one.to + 7 }),
    );
  });
});
