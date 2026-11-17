import {
  type Article,
  type ArticleBlock,
  type ArticleUnit,
  GLOSE_NOTE,
  type Inline,
} from "@glose/contracts";
import { ImageOff } from "lucide-react";
import { type KeyboardEvent, type ReactNode, memo } from "react";

import { useT } from "../i18n/I18n.tsx";

export type PassageTone = "marked" | "words" | "deeper" | "point";

export interface PassageLook {
  readonly tone: PassageTone;
  readonly current: boolean;
}

interface TextProps {
  readonly article: Article;
  readonly looks: ReadonlyMap<string, PassageLook>;
  readonly onPassage: (id: string) => void;
  readonly skipTitle: string;
}

const isRemote = (src: string) => /^(https?:)?\/\//i.test(src) || src.startsWith("data:image/");

function Inlines({
  inlines,
  unit,
  looks,
  onPassage,
}: {
  readonly inlines: ReadonlyArray<Inline>;
  readonly unit: ArticleUnit | null;
  readonly looks: ReadonlyMap<string, PassageLook>;
  readonly onPassage: (id: string) => void;
}) {
  const t = useT();
  return (
    <>
      {inlines.map((inline, index) => {
        const key = `${inline.from}-${index}`;
        switch (inline.kind) {
          case "text":
            return inline.text;
          case "code":
            return (
              <code key={key} className="article__code">
                {inline.text}
              </code>
            );
          case "strong":
            return (
              <strong key={key}>
                <Inlines
                  inlines={inline.children}
                  unit={null}
                  looks={looks}
                  onPassage={onPassage}
                />
              </strong>
            );
          case "em":
            return (
              <em key={key}>
                <Inlines
                  inlines={inline.children}
                  unit={null}
                  looks={looks}
                  onPassage={onPassage}
                />
              </em>
            );
          case "link":
            return (
              <a key={key} href={inline.href} target="_blank" rel="noreferrer noopener">
                <Inlines
                  inlines={inline.children}
                  unit={null}
                  looks={looks}
                  onPassage={onPassage}
                />
              </a>
            );
          case "image":
            return isRemote(inline.src) ? (
              <img key={key} className="article__inline-image" src={inline.src} alt={inline.alt} />
            ) : null;
          case "note":
            return inline.label.startsWith(GLOSE_NOTE) ? null : (
              <sup key={key} className="article__noteref" data-label={inline.label} />
            );
          case "highlight": {
            if (unit === null) {
              return (
                <mark key={key} className="article__mark">
                  <Inlines
                    inlines={inline.children}
                    unit={null}
                    looks={looks}
                    onPassage={onPassage}
                  />
                </mark>
              );
            }
            const before = inlines
              .slice(0, index)
              .filter((other) => other.kind === "highlight").length;
            const id = `${unit.n}.${before + 1}`;
            const look = looks.get(id);
            const open = () => onPassage(id);
            const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                open();
              }
            };
            return (
              <mark
                key={key}
                className="passage"
                data-passage={id}
                data-tone={look?.tone ?? "marked"}
                data-current={look?.current === true ? "" : undefined}
                role="button"
                tabIndex={0}
                aria-pressed={look?.current === true}
                aria-description={t.kinds.passageLabel}
                onClick={open}
                onKeyDown={onKeyDown}
              >
                <Inlines
                  inlines={inline.children}
                  unit={null}
                  looks={looks}
                  onPassage={onPassage}
                />
              </mark>
            );
          }
        }
      })}
    </>
  );
}

function Unit({
  unit,
  as: Tag,
  looks,
  onPassage,
  className,
}: {
  readonly unit: ArticleUnit;
  readonly as: "p" | "div";
  readonly looks: ReadonlyMap<string, PassageLook>;
  readonly onPassage: (id: string) => void;
  readonly className?: string;
}) {
  const t = useT();
  const marked = unit.inlines.some((inline) => inline.kind === "highlight");
  return (
    <Tag
      className={className === undefined ? "unit" : `unit ${className}`}
      data-n={unit.n}
      data-label={t.reader.paragraph(unit.n)}
      data-marked={marked ? "" : undefined}
      id={`p-${unit.n}`}
    >
      <span className="sr-only">{t.reader.paragraphLabel(unit.n)}. </span>
      <span className="unit__text" data-unit-text={unit.n}>
        <Inlines inlines={unit.inlines} unit={unit} looks={looks} onPassage={onPassage} />
      </span>
    </Tag>
  );
}

