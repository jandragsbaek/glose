import type { LayoutNode } from "./layout.ts";
import type { Palette } from "./canvasPalette.ts";

export interface NodeLook {
  readonly lit: boolean;
  readonly holdsAiText: boolean;
  readonly zoom: number;
}

const RING = { resting: 1.75, lit: 2.5 } as const;

export const drawNode = (
  context: CanvasRenderingContext2D,
  node: LayoutNode,
  look: NodeLook,
  palette: Palette,
): void => {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  context.beginPath();
  if (!look.holdsAiText) {
    context.fillStyle = look.lit ? palette.accent : palette.mute;
    context.arc(x, y, node.radius, 0, Math.PI * 2);
    context.fill();
    return;
  }
  const ring = Math.min((look.lit ? RING.lit : RING.resting) / look.zoom, node.radius * 0.6);
  context.fillStyle = palette.rubricWash;
  context.strokeStyle = palette.rubric;
  context.lineWidth = ring;
  context.arc(x, y, node.radius - ring / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
};

export const drawCallLabel = (
  context: CanvasRenderingContext2D,
  call: string,
  at: { readonly cx: number; readonly top: number; readonly height: number; readonly font: string },
  palette: Palette,
): void => {
  context.font = at.font;
  const width = context.measureText(call).width + 12;
  const left = Math.round(at.cx - width / 2) + 0.5;
  context.fillStyle = palette.paper;
  context.strokeStyle = palette.ink;
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(left, Math.round(at.top) + 0.5, Math.round(width), at.height - 1, 2);
  context.fill();
  context.stroke();
  context.fillStyle = palette.ink;
  context.fillText(call, at.cx, Math.round(at.top) + 3);
};
