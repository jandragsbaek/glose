import { zoomIdentity, type ZoomTransform } from "d3-zoom";

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

export const labelCenter = (
  sx: number,
  width: number,
  top: number,
  bottom: number,
  keepClear: ReadonlyArray<Box>,
  canvasWidth: number,
): number => {
  let cx = sx;
  for (const clear of keepClear) {
    const box = { left: cx - width / 2 - 2, right: cx + width / 2 + 2, top, bottom };
    if (!overlaps(clear, box)) continue;
    cx = clear.left < canvasWidth / 2 ? clear.right + width / 2 + 6 : clear.left - width / 2 - 6;
  }
  return Math.min(canvasWidth - width / 2 - 4, Math.max(width / 2 + 4, cx));
};

export const stopBox = (cx: number, nodeTop: number, width: number, height: number): Box => {
  const left = Math.round(cx - width / 2) + 0.5;
  const top = Math.round(nodeTop - 12 - height) + 0.5;
  return { left, top, right: left + Math.round(width), bottom: top + height + 3 };
};

export const wrapWords = (
  text: string,
  width: number,
  measure: (line: string) => number,
): ReadonlyArray<string> => {
  const lines: Array<string> = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line === "" ? word : `${line} ${word}`;
    if (line !== "" && measure(next) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
};

interface Framing {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly maxScale: number;
  readonly minScale: number;
}

export const frameTarget = (
  nodes: ReadonlyArray<{
    readonly x?: number | undefined;
    readonly y?: number | undefined;
    readonly radius: number;
  }>,
  width: number,
  height: number,
  framing: Framing,
): ZoomTransform => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, (node.x ?? 0) - node.radius);
    minY = Math.min(minY, (node.y ?? 0) - node.radius);
    maxX = Math.max(maxX, (node.x ?? 0) + node.radius);
    maxY = Math.max(maxY, (node.y ?? 0) + node.radius);
  }
  const room = height - framing.top - framing.bottom;
  const k = Math.min(
    framing.maxScale,
    Math.max(
      framing.minScale,
      Math.min(
        (width - framing.left - framing.right) / Math.max(1, maxX - minX),
        room / Math.max(1, maxY - minY),
      ),
    ),
  );
  return zoomIdentity
    .translate(
      framing.left + (width - framing.left - framing.right) / 2 - ((minX + maxX) / 2) * k,
      framing.top + room / 2 - ((minY + maxY) / 2) * k,
    )
    .scale(k);
};
