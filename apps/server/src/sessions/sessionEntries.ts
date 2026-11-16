import {
  type CardProposal,
  type CardText,
  type Check,
  type Point,
  RULE_CHECKS,
  scoreOf,
  type SessionEntry,
} from "@glose/contracts";

import type * as CardChecks from "../cards/CardChecks.ts";
import * as Extraction from "./extraction.ts";

export const proposalsOf = (entries: ReadonlyArray<SessionEntry>) =>
  entries.flatMap((entry) => (entry._tag === "CardProposals" ? entry.proposals : []));

export const setProposal = (
  entries: ReadonlyArray<SessionEntry>,
  id: string,
  change: Partial<CardProposal>,
): ReadonlyArray<SessionEntry> =>
  entries.map((entry) =>
    entry._tag === "CardProposals" && entry.proposals.some((proposal) => proposal.id === id)
      ? {
          ...entry,
          proposals: entry.proposals.map((proposal) =>
            proposal.id === id ? { ...proposal, ...change } : proposal,
          ),
        }
      : entry,
  );

export const mapProposal = (
  entries: ReadonlyArray<SessionEntry>,
  id: string,
  change: (proposal: CardProposal) => CardProposal,
): ReadonlyArray<SessionEntry> =>
  entries.map((entry) =>
    entry._tag === "CardProposals" && entry.proposals.some((proposal) => proposal.id === id)
      ? {
          ...entry,
          proposals: entry.proposals.map((proposal) =>
            proposal.id === id ? change(proposal) : proposal,
          ),
        }
      : entry,
  );

export const pointsOf = (entries: ReadonlyArray<SessionEntry>) =>
  entries.flatMap((entry) => (entry._tag === "Points" ? entry.points : []));

export const mapPoint = (
  entries: ReadonlyArray<SessionEntry>,
  id: string,
  change: (point: Point) => Point,
): ReadonlyArray<SessionEntry> =>
  entries.map((entry) =>
    entry._tag === "Points" && entry.points.some((point) => point.id === id)
      ? { ...entry, points: entry.points.map((point) => (point.id === id ? change(point) : point)) }
      : entry,
  );

export const pointName = (point: Point) => `point ${Extraction.numberOf(point)} "${point.title}"`;

const isRuleCheck = (check: Check) => (RULE_CHECKS as ReadonlyArray<string>).includes(check.id);

export const withJudged = (proposal: CardProposal, judged: CardChecks.Judged): CardProposal => {
  const rules = (proposal.score?.checks ?? []).filter(isRuleCheck);
  return {
    ...proposal,
    score:
      typeof judged === "string" ? scoreOf(rules, judged) : scoreOf([...rules, ...judged], "done"),
  };
};

export const quoted = (card: CardText) => `"${card.question}" / "${card.answer}"`;
