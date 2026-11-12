import { type ReactNode, useId } from "react";

import { type AiScope, type Block, type Inline, parseNoteText } from "../graph/noteText.ts";
import { useT } from "../i18n/I18n.tsx";

export type WikilinkPart = Extract<Inline, { readonly kind: "link" }>;

/** A Note's text as the app shows it; the page decides where its wikilinks lead. */
export function NoteText({
  markdown,
  aiText,
  renderLink,
}: {
  readonly markdown: string;
  readonly aiText: boolean;
  readonly renderLink: (part: WikilinkPart) => ReactNode;
}) {
  const inline = (parts: ReadonlyArray<Inline>) =>
    parts.map((part) => (part.kind === "text" ? part.text : renderLink(part)));
  const render = (block: Block): ReactNode => {
    switch (block.kind) {
      case "paragraph":
        return <p key={block.at}>{inline(block.inlines)}</p>;
      case "list":
        return (
          <ul key={block.at}>
            {block.items.map((item) => (
              <li key={item.at}>{inline(item.inlines)}</li>
            ))}
          </ul>
        );
      case "heading": {
        // The Note's title is the panel's h3, so its own headings sit below it.
        const Tag = block.level === 1 ? "h4" : block.level === 2 ? "h5" : "h6";
        return (
          <Tag key={block.at} className="graph__heading">
            {inline(block.inlines)}
          </Tag>
        );
      }
      case "ai":
        return (
          <AiText key={block.at} scope={block.scope} count={block.blocks.length}>
            {block.heading === null ? null : render(block.heading)}
            {block.blocks.map(render)}
          </AiText>
        );
    }
  };
  return <div className="graph__text">{parseNoteText(markdown, aiText).map(render)}</div>;
}

/**
 * AI text wears its mark in the app too, at the edge: a rubric rule beside it and a gloss that
 * says how much the AI wrote. A ¶ opens the gloss on paragraphs, a § on a whole Part, Note or
 * Card.
 */
export function AiText({
  scope,
  count = 1,
  children,
}: {
  /** How much the AI wrote: some paragraphs, a Part, a title, or a whole Note or Card. */
  readonly scope: AiScope | "card" | "title";
  /** How many paragraphs and lists the AI wrote. */
  readonly count?: number;
  readonly children: ReactNode;
}) {
  const t = useT();
  const glossId = useId();
  return (
    <div className="ai-text" data-scope={scope} role="group" aria-labelledby={glossId}>
      <p className="ai-text__gloss" id={glossId}>
        {scope === "paragraphs" ? t.aiText.paragraphs(count) : t.aiText[scope]}
      </p>
      {children}
    </div>
  );
}

export function MissingLink({ name, label }: { readonly name: string; readonly label: string }) {
  const t = useT();
  return (
    <span className="graph__wikilink graph__wikilink--missing" title={t.graph.missingLink(name)}>
      {label}
    </span>
  );
}
