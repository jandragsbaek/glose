import * as NodeDns from "node:dns";
import * as NodeNet from "node:net";

const ipv4Public = (address: string): boolean => {
  const [a = 0, b = 0, c = 0] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
};

const ipv6Bytes = (address: string): ReadonlyArray<number> | null => {
  let text = address.toLowerCase().split("%")[0] ?? "";
  const dotted = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text)?.[1];
  if (dotted !== undefined) text = `${text.slice(0, -dotted.length)}0:0`;
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const groups = (part: string | undefined) =>
    part === undefined || part === "" ? [] : part.split(":").map((group) => parseInt(group, 16));
  const head = groups(halves[0]);
  const tail = groups(halves[1]);
  const all =
    halves.length === 1
      ? head
      : [...head, ...Array<number>(8 - head.length - tail.length).fill(0), ...tail];
  if (all.length !== 8 || all.some((group) => !(group >= 0 && group <= 0xffff))) return null;
  const bytes = all.flatMap((group) => [group >> 8, group & 0xff]);
  if (dotted !== undefined) bytes.splice(12, 4, ...dotted.split(".").map(Number));
  return bytes;
};

const v4At = (bytes: ReadonlyArray<number>, at: number) => bytes.slice(at, at + 4).join(".");

const zeros = (bytes: ReadonlyArray<number>, from: number, to: number) =>
  bytes.slice(from, to).every((byte) => byte === 0);

const ipv6Public = (address: string): boolean => {
  const bytes = ipv6Bytes(address);
  if (bytes === null) return false;
  const [b0 = 0, b1 = 0, b2 = 0, b3 = 0] = bytes;
  if (zeros(bytes, 0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return ipv4Public(v4At(bytes, 12));
  }
  if (zeros(bytes, 0, 12)) return false;
  if (b0 === 0x00 && b1 === 0x64 && b2 === 0xff && b3 === 0x9b) {
    return zeros(bytes, 4, 12) && ipv4Public(v4At(bytes, 12));
  }
  if (b0 === 0x20 && b1 === 0x02) return ipv4Public(v4At(bytes, 2));
  if ((b0 & 0xe0) !== 0x20) return false;
  if (b0 === 0x20 && b1 === 0x01 && b2 === 0x0d && b3 === 0xb8) return false;
  return !(b0 === 0x20 && b1 === 0x01 && b2 === 0x00 && b3 < 0x20);
};

export const isPublicAddress = (address: string): boolean => {
  const kind = NodeNet.isIP(address);
  return kind === 4 ? ipv4Public(address) : kind === 6 ? ipv6Public(address) : false;
};

export class AddressRefused extends Error {
  readonly code = "EGLOSEADDRESS";
}

export const publicLookup: NodeNet.LookupFunction = (hostname, options, callback) => {
  NodeDns.lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error !== null) {
      callback(error, "");
      return;
    }
    const wanted = addresses.filter(
      ({ family }) =>
        options.family === undefined || options.family === 0 || family === options.family,
    );
    if (wanted.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
      callback(new AddressRefused(hostname), "");
      return;
    }
    if (options.all === true) callback(null, [...wanted]);
    else callback(null, wanted[0]!.address, wanted[0]!.family);
  });
};
