import { Skeleton } from "@/components/ui/skeleton";

export const ScorecardSkeleton = () => {
    return (
        <div className="space-y-6 animate-fade-in" role="status" aria-label="Loading scorecard">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Alerts Panel Skeleton */}
            <Skeleton className="h-24 rounded-lg w-full" />

            {/* Filters Section Skeleton */}
            <div className="glass rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-10 md:col-span-2 rounded-md" />
                    <Skeleton className="h-10 rounded-md" />
                    <Skeleton className="h-10 rounded-md" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-10 w-[250px] rounded-md" />
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
            </div>

            {/* Metrics Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-xl shadow-sm border border-border/50" />
                ))}
            </div>
        </div>
    );
};
