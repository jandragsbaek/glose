import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useId } from "react";

import { useT } from "../i18n/I18n.tsx";
import { chatGptStatusAtom, dismissPlanNoticeAtom } from "../state/chatgpt.ts";
import { ManageUsageLink } from "./ChatGptConnection.tsx";

/**
 * The one-time confirmation after the first sign-in that allows plan use, as OpenAI's
 * guidelines for "Sign in with ChatGPT" ask. It does not come back on later sign-ins.
 */
export function PlanNotice() {
  const status = useAtomValue(chatGptStatusAtom);
  const show = AsyncResult.getOrElse(
    AsyncResult.map(
      status,
      (value) => value._tag === "Connected" && value.planUsage && !value.planNoticeSeen,
    ),
    () => false,
  );
  return show ? <PlanNoticeDialog /> : null;
}

function PlanNoticeDialog() {
  const t = useT();
  const titleId = useId();
  const dismiss = useAtomSet(dismissPlanNoticeAtom);
  return (
    <dialog
      className="dialog"
      aria-labelledby={titleId}
      ref={(node) => {
        if (node && !node.open) node.showModal();
      }}
      onCancel={() => dismiss({ payload: undefined })}
    >
      <h2 id={titleId}>{t.chatgpt.noticeTitle}</h2>
      <p>
        {t.chatgpt.noticeBody} <ManageUsageLink />
      </p>
      <form method="dialog" className="button-row">
        <button
          type="submit"
          className="button button--primary"
          onClick={() => dismiss({ payload: undefined })}
        >
          {t.chatgpt.gotIt}
        </button>
      </form>
    </dialog>
  );
}
