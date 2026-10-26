import { PageLoader } from "@/components/page-loader";

export default function PlannerLoading() {
  return (
    <PageLoader
      messages={[
        "Lining up your planner…",
        "Fetching this week’s tasks…",
        "Getting your day in order…",
      ]}
      label="Loading your daily planner"
      hint="A moment while we arrange your week."
    />
  );
}
