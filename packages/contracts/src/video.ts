import * as Schema from "effect/Schema";

import { MARKDOWN_CODE } from "./graph.ts";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const WATCH_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const PATH_KINDS = new Set(["embed", "live", "shorts", "v"]);

const urlOf = (address: string): URL | null => {
  const trimmed = address.trim();
  if (trimmed === "") return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
};

export const youtubeId = (address: string): string | null => {
  const url = urlOf(address);
  if (url === null || (url.protocol !== "https:" && url.protocol !== "http:")) return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter((part) => part !== "");
  const id =
    host === "youtu.be"
      ? parts[0]
      : WATCH_HOSTS.has(host)
        ? parts[0] === "watch"
          ? url.searchParams.get("v")
          : PATH_KINDS.has(parts[0] ?? "")
            ? parts[1]
            : undefined
        : undefined;
  return id !== undefined && id !== null && VIDEO_ID.test(id) ? id : null;
};

export const videoAddress = (id: string): string => `https://www.youtube.com/watch?v=${id}`;

const twoDigits = (value: number) => String(value).padStart(2, "0");

export const timestampText = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = whole % 60;
  return hours > 0
    ? `${hours}:${twoDigits(minutes)}:${twoDigits(rest)}`
    : `${minutes}:${twoDigits(rest)}`;
};

const TIMESTAMP = /^(?:(\d+):([0-5]\d)|(\d{1,3})):([0-5]\d)$/;

export const timestampSeconds = (text: string): number | null => {
  const match = TIMESTAMP.exec(text.trim());
  if (match === null) return null;
  const [, hours, minutesOfHour, minutes, seconds] = match;
  return hours !== undefined
    ? Number(hours) * 3600 + Number(minutesOfHour) * 60 + Number(seconds)
    : Number(minutes) * 60 + Number(seconds);
};

export const isTimestamp = (location: string): boolean => timestampSeconds(location) !== null;

export const stampLink = (id: string, seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `[${timestampText(whole)}](${videoAddress(id)}&t=${whole}s)`;
};

const LINK_TIME = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/;

const linkSeconds = (address: string): number | null | undefined => {
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(address) ? address : `https://${address}`);
  } catch {
    return undefined;
  }
  const fragment = new URLSearchParams(url.hash.slice(1));
  const times = [
    ...url.searchParams.getAll("t"),
    ...url.searchParams.getAll("start"),
    ...url.searchParams.getAll("time_continue"),
    ...fragment.getAll("t"),
  ].filter((time) => time !== "");
  if (times.length === 0) return null;
  const seconds = times.map((time) => {
    const match = LINK_TIME.exec(time);
    if (match === null || match[0] === "") return undefined;
    const [, hours, minutes, rest] = match;
    return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(rest ?? 0);
  });
  const [first] = seconds;
  return seconds.every((value) => value !== undefined && value === first) ? first : undefined;
};

export interface Stamp {
  readonly start: number;
  readonly end: number;
  readonly seconds: number;
  readonly label: string;
}

const STAMP = /\[([0-9:]{4,12})\](?:\(([^()\s]+)\))?/g;

const linkAgrees = (address: string, videoId: string | null, seconds: number) => {
  if (videoId === null || youtubeId(address) !== videoId) return false;
  const time = linkSeconds(address);
  return time === null || time === seconds;
};

const INDENTED_CODE =
  /(?:^|\n[ \t]*\n)((?:(?: {4}|\t)[^\n]*(?:\n|$))(?:[ \t]*\n(?=(?: {4}|\t))|(?: {4}|\t)[^\n]*(?:\n|$))*)/g;

const codeRanges = (markdown: string) => [
  ...Array.from(markdown.matchAll(MARKDOWN_CODE), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  })),
  ...Array.from(markdown.matchAll(INDENTED_CODE), (match) => {
    const block = match[1] ?? "";
    const start = match.index + match[0].length - block.length;
    return { start, end: start + block.length };
  }),
];

export const findStamps = (markdown: string, videoId: string | null): ReadonlyArray<Stamp> => {
  const code = codeRanges(markdown);
  const out: Array<Stamp> = [];
  for (const match of markdown.matchAll(STAMP)) {
    const seconds = timestampSeconds(match[1] ?? "");
    if (seconds === null) continue;
    const start = match.index;
    if (code.some((range) => start >= range.start && start < range.end)) continue;
    if (start > 0 && (markdown[start - 1] === "[" || markdown[start - 1] === "!")) continue;
    const address = match[2];
    const end = start + match[0].length;
    if (address === undefined && (markdown[end] === "(" || markdown[end] === "[")) continue;
    if (address !== undefined && !linkAgrees(address, videoId, seconds)) continue;
    out.push({ start, end, seconds, label: timestampText(seconds) });
  }
  return out;
};

export interface PlainNotes {
  readonly text: string;
  readonly stamps: ReadonlyArray<Stamp>;
}

export const plainNotes = (markdown: string, videoId: string | null): PlainNotes => {
  let text = "";
  let at = 0;
  const stamps: Array<Stamp> = [];
  for (const stamp of findStamps(markdown, videoId)) {
    text += markdown.slice(at, stamp.start);
    const short = `[${stamp.label}]`;
    stamps.push({ ...stamp, start: text.length, end: text.length + short.length });
    text += short;
    at = stamp.end;
  }
  return { text: text + markdown.slice(at), stamps };
};

export const plainStamps = (markdown: string, videoId: string | null): string =>
  plainNotes(markdown, videoId).text;

export const LookupVideo = Schema.Struct({ url: Schema.Trim });

export const VideoFound = Schema.Struct({
  id: Schema.String,
  url: Schema.String,
  title: Schema.NullOr(Schema.String),
  channel: Schema.NullOr(Schema.String),
});
export type VideoFound = typeof VideoFound.Type;

export class VideoNotFound extends Schema.TaggedError<VideoNotFound>()("VideoNotFound", {
  reason: Schema.Literals(["not-youtube", "not-found", "unavailable"]),
}) {}
