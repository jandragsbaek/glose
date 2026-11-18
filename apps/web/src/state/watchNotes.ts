interface Draft {
  readonly text: string;
  readonly bases: ReadonlyArray<string>;
}

const STORE = "glose.watchNotes.";
const drafts = new Map<string, Draft>();
const written = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

const same = (a: string, b: string) => a.trimEnd() === b.trimEnd();

const stored = (sourceId: string): Draft | undefined => {
  try {
    const raw = localStorage.getItem(STORE + sourceId);
    if (raw === null) return undefined;
    const draft: unknown = JSON.parse(raw);
    if (typeof draft !== "object" || draft === null) return undefined;
    const { text, bases } = draft as { text?: unknown; bases?: unknown };
    return typeof text === "string" &&
      Array.isArray(bases) &&
      bases.every((base) => typeof base === "string")
      ? { text, bases }
      : undefined;
  } catch {
    return undefined;
  }
};

const store = (sourceId: string, draft: Draft | undefined) => {
  try {
    if (draft === undefined) localStorage.removeItem(STORE + sourceId);
    else localStorage.setItem(STORE + sourceId, JSON.stringify(draft));
  } catch {
    return;
  }
};

const put = (sourceId: string, draft: Draft) => {
  drafts.set(sourceId, draft);
  store(sourceId, draft);
};

const forget = (sourceId: string) => {
  drafts.delete(sourceId);
  store(sourceId, undefined);
};

export const draftOf = (sourceId: string): string | undefined => drafts.get(sourceId)?.text;

export const restoreDraft = (sourceId: string, saved: string): string | undefined => {
  const kept = drafts.get(sourceId);
  if (kept !== undefined) return kept.text;
  const left = stored(sourceId);
  if (left === undefined) return undefined;
  if (!same(left.text, saved) && !left.bases.some((base) => same(base, saved))) {
    store(sourceId, undefined);
    return undefined;
  }
  drafts.set(sourceId, left);
  return left.text;
};

export const keepDraft = (sourceId: string, text: string, base: string): void => {
  const last = written.get(sourceId);
  put(sourceId, {
    text,
    bases: drafts.get(sourceId)?.bases ?? (last === undefined ? [base] : [base, last]),
  });
};

const enqueue = (job: () => Promise<boolean>): Promise<boolean> => {
  const next = queue.then(() => job().catch(() => false));
  queue = next;
  return next;
};

const writeDraft = async (sourceId: string, write: (text: string) => Promise<boolean>) => {
  const draft = drafts.get(sourceId);
  if (draft === undefined) return true;
  put(sourceId, { text: draft.text, bases: [...draft.bases, draft.text] });
  const ok = await write(draft.text);
  if (ok) written.set(sourceId, draft.text);
  const newer = drafts.get(sourceId);
  if (ok && newer !== undefined && newer.text === draft.text) forget(sourceId);
  else if (ok && newer !== undefined) put(sourceId, { text: newer.text, bases: [draft.text] });
  return ok;
};

export const saveNotes = (
  sourceId: string,
  write: (text: string) => Promise<boolean>,
): Promise<boolean> => enqueue(() => writeDraft(sourceId, write));

export const finishNotes = (
  sourceId: string,
  write: (text: string) => Promise<boolean>,
  advance: () => Promise<boolean>,
): Promise<boolean> =>
  enqueue(() => (drafts.has(sourceId) ? writeDraft(sourceId, write) : advance()));
