export interface Palette {
  readonly ground: string;
  readonly paper: string;
  readonly ink: string;
  readonly mute: string;
  readonly lineStrong: string;
  readonly lapis: string;
  readonly gold: string;
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
    lapis: token("lapis"),
    gold: token("gold"),
  };
};
