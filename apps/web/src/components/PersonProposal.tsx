import { useAtomSet } from "@effect/atom-react";
import { personFileTitle, type PersonName } from "@glose/contracts";
import { useNavigate } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert, UserPlus } from "lucide-react";
import { useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { createPersonAtom, KEYS } from "../state/vault.ts";

export function PersonProposal({ author }: { readonly author: PersonName }) {
  const t = useT();
  const navigate = useNavigate();
  const create = useAtomSet(createPersonAtom, { mode: "promiseExit" });
  const [making, setMaking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const name = personFileTitle(author);

  const make = async () => {
    setMaking(true);
    setProblem(null);
    const exit = await create({ payload: author, reactivityKeys: KEYS.sources });
    setMaking(false);
    if (Exit.isSuccess(exit)) {
      void navigate({ to: "/people/$personName", params: { personName: exit.value }, search: {} });
      return;
    }
    const error = Option.getOrUndefined(Cause.findErrorOption(exit.cause));
    setProblem(error?._tag === "NoteNameTaken" ? t.people.taken(name) : t.people.failed);
  };

  return (
    <div className="person-proposal">
      <p className="person-proposal__line">{t.people.proposal(name)}</p>
      <button type="button" className="button" disabled={making} onClick={() => void make()}>
        <UserPlus size={16} aria-hidden="true" />
        {making ? t.people.making : t.people.makePerson(name)}
      </button>
      {problem === null ? null : (
        <p className="field__error" role="alert">
          <CircleAlert className="field__error-icon" aria-hidden="true" />
          {problem}
        </p>
      )}
    </div>
  );
}
