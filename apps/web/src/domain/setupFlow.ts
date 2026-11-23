export type SetupStep = "look" | "vault" | "sections" | "chatgpt" | "book";

export const SETUP_STEPS: ReadonlyArray<SetupStep> = [
  "look",
  "vault",
  "sections",
  "chatgpt",
  "book",
];

export const setupFlow = (vaultSources: number | null): ReadonlyArray<SetupStep> =>
  vaultSources !== null && vaultSources > 0 ? ["look", "vault", "chatgpt"] : SETUP_STEPS;
