import type { Palette } from "./canvasPalette.ts";
import type { LayoutNode } from "./layout.ts";

export interface DraftMark {
  readonly id: string;
  readonly targets: ReadonlyArray<string>;
  readonly linked: ReadonlySet<string>;
}

const towards = (from: LayoutNode, to: LayoutNode, gap: number): [number, number] => {
  const dx = (to.x ?? 0) - (from.x ?? 0);
  const dy = (to.y ?? 0) - (from.y ?? 0);
  const length = Math.hypot(dx, dy) || 1;
  return [(from.x ?? 0) + (dx / length) * gap, (from.y ?? 0) + (dy / length) * gap];
};

export const drawDraft = (
  context: CanvasRenderingContext2D,
  byId: ReadonlyMap<string, LayoutNode>,
  draft: DraftMark | null,
  zoom: number,
  palette: Palette,
): void => {
  const node = draft === null ? undefined : byId.get(draft.id);
  if (draft === null || node === undefined) return;
  context.save();
  context.globalAlpha = 1;
  context.setLineDash([5 / zoom, 4 / zoom]);
  for (const id of draft.targets) {
    const target = byId.get(id);
    if (target === undefined) continue;
    const on = draft.linked.has(id);
    const [x1, y1] = towards(node, target, node.radius + 2 / zoom);
    const [x2, y2] = towards(target, node, target.radius + 2 / zoom);
    context.strokeStyle = on ? palette.accent : palette.lineStrong;
    context.lineWidth = (on ? 1.6 : 1.2) / zoom;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }
  const ring = Math.min(1.75 / zoom, node.radius * 0.6);
  context.setLineDash([3 / zoom, 2.5 / zoom]);
  context.beginPath();
  context.fillStyle = palette.paper;
  context.strokeStyle = palette.accent;
  context.lineWidth = ring;
  context.arc(node.x ?? 0, node.y ?? 0, node.radius - ring / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
};
