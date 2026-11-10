/** Characters Windows forbids in file names, plus control characters. */
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001F]/g;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_LENGTH = 120;

/**
 * A file name (without extension) that is valid on macOS, Windows and Linux: NFC-normalized,
 * no forbidden characters, no leading dot, no trailing dot or space, no reserved device name.
 */
export const toFileName = (raw: string): string => {
  let name = raw
    .normalize("NFC")
    .replace(FORBIDDEN, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  if (name.length > MAX_LENGTH) name = name.slice(0, MAX_LENGTH);
  name = name.replace(/[. ]+$/, "");
  return RESERVED.test(name) ? `${name}_` : name;
};

/** An id from the client is a file name; anything else (a path, `..`) is rejected. */
export const isFileName = (id: string): boolean => id.length > 0 && toFileName(id) === id;

/** Two names that differ only in case are the same file on macOS and Windows. */
export const sameFileName = (a: string, b: string): boolean =>
  a.normalize("NFC").toLocaleLowerCase("und") === b.normalize("NFC").toLocaleLowerCase("und");
