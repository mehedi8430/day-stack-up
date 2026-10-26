import { PageLoader } from "@/components/page-loader";

export default function ProgressLoading() {
  return (
    <PageLoader
      messages={[
        "Measuring your progress…",
        "Tallying up your wins…",
        "Checking your momentum…",
      ]}
      label="Loading habit progress"
      hint="A moment while we see how far you’ve come."
    />
  );
}
