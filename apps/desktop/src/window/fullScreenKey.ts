export interface KeyInput {
  readonly type: string;
  readonly code: string;
}

export const isFullScreenKey = (input: KeyInput, platform: NodeJS.Platform) =>
  platform !== "darwin" && input.type === "keyDown" && input.code === "F11";
