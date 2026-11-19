import { useAtomSet } from "@effect/atom-react";
import { type AddVideo as AddVideoPayload, type VideoFound, youtubeId } from "@glose/contracts";
import { Link, useNavigate } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert } from "lucide-react";
import { type FormEvent, type RefObject, useId, useRef, useState } from "react";

import type { Messages } from "../i18n/en.ts";
import { useT } from "../i18n/I18n.tsx";
import { addVideoAtom, KEYS, lookupVideoAtom } from "../state/vault.ts";
import {
  blank,
  FillLine,
  focusAfterRender,
  focusFirstProblem,
  FormFoot,
  TextField,
  YEAR,
} from "./textImport.tsx";
import { Panel } from "./ui.tsx";

type VideoField = "familyName" | "givenName" | "title" | "year" | "channel";
type VideoValues = Record<VideoField, string>;

const EMPTY: VideoValues = { familyName: "", givenName: "", title: "", year: "", channel: "" };
const REQUIRED: ReadonlyArray<VideoField> = ["familyName", "title", "year"];

type Say = (t: Messages) => string;

type Lookup =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Asking" }
  | { readonly _tag: "Found"; readonly found: VideoFound }
  | { readonly _tag: "Problem"; readonly say: Say };

const fillFrom = (
  values: VideoValues,
  filled: ReadonlyArray<VideoField>,
  found: VideoFound,
): { readonly values: VideoValues; readonly filled: ReadonlyArray<VideoField> } => {
  const given: Partial<VideoValues> = {
    ...(found.title === null ? {} : { title: found.title }),
    ...(found.channel === null ? {} : { channel: found.channel }),
  };
  const next = { ...values };
  const marked: Array<VideoField> = [];
  for (const name of ["title", "channel"] as const) {
    const value = given[name];
    const free = values[name].trim() === "" || filled.includes(name);
    if (value !== undefined && free) {
      next[name] = value;
      marked.push(name);
    } else if (free && filled.includes(name)) {
      next[name] = "";
    }
  }
  return { values: next, filled: marked };
};

