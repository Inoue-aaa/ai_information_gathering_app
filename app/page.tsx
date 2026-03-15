import { Suspense } from "react";
import { NewsDashboard } from "@/components/app/news-dashboard";
import { LoadingState } from "@/components/common/loading-state";

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewsDashboard />
    </Suspense>
  );
}
