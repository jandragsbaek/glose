export interface KeyInput {
  readonly type: string;
  readonly code: string;
  readonly isAutoRepeat: boolean;
}

export const isFullScreenKey = (input: KeyInput, platform: NodeJS.Platform) =>
  platform !== "darwin" && input.type === "keyDown" && !input.isAutoRepeat && input.code === "F11";