function Block({
  block,
  looks,
  onPassage,
}: {
  readonly block: ArticleBlock;
  readonly looks: ReadonlyMap<string, PassageLook>;
  readonly onPassage: (id: string) => void;
}): ReactNode {
  const t = useT();
  switch (block.kind) {
    case "heading": {
      const level = Math.min(Math.max(block.level, 2), 4) as 2 | 3 | 4;
      const Heading = `h${level}` as const;
      return (
        <Heading
          className="article__heading"
          id={`s-${block.section}`}
          data-section={block.section}
        >
          <Inlines inlines={block.inlines} unit={null} looks={looks} onPassage={onPassage} />
        </Heading>
      );
    }
    case "paragraph":
      return <Unit unit={block.unit} as="p" looks={looks} onPassage={onPassage} />;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className={block.ordered ? "article__list article__list--ordered" : "article__list"}>
          {block.items.map((item) => (
            <li key={item.unit.n} className="article__item" data-depth={item.depth}>
              <Unit unit={item.unit} as="div" looks={looks} onPassage={onPassage} />
            </li>
          ))}
        </List>
      );
    }
    case "quote":
      return (
        <blockquote className="article__quote">
          {block.units.map((unit) => (
            <Unit key={unit.n} unit={unit} as="p" looks={looks} onPassage={onPassage} />
          ))}
        </blockquote>
      );
    case "code":
      return (
        <pre className="article__pre" data-lang={block.lang === "" ? undefined : block.lang}>
          <code>{block.text}</code>
        </pre>
      );
    case "table":
      return (
        <div className="article__table-wrap">
          <table className="article__table">
            <thead>
              <tr>
                {block.head.map((cell, index) => (
                  // oxlint-disable-next-line react/no-array-index-key -- a parsed table has no ids; it is parsed again whole when the text changes.
                  <th key={index}>
                    <Inlines inlines={cell} unit={null} looks={looks} onPassage={onPassage} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                // oxlint-disable-next-line react/no-array-index-key -- a parsed table has no ids; it is parsed again whole when the text changes.
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    // oxlint-disable-next-line react/no-array-index-key -- a parsed table has no ids; it is parsed again whole when the text changes.
                    <td key={index}>
                      <Inlines inlines={cell} unit={null} looks={looks} onPassage={onPassage} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "image":
      return isRemote(block.src) ? (
        <figure className="article__figure">
          <img src={block.src} alt={block.alt} loading="lazy" />
          {block.alt === "" ? null : <figcaption>{block.alt}</figcaption>}
        </figure>
      ) : (
        <p className="article__missing">
          <ImageOff className="article__missing-icon" aria-hidden="true" />
          {t.reader.imageMissing(block.alt)}
        </p>
      );
    case "rule":
      return <hr className="article__rule" />;
  }
}

export const ArticleText = memo(function ArticleText({
  article,
  looks,
  onPassage,
  skipTitle,
}: TextProps) {
  const t = useT();
  const firstHeading = article.blocks.findIndex((block) => block.kind === "heading");
  const skip =
    firstHeading !== -1 &&
    article.blocks
      .slice(0, firstHeading)
      .every((block) => block.kind === "rule" || block.kind === "image") &&
    article.blocks[firstHeading]?.kind === "heading" &&
    (article.blocks[firstHeading] as Extract<ArticleBlock, { kind: "heading" }>).text
      .trim()
      .toLowerCase() === skipTitle.trim().toLowerCase()
      ? firstHeading
      : -1;
  const notes = [...article.footnotes].filter(([label]) => !label.startsWith(GLOSE_NOTE));
  return (
    <div className="article">
      {article.blocks.map((block, index) =>
        index === skip ? null : (
          // oxlint-disable-next-line react/no-array-index-key -- blocks have no ids; the text is parsed again whole when it changes.
          <Block key={index} block={block} looks={looks} onPassage={onPassage} />
        ),
      )}
      {notes.length === 0 ? null : (
        <section className="article__notes" aria-label={t.reader.notes}>
          <h2 className="article__notes-title">{t.reader.notes}</h2>
          <ol>
            {notes.map(([label, text]) => (
              <li key={label} data-label={label}>
                {text}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
});
