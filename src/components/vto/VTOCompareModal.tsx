import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCompare, Plus, Minus, Edit } from "lucide-react";

interface VTOHistoryEntry {
  id: string;
  vto_version: number;
  vto_snapshot: any;
  scorecard_snapshot: any[];
  rocks_snapshot: any[];
}

interface VTOCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEntry: VTOHistoryEntry | null;
  previousEntry: VTOHistoryEntry | null;
}

function DiffBadge({ type }: { type: 'added' | 'removed' | 'modified' }) {
  const config = {
    added: { icon: Plus, label: 'Added', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    removed: { icon: Minus, label: 'Removed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    modified: { icon: Edit, label: 'Modified', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  };

  const { icon: Icon, label, className } = config[type];

  return (
    <Badge variant="outline" className={`${className} gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function DiffSection({
  title,
  current,
  previous,
  renderItem,
}: {
  title: string;
  current: any[];
  previous: any[];
  renderItem: (item: any) => string;
}) {
  const currentSet = new Set(current.map(renderItem));
  const previousSet = new Set(previous.map(renderItem));

  const added = current.filter(item => !previousSet.has(renderItem(item)));
  const removed = previous.filter(item => !currentSet.has(renderItem(item)));
  const unchanged = current.filter(item => previousSet.has(renderItem(item)));

  if (added.length === 0 && removed.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {added.map((item, i) => (
          <div key={`added-${i}`} className="flex items-center gap-2 text-sm">
            <DiffBadge type="added" />
            <span className="text-emerald-600">{renderItem(item)}</span>
          </div>
        ))}
        {removed.map((item, i) => (
          <div key={`removed-${i}`} className="flex items-center gap-2 text-sm">
            <DiffBadge type="removed" />
            <span className="text-destructive line-through">{renderItem(item)}</span>
          </div>
        ))}
        {unchanged.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {unchanged.length} unchanged items
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TextDiff({
  title,
  current,
  previous,
}: {
  title: string;
  current: string;
  previous: string;
}) {
  if (current === previous) return null;

  const hasChange = current !== previous;
  const isAdded = !previous && current;
  const isRemoved = previous && !current;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {title}
          {isAdded && <DiffBadge type="added" />}
          {isRemoved && <DiffBadge type="removed" />}
          {hasChange && !isAdded && !isRemoved && <DiffBadge type="modified" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {previous && (
          <div className="text-sm">
            <span className="text-xs text-muted-foreground">Previous:</span>
            <p className={isRemoved ? 'text-destructive line-through' : 'text-muted-foreground'}>{previous}</p>
          </div>
        )}
        {current && (
          <div className="text-sm">
            <span className="text-xs text-muted-foreground">Current:</span>
            <p className={isAdded ? 'text-emerald-600' : ''}>{current}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NumericDiff({
  title,
  current,
  previous,
  format = (v: number) => v.toString(),
}: {
  title: string;
  current: number;
  previous: number;
  format?: (v: number) => string;
}) {
  if (current === previous) return null;

  const diff = current - previous;
  const diffPercent = previous ? ((diff / previous) * 100).toFixed(1) : '100';

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {title}
          <DiffBadge type="modified" />
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground line-through">{format(previous)}</span>
          <span>→</span>
          <span className={diff > 0 ? 'text-emerald-600' : 'text-destructive'}>{format(current)}</span>
          <Badge variant="outline" className={diff > 0 ? 'text-emerald-600' : 'text-destructive'}>
            {diff > 0 ? '+' : ''}{diffPercent}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function VTOCompareModal({
  open,
  onOpenChange,
  currentEntry,
  previousEntry,
}: VTOCompareModalProps) {
  if (!currentEntry || !previousEntry) return null;

  const current = currentEntry.vto_snapshot || {};
  const previous = previousEntry.vto_snapshot || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare VTO Versions
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Version {previousEntry.vto_version} → Version {currentEntry.vto_version}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-4 pr-4">
            {/* Core Values */}
            <DiffSection
              title="Core Values"
              current={current.core_values || []}
              previous={previous.core_values || []}
              renderItem={(v) => typeof v === 'string' ? v : v.name || v.value}
            />

            {/* Core Focus */}
            <TextDiff
              title="Purpose"
              current={current.core_focus?.purpose || ''}
              previous={previous.core_focus?.purpose || ''}
            />
            <TextDiff
              title="Niche"
              current={current.core_focus?.niche || ''}
              previous={previous.core_focus?.niche || ''}
            />

            {/* 10-Year Target */}
            <TextDiff
              title="10-Year Target"
              current={current.ten_year_target || ''}
              previous={previous.ten_year_target || ''}
            />

            {/* 3-Year Picture Revenue/Profit */}
            {(current.three_year_picture?.revenue !== previous.three_year_picture?.revenue) && (
              <NumericDiff
                title="3-Year Revenue Target"
                current={Number(current.three_year_picture?.revenue) || 0}
                previous={Number(previous.three_year_picture?.revenue) || 0}
                format={(v) => `$${v.toLocaleString()}`}
              />
            )}
            {(current.three_year_picture?.profit !== previous.three_year_picture?.profit) && (
              <NumericDiff
                title="3-Year Profit Target"
                current={Number(current.three_year_picture?.profit) || 0}
                previous={Number(previous.three_year_picture?.profit) || 0}
                format={(v) => `${v}%`}
              />
            )}

            {/* 3-Year Measurables */}
            <DiffSection
              title="3-Year Measurables"
              current={current.three_year_picture?.measurables || []}
              previous={previous.three_year_picture?.measurables || []}
              renderItem={(m) => typeof m === 'string' ? m : m.title || m.description}
            />

            {/* 1-Year Goals */}
            <DiffSection
              title="1-Year Goals"
              current={current.one_year_plan?.goals || []}
              previous={previous.one_year_plan?.goals || []}
              renderItem={(g) => typeof g === 'string' ? g : g.title || g.description}
            />

            {/* Scorecard Diff */}
            <DiffSection
              title="Scorecard Metrics"
              current={currentEntry.scorecard_snapshot || []}
              previous={previousEntry.scorecard_snapshot || []}
              renderItem={(m) => `${m.name} (${m.category})`}
            />

            {/* Rocks Diff */}
            <DiffSection
              title="Quarterly Rocks"
              current={currentEntry.rocks_snapshot || []}
              previous={previousEntry.rocks_snapshot || []}
              renderItem={(r) => r.title}
            />

            {current.core_values?.length === previous.core_values?.length &&
             current.ten_year_target === previous.ten_year_target &&
             JSON.stringify(current.three_year_picture) === JSON.stringify(previous.three_year_picture) &&
             JSON.stringify(current.one_year_plan) === JSON.stringify(previous.one_year_plan) && (
              <p className="text-muted-foreground text-center py-8">
                No significant differences detected between these versions.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
