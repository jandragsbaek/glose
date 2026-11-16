import { type ReactNode, useId } from "react";

import { type AiScope, type Block, type Inline, parseNoteText } from "../graph/noteText.ts";
import { useT } from "../i18n/I18n.tsx";

export type WikilinkPart = Extract<Inline, { readonly kind: "link" }>;

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

export function AiText({
  scope,
  count = 1,
  marked = true,
  note,
  action,
  children,
}: {
  readonly scope: AiScope | "card" | "title";
  readonly count?: number;
  readonly marked?: boolean;
  readonly note?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useT();
  const glossId = useId();
  const gloss = (
    <p className="ai-text__gloss" id={glossId}>
      {scope === "paragraphs" ? t.aiText.paragraphs(count) : t.aiText[scope]}
      {note === undefined ? null : ` · ${note}`}
    </p>
  );
  return (
    <div
      className={marked ? "ai-text" : undefined}
      data-scope={marked ? scope : undefined}
      role={marked ? "group" : undefined}
      aria-labelledby={marked ? glossId : undefined}
    >
      {marked ? (
        action === undefined ? (
          gloss
        ) : (
          <div className="ai-text__head">
            {gloss}
            {action}
          </div>
        )
      ) : null}
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
