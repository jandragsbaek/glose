import { createFileRoute } from "@tanstack/react-router";

import { ReviewScreen } from "../components/Review.tsx";

/** The Review screen fills the window: no rail and no page header, only the Card. */
export const Route = createFileRoute("/review")({ component: ReviewScreen });