export function AddVideo({ onSaving }: { readonly onSaving: (saving: boolean) => void }) {
  const t = useT();
  const navigate = useNavigate();
  const lookupVideo = useAtomSet(lookupVideoAtom, { mode: "promiseExit" });
  const addVideo = useAtomSet(addVideoAtom, { mode: "promiseExit" });
  const addressId = useId();
  const hintId = `${addressId}-hint`;
  const errorId = `${addressId}-error`;
  const addressRef = useRef<HTMLInputElement>(null);
  const familyRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const latest = useRef(0);
  const [address, setAddress] = useState("");
  const [addressProblem, setAddressProblem] = useState<Say | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ _tag: "Idle" });
  const [values, setValues] = useState<VideoValues>(EMPTY);
  const [filled, setFilled] = useState<ReadonlyArray<VideoField>>([]);
  const valuesRef = useRef(values);
  const filledRef = useRef(filled);
  const lookedUp = useRef<string | null>(null);
  const putValues = (next: VideoValues) => {
    valuesRef.current = next;
    setValues(next);
  };
  const putFilled = (next: ReadonlyArray<VideoField>) => {
    filledRef.current = next;
    setFilled(next);
  };

  const forgetLookup = () => {
    latest.current += 1;
    lookedUp.current = null;
    setLookup({ _tag: "Idle" });
    const fromYouTube = filledRef.current;
    if (fromYouTube.length === 0) return;
    putValues({
      ...valuesRef.current,
      ...Object.fromEntries(fromYouTube.map((name) => [name, ""])),
    });
    putFilled([]);
  };
  const [errors, setErrors] = useState<Partial<Record<VideoField, Say>>>({});
  const [failure, setFailure] = useState<Say | null>(null);
  const [busy, setBusy] = useState(false);

  const look = async () => {
    const url = address.trim();
    if (url === "") {
      setAddressProblem(() => (t: Messages) => t.addVideo.needAddress);
      focusAfterRender(addressRef);
      return;
    }
    if (youtubeId(url) === null) {
      setAddressProblem(() => (t: Messages) => t.addVideo.notYouTube);
      focusAfterRender(addressRef);
      return;
    }
    const request = ++latest.current;
    lookedUp.current = youtubeId(url);
    setAddressProblem(null);
    setLookup({ _tag: "Asking" });
    const exit = await lookupVideo({ payload: { url } });
    if (request !== latest.current) return;
    if (Exit.isSuccess(exit)) {
      if (exit.value.id !== lookedUp.current) return;
      const next = fillFrom(valuesRef.current, filledRef.current, exit.value);
      putValues(next.values);
      putFilled(next.filled);
      setErrors((before) =>
        Object.fromEntries(
          Object.entries(before).filter(([name]) => !next.filled.includes(name as VideoField)),
        ),
      );
      setLookup({ _tag: "Found", found: exit.value });
      focusAfterRender(familyRef);
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    const reason = Option.isSome(error) ? error.value.reason : "unavailable";
    if (reason === "not-youtube") {
      setLookup({ _tag: "Idle" });
      setAddressProblem(() => (t: Messages) => t.addVideo.notYouTube);
      focusAfterRender(addressRef);
      return;
    }
    setLookup({
      _tag: "Problem",
      say: reason === "not-found" ? (t) => t.addVideo.notFound : (t) => t.addVideo.unavailable,
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: Partial<Record<VideoField, Say>> = {};
    for (const name of REQUIRED) {
      if (blank(values[name]) === null) found[name] = (t) => t.importText.needField;
    }
    const year = blank(values.year);
    if (year !== null && !YEAR.test(year)) found.year = (t) => t.addSource.yearInvalid;
    const url = address.trim();
    const badAddress =
      url === ""
        ? (t: Messages) => t.addVideo.needAddress
        : youtubeId(url) === null
          ? (t: Messages) => t.addVideo.notYouTube
          : null;
    setErrors(found);
    setAddressProblem(() => badAddress);
    if (Object.keys(found).length > 0 || badAddress !== null) {
      setFailure(() => (t: Messages) => t.addSource.checkFields);
      focusFirstProblem(formRef.current?.closest(".panel") ?? null);
      return;
    }
    const payload: AddVideoPayload = {
      familyName: blank(values.familyName) ?? "",
      givenName: blank(values.givenName),
      title: blank(values.title) ?? "",
      firstPublished: year === null ? null : Number(year),
      container: blank(values.channel),
      url,
    };
    setFailure(null);
    setBusy(true);
    onSaving(true);
    const exit = await addVideo({ payload, reactivityKeys: KEYS.sources });
    setBusy(false);
    onSaving(false);
    if (Exit.isSuccess(exit)) {
      await navigate({ to: "/sources/$sourceId", params: { sourceId: exit.value.id } });
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    if (Option.isSome(error) && error.value._tag === "SourceNameTaken") {
      const fileName = error.value.fileName;
      setFailure(() => (t: Messages) => t.addSource.nameTaken(fileName));
    } else if (Option.isSome(error) && error.value._tag === "VideoNotFound") {
      setAddressProblem(() => (t: Messages) => t.addVideo.notYouTube);
      setFailure(() => (t: Messages) => t.addSource.checkFields);
    } else {
      setFailure(() => (t: Messages) => `${t.errors.storage} ${t.errors.storageRecovery}`);
    }
  };

  const field = (
    name: VideoField,
    label: string,
    options: {
      readonly required?: boolean;
      readonly hint?: string;
      readonly wide?: boolean;
      readonly inputRef?: RefObject<HTMLInputElement | null>;
    } = {},
  ) => (
    <TextField
      name={name}
      label={label}
      required={options.required ?? false}
      hint={options.hint}
      wide={options.wide ?? false}
      inputMode={name === "year" ? "numeric" : undefined}
      error={errors[name]?.(t)}
      value={values[name]}
      filledFrom={filled.includes(name) ? t.addVideo.fromYouTube : undefined}
      onChange={(value) => {
        putValues({ ...valuesRef.current, [name]: value });
        setErrors(({ [name]: _, ...rest }) => rest);
        putFilled(filledRef.current.filter((other) => other !== name));
      }}
      inputRef={options.inputRef}
    />
  );

  const found = lookup._tag === "Found";
  const noDetails = found && lookup.found.title === null && lookup.found.channel === null;

  return (
    <Panel title={t.addVideo.panel} initial="rubric">
      <div className="panel__body">
        <form
          className="field"
          onSubmit={(event) => {
            event.preventDefault();
            void look();
          }}
          noValidate
        >
          <label className="field__label" htmlFor={addressId}>
            {t.addVideo.address}
            <span className="field__need"> {t.common.required}</span>
          </label>
          <div className="find-book__row">
            <input
              id={addressId}
              ref={addressRef}
              name="address"
              type="url"
              inputMode="url"
              className="input"
              autoComplete="off"
              spellCheck={false}
              value={address}
              aria-invalid={addressProblem === null ? undefined : true}
              aria-describedby={addressProblem === null ? hintId : `${hintId} ${errorId}`}
              onChange={(event) => {
                const next = event.target.value;
                setAddress(next);
                setAddressProblem(null);
                if (lookup._tag !== "Idle" && youtubeId(next) !== lookedUp.current) {
                  forgetLookup();
                }
              }}
            />
            <button
              type="submit"
              className={found ? "button" : "button button--primary"}
              disabled={lookup._tag === "Asking"}
            >
              {t.addVideo.lookUp}
            </button>
          </div>
          <p className="field__hint" id={hintId}>
            {t.addVideo.addressHint}
          </p>
          {addressProblem === null ? null : (
            <p className="field__error" id={errorId}>
              <CircleAlert className="field__error-icon" aria-hidden="true" />
              {addressProblem(t)}
            </p>
          )}
        </form>
        <div aria-live="polite" className="find-book__answer">
          {lookup._tag === "Asking" ? <p className="status">{t.addVideo.lookingUp}</p> : null}
          {lookup._tag === "Problem" ? <p className="status">{lookup.say(t)}</p> : null}
        </div>
      </div>
      <form ref={formRef} className="add-source__form" onSubmit={submit} noValidate>
        <div className="panel__body add-source__fields">
          <div role="status" className="fill-status">
            {found ? (
              <FillLine marked={filled.length > 0}>
                {noDetails ? t.addVideo.noDetails : t.addVideo.filled}
              </FillLine>
            ) : null}
          </div>
          <fieldset className="fieldset">
            <legend className="sr-only">{t.addVideo.speaker}</legend>
            {field("familyName", t.addSource.familyName, {
              required: true,
              hint: t.addVideo.speakerHint,
              inputRef: familyRef,
            })}
            {field("givenName", t.addSource.givenName)}
          </fieldset>
          <fieldset className="fieldset">
            <legend className="sr-only">{t.addVideo.video}</legend>
            {field("title", t.addSource.titleField, { required: true, wide: true })}
            {field("year", t.addVideo.year, { required: true, hint: t.addVideo.yearHint })}
            {field("channel", t.addVideo.channel, { hint: t.addVideo.channelHint })}
          </fieldset>
        </div>
        <FormFoot problem={failure === null ? null : failure(t)}>
          <button
            type="submit"
            className={found ? "button button--primary" : "button"}
            disabled={busy}
          >
            {busy ? t.importText.adding : t.addSource.submit}
          </button>
          <Link to="/sources" className="button button--quiet">
            {t.addSource.cancel}
          </Link>
        </FormFoot>
      </form>
    </Panel>
  );
}
