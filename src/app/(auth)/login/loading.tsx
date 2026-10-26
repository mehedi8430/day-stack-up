import { PageLoader } from "@/components/page-loader";

export default function LoginLoading() {
  return (
    <PageLoader
      frame="contained"
      messages={[
        "Getting the login form ready…",
        "Welcome back…",
        "One moment…",
      ]}
      label="Loading login form"
      hint="A moment while we get you back in."
    />
  );
}
