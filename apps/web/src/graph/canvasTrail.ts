import type { Box } from "./canvasGeometry.ts";

export const drawTrailLine = (
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
  lineWidth: number,
  color: string,
): void => {
  if (points.length < 2) return;
  context.globalAlpha = 0.85;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
};

export interface StopTab {
  readonly box: Box;
  readonly number: number;
  readonly here: boolean;
}

export const drawStopTabs = (
  context: CanvasRenderingContext2D,
  tabs: ReadonlyArray<StopTab>,
  height: number,
  font: string,
  palette: { readonly paper: string; readonly lapis: string; readonly gold: string },
): void => {
  context.globalAlpha = 1;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.font = font;
  for (const { box, number, here } of tabs) {
    const width = box.right - box.left;
    context.fillStyle = palette.paper;
    context.strokeStyle = palette.lapis;
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(box.left, box.top, width, height - 1, 2);
    context.fill();
    context.stroke();
    context.fillStyle = palette.lapis;
    context.fillText(String(number), box.left + width / 2, box.top + 2.5);
    if (here) {
      context.fillStyle = palette.gold;
      context.fillRect(box.left - 0.5, box.top + height + 1, width + 1, 2);
    }
  }
};
