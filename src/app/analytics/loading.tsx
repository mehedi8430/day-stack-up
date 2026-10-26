import { PageLoader } from "@/components/page-loader";

export default function AnalyticsLoading() {
  return (
    <PageLoader
      messages={[
        "Crunching your numbers…",
        "Charting your momentum…",
        "Reviewing your streaks…",
      ]}
      label="Loading your analytics"
      hint="A moment while we put your data together."
    />
  );
}
