import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const IssuesSkeleton = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>

            {/* Various banners skeleton */}
            <Skeleton className="h-24 rounded-xl w-full" />
            <Skeleton className="h-20 rounded-xl w-full" />
            <Skeleton className="h-28 rounded-xl w-full" />

            <Card>
                <CardHeader className="space-y-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
                            <Skeleton className="h-5 w-5 rounded-sm" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-1/2" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-4 w-20 rounded-full" />
                                    <Skeleton className="h-4 w-32 rounded-full" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};
