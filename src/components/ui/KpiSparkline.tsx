import { cn } from "@/lib/utils";

interface KpiSparklineProps {
  data?: number[];
  className?: string;
}

export const KpiSparkline = ({ data = [], className }: KpiSparklineProps) => {
  // Placeholder sparkline visualization
  const normalizedData = data.length > 0 ? data : [20, 30, 25, 40, 35, 50, 45];
  const max = Math.max(...normalizedData);
  const min = Math.min(...normalizedData);
  const range = max - min;

  return (
    <div className={cn("flex items-end gap-1 h-12", className)}>
      {normalizedData.map((value, index) => {
        const height = range > 0 ? ((value - min) / range) * 100 : 50;
        return (
          <div
            key={index}
            className="flex-1 bg-brand/20 rounded-sm transition-all hover:bg-brand/40"
            style={{ height: `${height}%`, minHeight: '4px' }}
          />
        );
      })}
    </div>
  );
};
