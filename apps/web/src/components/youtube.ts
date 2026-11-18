import { useEffect, useRef, useState } from "react";

const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";
const READY_TIMEOUT = 15_000;
const LISTEN_EVERY = 250;
const PLAYING = 1;
const BUFFERING = 3;
const NOT_EMBEDDABLE = new Set([101, 150]);

export type PlayerState = "loading" | "ready" | "offline" | "blocked" | "failed";

export interface Player {
  readonly frame: (node: HTMLIFrameElement | null) => void;
  readonly src: string | null;
  readonly state: PlayerState;
  readonly time: number;
  readonly now: () => number | null;
  readonly play: (seconds: number) => void;
  readonly toggle: () => void;
}

export const embedAddress = (
  videoId: string,
  start: number,
  language: string,
  origin: string,
): string => {
  const params = new URLSearchParams({
    enablejsapi: "1",
    origin,
    start: String(Math.max(0, Math.floor(start))),
    rel: "0",
    playsinline: "1",
    hl: language,
  });
  return `${PLAYER_ORIGIN}/embed/${videoId}?${params.toString()}`;
};

interface Clock {
  readonly time: number;
  readonly at: number;
  readonly playing: boolean;
}

const numberOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function useYouTubePlayer(videoId: string | null, start: number, language: string): Player {
  const [node, setNode] = useState<HTMLIFrameElement | null>(null);
  const [state, setState] = useState<PlayerState>("loading");
  const [time, setTime] = useState(start);
  const clock = useRef<Clock>({ time: start, at: 0, playing: false });
  const ready = useRef(false);
  const going = useRef(false);
  const pending = useRef<number | null>(null);
  const [shown, setShown] = useState({ language, start });
  if (shown.language !== language) {
    setShown({ language, start: time });
    setState("loading");
  }
  const src =
    videoId === null
      ? null
      : embedAddress(videoId, shown.start, shown.language, window.location.origin);

  const send = (func: string, args: ReadonlyArray<unknown> = []) =>
    node?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args, id: 1, channel: "widget" }),
      PLAYER_ORIGIN,
    );

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the player is another page: Glose hears it through window messages and asks it to talk until it answers.
  useEffect(() => {
    if (node === null || src === null) return;
    ready.current = false;
    const post = (message: Record<string, unknown>) =>
      node.contentWindow?.postMessage(
        JSON.stringify({ ...message, id: 1, channel: "widget" }),
        PLAYER_ORIGIN,
      );
    const listen = window.setInterval(() => post({ event: "listening" }), LISTEN_EVERY);
    const giveUp = window.setTimeout(() => {
      if (!ready.current) setState("offline");
    }, READY_TIMEOUT);
    const hear = (info: Record<string, unknown>) => {
      const playerState = info["playerState"];
      const now = numberOr(info["currentTime"], clock.current.time);
      const moving =
        typeof playerState === "number" ? playerState === PLAYING : clock.current.playing;
      clock.current = { time: now, at: performance.now(), playing: moving };
      setTime(now);
      if (typeof playerState === "number") {
        going.current = playerState === PLAYING || playerState === BUFFERING;
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== PLAYER_ORIGIN || event.source !== node.contentWindow) return;
      let message: unknown;
      try {
        message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (typeof message !== "object" || message === null) return;
      const { event: name, info } = message as { event?: unknown; info?: unknown };
      if ((name === "initialDelivery" || name === "onReady") && !ready.current) {
        ready.current = true;
        window.clearInterval(listen);
        for (const listened of ["onReady", "onStateChange", "onError"]) {
          post({ event: "command", func: "addEventListener", args: [listened] });
        }
        const asked = pending.current;
        pending.current = null;
        if (asked !== null) {
          post({ event: "command", func: "seekTo", args: [asked, true] });
          post({ event: "command", func: "playVideo", args: [] });
        }
        setState("ready");
      }
      if (name === "onError") {
        clock.current = { ...clock.current, playing: false };
        going.current = false;
        setState(NOT_EMBEDDABLE.has(numberOr(info, 0)) ? "blocked" : "failed");
        return;
      }
      if (name === "onStateChange" && typeof info === "number") {
        hear({ playerState: info });
        return;
      }
      if (typeof info === "object" && info !== null) hear(info as Record<string, unknown>);
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(listen);
      window.clearTimeout(giveUp);
    };
  }, [node, src]);

  const now = () => {
    if (!ready.current) return null;
    const { time: at, at: heard, playing: moving } = clock.current;
    return moving ? at + (performance.now() - heard) / 1000 : at;
  };

  return {
    frame: setNode,
    src,
    state,
    time,
    now,
    play: (seconds) => {
      if (!ready.current) {
        pending.current = seconds;
        return;
      }
      send("seekTo", [seconds, true]);
      send("playVideo");
      clock.current = { time: seconds, at: performance.now(), playing: true };
      going.current = true;
      setTime(seconds);
    },
    toggle: () => {
      if (!ready.current) return;
      send(going.current ? "pauseVideo" : "playVideo");
    },
  };
}
