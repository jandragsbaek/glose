import { useAtomSet } from "@effect/atom-react";
import type { WritingProject, WritingProjectFields } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { saveWritingAtom, WRITING_KEYS } from "../state/writing.ts";

const SAVE_AFTER_MS = 700;

export type SaveState = "saved" | "saving" | "failed" | "taken" | "empty";

const fieldsOf = (project: WritingProject): WritingProjectFields => ({
  title: project.title,
  type: project.type,
  language: project.language,
  referenceForm: project.referenceForm,
  citationStyle: project.citationStyle,
  body: project.body,
  tries: project.tries,
});

export function useWritingSave(project: WritingProject, onRenamed: (id: string) => void) {
  const [fields, setFields] = useState(() => fieldsOf(project));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const savedId = useRef(project.id);
  const lastSaved = useRef(JSON.stringify(fieldsOf(project)));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(fieldsOf(project)));
  const saving = useRef<Promise<void>>(Promise.resolve());
  const saveWriting = useAtomSet(saveWritingAtom, { mode: "promiseExit" });

  const update = (change: Partial<WritingProjectFields>) =>
    setFields((current) => ({ ...current, ...change }));

  const save = (next: WritingProjectFields): Promise<boolean> => {
    const snapshot = JSON.stringify(next);
    const run = saving.current.then(async () => {
      if (snapshot === lastSaved.current) return true;
      setSaveState("saving");
      const exit = await saveWriting({
        payload: { id: savedId.current, ...next },
        reactivityKeys: WRITING_KEYS.list,
      });
      if (Exit.isSuccess(exit)) {
        lastSaved.current = snapshot;
        setSavedSnapshot(snapshot);
        setSaveState("saved");
        if (exit.value.id !== savedId.current) {
          savedId.current = exit.value.id;
          onRenamed(exit.value.id);
        }
        return true;
      }
      const error = Cause.findErrorOption(exit.cause);
      setSaveState(
        Option.isSome(error) && error.value._tag === "WritingProjectNameTaken" ? "taken" : "failed",
      );
      return false;
    });
    saving.current = run.then(() => undefined);
    return run;
  };

  const pending = JSON.stringify(fields) !== savedSnapshot;
  const latest = useRef({ fields, save });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: the save timer and the closing desk use the newest text and save.
  useLayoutEffect(() => {
    latest.current = { fields, save };
  });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a timer, not state: the text is written to its file when the writer pauses.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => void latest.current.save(fields), SAVE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [fields, pending]);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a save, not state: what the writer typed in the last moment is kept when the desk closes.
  useEffect(() => () => void latest.current.save(latest.current.fields), []);

  return { fields, update, saveState, setSaveState, savedId, save, pending };
}
