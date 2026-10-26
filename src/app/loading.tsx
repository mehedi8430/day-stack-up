import { PageLoader } from "@/components/page-loader";

export default function HomeLoading() {
  return (
    <PageLoader
      messages={[
        "Stacking your day…",
        "Loading your habits…",
        "Getting your calendar ready…",
      ]}
      label="Loading your habit calendar"
      hint="A moment while we line up your day."
    />
  );
}
