import type { Point, PointState, Session, SessionNotFound } from "@glose/contracts";
import type * as Effect from "effect/Effect";
import * as SubscriptionRef from "effect/SubscriptionRef";

import type { InputItem } from "./agent.ts";
import { mapPoint, pointsOf } from "./sessionEntries.ts";
import type { GraphError } from "./sessionRecord.ts";

export interface Live {
  readonly view: SubscriptionRef.SubscriptionRef<Session>;
  items: ReadonlyArray<InputItem>;
  decisions: Array<string>;
}

export type Load = (id: string) => Effect.Effect<Live, SessionNotFound | GraphError>;

export const patch = (session: Live, change: (view: Session) => Session) =>
  SubscriptionRef.update(session.view, change);

export const addPoints = (session: Live, added: ReadonlyArray<Omit<Point, "id">>) =>
  SubscriptionRef.modify(session.view, (view) => {
    const before = pointsOf(view.entries).length;
    const points = added.map((point, index): Point => ({
      ...point,
      id: `p${before + index + 1}`,
    }));
    return [points, { ...view, entries: [...view.entries, { _tag: "Points" as const, points }] }];
  });

export const changeNumbered = (
  session: Live,
  number: number,
  states: ReadonlyArray<PointState>,
  change: (point: Point) => Point,
) =>
  SubscriptionRef.modify(session.view, (view) => {
    const point = pointsOf(view.entries).find((other) => other.id === `p${number}`);
    if (point === undefined || !states.includes(point.state)) return [false, view];
    return [true, { ...view, entries: mapPoint(view.entries, point.id, change) }];
  });
