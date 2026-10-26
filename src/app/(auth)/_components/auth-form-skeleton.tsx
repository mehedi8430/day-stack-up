import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthFormSkeleton({ label }: { label: string }) {
  return (
    <Card className="w-full max-w-sm" aria-busy="true" aria-live="polite">
      <CardHeader>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mx-auto h-4 w-52 max-w-full" />
        </div>
      </CardContent>
      <span className="sr-only">{label}</span>
    </Card>
  );
}
