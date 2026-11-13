import type { Language } from "@glose/contracts";
import { createContext, type ReactNode, use, useEffect } from "react";

import { da } from "./da.ts";
import { en, type Messages } from "./en.ts";

export const catalogs: Record<Language, Messages> = { en, da };

export const LANGUAGES: ReadonlyArray<Language> = ["en", "da"];

const MessagesContext = createContext<Messages>(en);
const LanguageContext = createContext<Language>("en");

/** Before the user picks a language: Danish for a Danish system, English otherwise. */
export const systemLanguage = (): Language =>
  navigator.languages.some((tag) => tag.toLowerCase().startsWith("da")) ? "da" : "en";

export function I18nProvider({
  language,
  children,
}: {
  readonly language: Language;
  readonly children: ReactNode;
}) {
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- keeps <html lang> in step with the interface language; screen readers and hyphenation read it there.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return (
    <LanguageContext value={language}>
      <MessagesContext value={catalogs[language]}>{children}</MessagesContext>
    </LanguageContext>
  );
}

/** The messages of the current interface language. */
export function useT(): Messages {
  return use(MessagesContext);
}

/** The interface language, for sorting and comparing words by its alphabet. */
export function useLanguage(): Language {
  return use(LanguageContext);
}
