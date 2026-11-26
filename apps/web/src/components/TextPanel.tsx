import { useId } from "react";

import { useT } from "../i18n/I18n.tsx";
import {
  chooseWritingText,
  charactersOf,
  DEFAULT_TEXT,
  FACES,
  measureOf,
  SIZES,
  useWritingText,
  WIDTHS,
} from "../theme/writingText.ts";
import { isMac } from "./WritingDeskBar.tsx";
import { Panel } from "./ui.tsx";

export function TextPanel() {
  const t = useT();
  const id = useId();
  const text = useWritingText();
  const words = t.text;
  return (
    <Panel title={words.title} initial="accent" level={3}>
      <div className="panel__body text-settings">
        <p className="text-settings__lead">{words.lead}</p>
        <figure
          className="text-specimen writing-text"
          data-face={text.face}
          aria-label={words.sampleLabel}
          style={
            {
              "--prose-size": `${text.size}px`,
              "--prose-measure": `${measureOf(text)}px`,
            } as React.CSSProperties
          }
        >
          <div className="text-specimen__leaf">
            <p className="text-specimen__prose">
              {words.sample}
              <sup className="prose-editor__ref" aria-hidden="true">
                1
              </sup>{" "}
              {words.sampleLetters}
            </p>
            <p className="text-specimen__gloss">
              <span className="text-specimen__number" aria-hidden="true">
                1
              </span>
              <span className="text-specimen__note">{words.sampleNote}</span>
              <span className="text-specimen__call">{words.sampleCall}</span>
            </p>
          </div>
          <figcaption className="text-specimen__ruler">
            <span className="text-specimen__rule" aria-hidden="true" />
            {words.lineLength(words.widths[text.width], charactersOf(text))}
          </figcaption>
        </figure>
        <p className="field__hint">{words.scope}</p>

        <fieldset className="text-settings__group">
          <legend className="text-settings__legend">{words.face}</legend>
          <div className="text-faces">
            {FACES.map((face) => (
              <label key={face} className="text-face">
                <input
                  type="radio"
                  name={`${id}-face`}
                  checked={text.face === face}
                  onChange={() => chooseWritingText({ face })}
                />
                <span
                  className="text-face__sample writing-text"
                  data-face={face}
                  aria-hidden="true"
                >
                  {words.faceSample}
                </span>
                <span className="text-face__name">{words.faces[face]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="text-settings__row">
          <fieldset className="text-settings__group">
            <legend className="text-settings__legend">{words.size}</legend>
            <div className="segmented text-sizes">
              {SIZES.map((size) => (
                <label key={size}>
                  <input
                    type="radio"
                    name={`${id}-size`}
                    checked={text.size === size}
                    aria-label={words.sizeLabel(size)}
                    onChange={() => chooseWritingText({ size })}
                  />
                  <span>
                    <span
                      className="text-sizes__glyph writing-text"
                      data-face={text.face}
                      style={{ fontSize: size + 1 }}
                      aria-hidden="true"
                    >
                      {words.sizeGlyph}
                    </span>
                    <span className="text-sizes__number" aria-hidden="true">
                      {size}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="field__hint">{words.sizeHint(DEFAULT_TEXT.size)}</p>
          </fieldset>
          <fieldset className="text-settings__group">
            <legend className="text-settings__legend">{words.width}</legend>
            <div className="text-widths">
              {WIDTHS.map((width) => (
                <label key={width} className="text-width">
                  <input
                    type="radio"
                    name={`${id}-width`}
                    checked={text.width === width}
                    onChange={() => chooseWritingText({ width })}
                  />
                  <span className="text-width__page" data-width={width} aria-hidden="true" />
                  <span className="text-width__name">{words.widths[width]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="text-settings__overview">
          <input
            type="checkbox"
            checked={text.overview}
            onChange={(event) => chooseWritingText({ overview: event.target.checked })}
          />
          <span>
            <span className="text-settings__overview-name">{words.overview}</span>
            <span className="text-settings__overview-lead">{words.overviewLead}</span>
          </span>
        </label>

        <p className="text-settings__focus">
          <span>
            <strong>{t.writing.focus}</strong> {words.focusLead}
          </span>
          <span className="text-settings__focus-key">
            {words.focusWays} <kbd className="key">{isMac() ? "⇧⌘F" : "Ctrl+Shift+F"}</kbd>
          </span>
        </p>
      </div>
    </Panel>
  );
}
