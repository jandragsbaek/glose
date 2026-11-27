const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001F]/g;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_LENGTH = 120;

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

export const isFileName = (id: string): boolean => id.length > 0 && toFileName(id) === id;

export const fileNameKey = (name: string): string => name.normalize("NFC").toLowerCase();

export const sameFileName = (a: string, b: string): boolean => fileNameKey(a) === fileNameKey(b);
