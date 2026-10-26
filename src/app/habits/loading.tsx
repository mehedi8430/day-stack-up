import { PageLoader } from "@/components/page-loader";

export default function HabitsLoading() {
  return (
    <PageLoader
      messages={[
        "Gathering your milestones…",
        "Reviewing your habits…",
        "Getting your goals ready…",
      ]}
      label="Loading your milestones"
      hint="A moment while we organize your milestones."
    />
  );
}
