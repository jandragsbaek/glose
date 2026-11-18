interface Draft {
  readonly text: string;
  readonly bases: ReadonlyArray<string>;
}

const STORE = "glose.watchNotes.";
const drafts = new Map<string, Draft>();
interface Written {
  readonly text: string;
  readonly over: ReadonlyArray<string>;
  readonly revision: number;
}

export type WriteNotes = (text: string) => Promise<number | false>;

const written = new Map<string, Written>();
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

export const savedOver = (
  sourceId: string,
  saved: string,
  revision: number,
): string | undefined => {
  const last = written.get(sourceId);
  if (last === undefined) return undefined;
  const older =
    revision < last.revision ||
    (revision === last.revision && last.over.some((base) => same(base, saved)));
  if (older && !same(last.text, saved)) return last.text;
  if (!older) written.delete(sourceId);
  return undefined;
};

export const keepDraft = (sourceId: string, text: string, base: string): void => {
  const last = written.get(sourceId)?.text;
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

const writeDraft = async (sourceId: string, write: WriteNotes) => {
  const draft = drafts.get(sourceId);
  if (draft === undefined) return true;
  put(sourceId, { text: draft.text, bases: [...draft.bases, draft.text] });
  const revision = await write(draft.text);
  const ok = revision !== false;
  if (ok) {
    const before = written.get(sourceId)?.over ?? [];
    written.set(sourceId, { text: draft.text, over: [...before, ...draft.bases], revision });
  }
  const newer = drafts.get(sourceId);
  if (ok && newer !== undefined && newer.text === draft.text) forget(sourceId);
  else if (ok && newer !== undefined) put(sourceId, { text: newer.text, bases: [draft.text] });
  return ok;
};

export const saveNotes = (sourceId: string, write: WriteNotes): Promise<boolean> =>
  enqueue(() => writeDraft(sourceId, write));

export const finishNotes = (
  sourceId: string,
  write: WriteNotes,
  advance: () => Promise<boolean>,
): Promise<boolean> =>
  enqueue(() => (drafts.has(sourceId) ? writeDraft(sourceId, write) : advance()));
