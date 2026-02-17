import { Skeleton } from "@/components/ui/skeleton";

export const RocksSkeleton = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-10 w-28 rounded-md" />
                    ))}
                </div>
            </div>

            <div className="flex items-end gap-4 p-4 bg-card rounded-lg border border-border">
                <Skeleton className="h-5 w-16" />
                <div className="flex-1 flex gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-10 w-[180px] rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-10 w-[180px] rounded-md" />
                    </div>
                </div>
            </div>

            {/* Kanban Board Skeleton */}
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
                {[1, 2, 3].map((col) => (
                    <div key={col} className="flex-1 min-w-[300px] bg-muted/50 rounded-lg p-4 space-y-4">
                        <Skeleton className="h-6 w-32 mb-4" />
                        {[1, 2].map((card) => (
                            <Skeleton key={card} className="h-32 rounded-lg w-full" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
