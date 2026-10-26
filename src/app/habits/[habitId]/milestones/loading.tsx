import { PageLoader } from "@/components/page-loader";

export default function MilestonesLoading() {
  return (
    <PageLoader
      messages={[
        "Loading your milestones…",
        "Checking this habit’s progress…",
        "Getting your goal ready…",
      ]}
      label="Loading habit milestones"
      hint="A moment while we gather the details."
    />
  );
}
