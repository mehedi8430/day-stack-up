import { PageLoader } from "@/components/page-loader";

export default function LandingLoading() {
  return (
    <PageLoader
      frame="fullscreen"
      messages={[
        "Setting the stage…",
        "Opening DayStackUp…",
        "Almost ready…",
      ]}
      label="Loading DayStackUp"
      hint="A moment while we get things ready."
    />
  );
}
