import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => {
    return (
        <div className="animate-fade-in relative px-4 md:px-0" role="status" aria-label="Loading dashboard content">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left (lg: 2/3): hero-left + stats + operational stack in normal flow */}
                <div className="lg:col-span-2 space-y-6 min-w-0">
                    {/* HERO (left side) */}
                    <section className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-5 w-96 max-w-full" />
                        </div>

                        {/* Core Values Strip Skeleton */}
                        <div className="flex gap-2 py-1 overflow-x-auto">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-8 w-24 rounded-full flex-shrink-0" />
                            ))}
                        </div>
                    </section>

                    {/* STATS */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-28 md:h-32 rounded-xl" />
                        ))}
                    </section>

                    {/* MAIN (left) */}
                    <div className="space-y-6">
                        {/* Primary Stack Skeleton */}
                        <Skeleton className="h-64 rounded-xl w-full" />

                        {/* Recent Activity Skeleton */}
                        <Skeleton className="h-48 rounded-xl w-full" />

                        {/* Additional widget placeholders */}
                        <Skeleton className="h-40 rounded-xl w-full" />
                        <Skeleton className="h-40 rounded-xl w-full" />
                    </div>
                </div>

                {/* Right (lg: 1/3): QuickActions position + strategic/culture widgets */}
                <aside className="space-y-6 min-w-0">
                    {/* Quick Actions Skeleton */}
                    <Skeleton className="h-32 rounded-xl w-full hidden lg:block" />

                    {/* VTO Card Skeleton */}
                    <Skeleton className="h-80 rounded-xl w-full" />

                    {/* Copilot Widget Skeleton */}
                    <Skeleton className="h-60 rounded-xl w-full" />
                </aside>

                {/* Footer row (full width) */}
                <div className="lg:col-span-3">
                    <Skeleton className="h-48 rounded-xl w-full" />
                </div>
            </div>
        </div>
    );
};
