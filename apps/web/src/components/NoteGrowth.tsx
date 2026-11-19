import { useAtomSet } from "@effect/atom-react";
import {
  earnedGrowth,
  type GraphNode,
  type Growth,
  type GrowthEvidence,
  nextGrowth,
  SAPLING_LINKS,
} from "@glose/contracts";
import * as Exit from "effect/Exit";
import { useState } from "react";

import { type GraphIndex, growthEvidence } from "../graph/graphIndex.ts";
import { useT } from "../i18n/I18n.tsx";
import { growNoteAtom, KEYS, tendNoteAtom } from "../state/vault.ts";

export function NoteGrowth({
  node,
  index,
}: {
  readonly node: GraphNode;
  readonly index: GraphIndex;
}) {
  const t = useT();
  const g = t.graph.growth;
  const grow = useAtomSet(growNoteAtom, { mode: "promiseExit" });
  const tend = useAtomSet(tendNoteAtom, { mode: "promiseExit" });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const growth = node.growth ?? "seed";
  const evidence = growthEvidence(node, index);
  const next = nextGrowth(growth, evidence);

  const run = async (action: () => Promise<Exit.Exit<string, unknown>>) => {
    setBusy(true);
    setFailed(false);
    const exit = await action();
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };
  const day = (value: string | null, none: string) => (value === null ? none : g.day(value));

  return (
    <div className="graph__growth">
      <dl>
        <dt>{g.label}</dt>
        <dd>{g.names[growth]}</dd>
        <dt>{g.created}</dt>
        <dd>{day(node.created, g.unknown)}</dd>
        <dt>{g.updated}</dt>
        <dd>{day(node.updated, g.unknown)}</dd>
        <dt>{g.tended}</dt>
        <dd>{day(node.tended, g.never)}</dd>
      </dl>
      {next === null ? (
        <Needs growth={growth} evidence={evidence} />
      ) : (
        <p>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                grow({ payload: { id: node.id, growth: next }, reactivityKeys: KEYS.sources }),
              )
            }
          >
            {g.grow(g.names[next])}
          </button>{" "}
          <span className="graph__help">{earnedLine(t, next, evidence.linkedNotes)}</span>
        </p>
      )}
      <p>
        <button
          type="button"
          className="button"
          disabled={busy}
          title={g.tendHelp}
          onClick={() =>
            run(() => tend({ payload: { id: node.id }, reactivityKeys: KEYS.sources }))
          }
        >
          {g.tend}
        </button>
      </p>
      {failed ? (
        <p className="graph__help" role="alert">
          {g.failed}
        </p>
      ) : null}
    </div>
  );
}

type Messages = ReturnType<typeof useT>;

const earnedLine = (t: Messages, growth: Growth, linked: number): string => {
  const earned = t.graph.growth.earned;
  if (growth === "sprout") return earned.sprout;
  if (growth === "sapling") return earned.sapling(linked);
  if (growth === "tree") return earned.tree(linked);
  return "";
};

function Needs({
  growth,
  evidence,
}: {
  readonly growth: Growth;
  readonly evidence: GrowthEvidence;
}) {
  const needs = useT().graph.growth.needs;
  if (growth === "tree") return null;
  if (evidence.aiText) return <p className="graph__help">{needs.rewrite}</p>;
  if (earnedGrowth({ ...evidence, tended: null }) === "sprout") {
    return <p className="graph__help">{needs.links(SAPLING_LINKS, evidence.linkedNotes)}</p>;
  }
  return <p className="graph__help">{needs.tend}</p>;
}

export function Properties({ node }: { readonly node: GraphNode }) {
  const t = useT();
  return (
    <details className="graph__properties">
      <summary>{t.graph.properties}</summary>
      {node.properties.length === 0 ? (
        <p className="empty">{t.graph.noProperties}</p>
      ) : (
        <dl>
          {node.properties.map(({ key, value }) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </details>
  );
}
