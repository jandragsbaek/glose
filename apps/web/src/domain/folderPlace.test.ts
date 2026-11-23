import { assert, describe, it } from "@effect/vitest";

import { folderIn, folderPlace } from "./folderPlace.ts";

describe("folderPlace", () => {
  it("names a folder right in the home folder by the home folder's own name", () => {
    assert.deepStrictEqual(folderPlace("/Users/anna/Glose", "/Users/anna"), {
      name: "Glose",
      within: { _tag: "Home", home: "anna" },
    });
  });

  it("gives the folders between home and the Vault as a trail", () => {
    assert.deepStrictEqual(folderPlace("/Users/anna/Documents/Study/Glose/", "/Users/anna"), {
      name: "Glose",
      within: { _tag: "InHome", trail: ["Documents", "Study"] },
    });
  });

  it("reads Windows paths without regard to case", () => {
    assert.deepStrictEqual(folderPlace("C:\\Users\\Jan\\Documents\\Glose", "c:\\users\\jan"), {
      name: "Glose",
      within: { _tag: "InHome", trail: ["Documents"] },
    });
  });

  it("gives the whole parent of a folder outside home", () => {
    assert.deepStrictEqual(folderPlace("/Volumes/USB/Glose", "/Users/anna"), {
      name: "Glose",
      within: { _tag: "Elsewhere", parent: "/Volumes/USB" },
    });
  });

  it("does not take a home folder's namesake for home", () => {
    assert.strictEqual(folderPlace("/Users/annabel/Glose", "/Users/anna").within._tag, "Elsewhere");
  });
});

describe("folderIn", () => {
  it("puts the new folder inside the chosen place with that place's separator", () => {
    assert.strictEqual(folderIn("/Users/anna/Documents/", "Glose"), "/Users/anna/Documents/Glose");
    assert.strictEqual(folderIn("D:\\", "Glose"), "D:\\Glose");
  });
});
