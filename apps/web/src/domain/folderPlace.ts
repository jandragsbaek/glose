export interface FolderPlace {
  readonly name: string;
  readonly within:
    | { readonly _tag: "Home"; readonly home: string }
    | { readonly _tag: "InHome"; readonly trail: ReadonlyArray<string> }
    | { readonly _tag: "Elsewhere"; readonly parent: string };
}

const separatorOf = (path: string) => (path.includes("\\") && !path.includes("/") ? "\\" : "/");

const trimmed = (path: string) => {
  const separator = separatorOf(path);
  let end = path.length;
  while (end > 1 && path[end - 1] === separator) end -= 1;
  return path.slice(0, end);
};

const sameFolder = (a: string, b: string) =>
  separatorOf(a) === "\\" ? a.toLowerCase() === b.toLowerCase() : a === b;

export const lastName = (path: string) => {
  const clean = trimmed(path);
  return clean.slice(clean.lastIndexOf(separatorOf(clean)) + 1);
};

export const parentOf = (path: string) => {
  const clean = trimmed(path);
  const cut = clean.lastIndexOf(separatorOf(clean));
  return cut <= 0 ? clean.slice(0, cut + 1) : clean.slice(0, cut);
};

export const folderIn = (place: string, name: string) => {
  const separator = separatorOf(place);
  return place.endsWith(separator) ? `${place}${name}` : `${place}${separator}${name}`;
};

export const folderPlace = (path: string, home: string): FolderPlace => {
  const clean = trimmed(path.trim());
  const separator = separatorOf(clean);
  const cut = clean.lastIndexOf(separator);
  const name = clean.slice(cut + 1);
  const parent = cut <= 0 ? clean.slice(0, cut + 1) : clean.slice(0, cut);
  const homeFolder = trimmed(home);
  if (sameFolder(parent, homeFolder)) {
    return { name, within: { _tag: "Home", home: lastName(homeFolder) } };
  }
  const homePrefix = `${homeFolder}${separator}`;
  if (sameFolder(parent.slice(0, homePrefix.length), homePrefix)) {
    const trail = parent.slice(homePrefix.length).split(separator).filter(Boolean);
    return { name, within: { _tag: "InHome", trail } };
  }
  return { name, within: { _tag: "Elsewhere", parent } };
};
