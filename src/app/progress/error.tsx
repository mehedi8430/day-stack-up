"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProgressError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
        <div className="mb-4 text-6xl">📈</div>
        <h1 className="text-lg font-semibold">
          Couldn&apos;t load habit progress
        </h1>
        <p className="mb-6 mt-1 max-w-sm text-sm text-muted-foreground">
          Something went wrong while calculating your progress. Try again, or
          go back to the calendar.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => retry()}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Go to the calendar</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
