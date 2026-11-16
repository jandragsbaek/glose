import { createFileRoute } from "@tanstack/react-router";

import { ReviewScreen } from "../components/Review.tsx";

export const Route = createFileRoute("/review")({ component: ReviewScreen });
