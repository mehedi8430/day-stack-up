import { PageLoader } from "@/components/page-loader";

export default function SignupLoading() {
  return (
    <PageLoader
      frame="contained"
      messages={[
        "Getting the sign-up form ready…",
        "Preparing your fresh start…",
        "One moment…",
      ]}
      label="Loading sign-up form"
      hint="A moment while we set things up."
    />
  );
}
