import { Check, Copy } from "lucide-react";
import { Suspense, use, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { type CodeLine, codeLanguage, highlightCode } from "./codeHighlight.ts";

export function CodeBlock({ lang, text }: { readonly lang: string; readonly text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const language = codeLanguage(lang)?.name ?? lang;
  return (
    <div className="code-block">
      <div className="code-block__tab">
        {language === "" ? null : <span className="code-block__lang">{language}</span>}
        <button
          type="button"
          className="code-block__copy"
          data-copied={copied || undefined}
          aria-label={copied ? t.code.copied : t.code.copy}
          title={copied ? t.code.copied : t.code.copy}
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? (
            <Check className="code-block__icon" aria-hidden="true" />
          ) : (
            <Copy className="code-block__icon" aria-hidden="true" />
          )}
        </button>
      </div>
      <pre className="code-block__pre" tabIndex={0} aria-label={t.code.label(language)}>
        <code>
          <Suspense fallback={text}>
            <Highlighted text={text} lang={lang} />
          </Suspense>
        </code>
      </pre>
    </div>
  );
}

function Highlighted({ text, lang }: { readonly text: string; readonly lang: string }) {
  const lines = use(highlighted(text, lang));
  if (lines === null) return text;
  return lines.map((line, row) => (
    <span key={line.at} className="code-block__line">
      {line.tokens.map((token) =>
        token.role === null ? (
          token.text
        ) : (
          <span key={token.at} className={`code-token code-token--${token.role}`}>
            {token.text}
          </span>
        ),
      )}
      {row < lines.length - 1 ? "\n" : null}
    </span>
  ));
}

const HELD = 200;
const held = new Map<string, Promise<ReadonlyArray<CodeLine> | null>>();

const highlighted = (text: string, lang: string) => {
  const key = `${lang}\u0000${text}`;
  const known = held.get(key);
  if (known !== undefined) return known;
  const next = highlightCode(text, lang).catch(() => null);
  held.set(key, next);
  if (held.size > HELD) held.delete(held.keys().next().value ?? key);
  return next;
};
