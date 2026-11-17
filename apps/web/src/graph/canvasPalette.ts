export interface Palette {
  readonly ground: string;
  readonly paper: string;
  readonly ink: string;
  readonly mute: string;
  readonly lineStrong: string;
  readonly accent: string;
  readonly gold: string;
  readonly rubric: string;
  readonly rubricWash: string;
}

export const readPalette = (): Palette => {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--${name}`).trim();
  return {
    ground: token("ground"),
    paper: token("paper"),
    ink: token("ink"),
    mute: token("mute"),
    lineStrong: token("line-strong"),
    accent: token("accent"),
    gold: token("gold"),
    rubric: token("rubric"),
    rubricWash: token("rubric-wash"),
  };
};
