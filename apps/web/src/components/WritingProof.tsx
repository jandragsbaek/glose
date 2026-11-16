import {
  bibliographyEntry,
  citedSources,
  type CitationStyle,
  noteCitation,
  type ResolvedReference,
  shortCitation,
  sourcesHeading,
  type WritingProjectFields,
} from "@glose/contracts";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import {
  citationParts,
  type ProofBlock,
  type ProofInline,
  proofBlocks,
} from "../domain/writing.ts";
import { useT } from "../i18n/I18n.tsx";

export function Citation({ text }: { readonly text: string }) {
  return (
    <>
      {citationParts(text).map((part) =>
        part.italic ? (
          <i key={`i:${part.text}`}>{part.text}</i>
        ) : (
          <span key={`t:${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function Proof({
  fields,
  references,
  date,
}: {
  readonly fields: WritingProjectFields;
  readonly references: ReadonlyArray<ResolvedReference>;
  readonly date: Date;
}) {
  const t = useT();
  const blocks = proofBlocks(fields.body, references);
  const inline = fields.type === "assignment" || fields.referenceForm === "links";
  const style: CitationStyle = fields.type === "assignment" ? fields.citationStyle : "chicago";
  const heading =
    fields.type === "assignment" ? t.writing.bibliography : sourcesHeading(fields.language);
  const citation = (reference: ResolvedReference) =>
    reference.source === null ? reference.target : noteCitation(reference.source, reference.page);

  const renderInline = (part: ProofInline): ReactNode => {
    switch (part.kind) {
      case "text":
        return <span key={part.at}>{part.text}</span>;
      case "em":
        return <em key={part.at}>{part.text}</em>;
      case "strong":
        return <strong key={part.at}>{part.text}</strong>;
      case "reference": {
        const { reference } = part;
        const flagged = reference.problems.length > 0;
        if (inline) {
          return (
            <span
              key={part.at}
              className={flagged ? "proof__cite proof__cite--flagged" : "proof__cite"}
            >
              {" ("}
              {reference.source === null
                ? reference.target
                : shortCitation(reference.source, reference.page, style)}
              {")"}
            </span>
          );
        }
        return (
          <sup key={part.at} className={flagged ? "proof__ref proof__ref--flagged" : "proof__ref"}>
            {reference.number}
          </sup>
        );
      }
    }
  };

  const renderBlock = (block: ProofBlock): ReactNode => {
    const sideNotes =
      !inline && fields.referenceForm === "side-notes" && block.references.length > 0 ? (
        <aside className="proof__side-notes">
          {block.references.map((reference) => (
            <p key={reference.start}>
              <sup>{reference.number}</sup> <Citation text={citation(reference)} />
            </p>
          ))}
        </aside>
      ) : null;
    switch (block.kind) {
      case "heading": {
        const Tag = block.level <= 2 ? "h2" : "h3";
        return <Tag key={block.at}>{block.inlines.map(renderInline)}</Tag>;
      }
      case "quote":
        return (
          <div key={block.at}>
            <blockquote>{block.inlines.map(renderInline)}</blockquote>
            {sideNotes}
          </div>
        );
      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <div key={block.at}>
            <Tag>
              {block.items.map((item) => (
                <li key={item[0]?.at ?? block.at}>{item.map(renderInline)}</li>
              ))}
            </Tag>
            {sideNotes}
          </div>
        );
      }
      case "paragraph":
        return (
          <div key={block.at}>
            <p>{block.inlines.map(renderInline)}</p>
            {sideNotes}
          </div>
        );
    }
  };

  return (
    <div className="proof" lang={fields.language}>
      <h1 className="proof__title">{fields.title}</h1>
      <p className="leaf__meta">{t.writing.proofMeta(date)}</p>
      <div className="proof__body">{blocks.map(renderBlock)}</div>
      {references.length === 0 ? null : inline ? (
        <section className="proof__sources">
          <h2>{heading}</h2>
          <ul>
            {citedSources(references).map((source) => (
              <li key={source.id}>
                <Citation text={bibliographyEntry(source, style)} />
              </li>
            ))}
          </ul>
        </section>
      ) : fields.referenceForm === "footnotes" ? (
        <ol className="proof__notes">
          {references.map((reference) => (
            <li
              key={reference.start}
              className={reference.problems.length > 0 ? "proof__note--flagged" : undefined}
            >
              <Citation text={citation(reference)} />
              {reference.problems.length > 0 ? (
                <span className="proof__problem">
                  <TriangleAlert className="call__icon" aria-hidden="true" />
                  {t.writing.problems[reference.problems[0] ?? "no-location"]}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
