import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MetricStatusResult } from "@/lib/scorecard/metricStatus";
import { RockGapData } from "@/components/meetings/RockGapPanel";

interface MeetingItem {
  id: string;
  section: string;
  item_type: string;
  title: string;
  description: string | null;
  source_ref_id: string | null;
  discussed: boolean;
  is_deleted: boolean;
}

interface MeetingPrintViewProps {
  meeting: {
    title: string | null;
    scheduled_for: string;
    status: string;
    started_at: string | null;
    ended_at: string | null;
  };
  organizationName?: string;
  items: MeetingItem[];
  issues: Array<{ id: string; title: string; status: string }>;
  metricStatusMap: Map<string, MetricStatusResult> | undefined;
  rockGapMap: Map<string, RockGapData> | undefined;
  periodKey: string;
}

const SECTION_ORDER = ["scorecard", "rocks", "issues", "todo", "segue", "conclusion", "custom"];
const SECTION_LABELS: Record<string, string> = {
  scorecard: "Scorecard Review",
  rocks: "Rock Review",
  issues: "Issues",
  todo: "To-Do Review",
  segue: "Segue",
  conclusion: "Conclusion",
  custom: "Custom Items",
};

const STATUS_LABELS: Record<string, string> = {
  off_track: "Off Track",
  needs_data: "Needs Data",
  needs_target: "Needs Target",
  needs_owner: "Needs Owner",
  on_track: "On Track",
};

export function MeetingPrintView({
  meeting,
  organizationName,
  items,
  issues,
  metricStatusMap,
  rockGapMap,
  periodKey,
}: MeetingPrintViewProps) {
  const groupedItems = SECTION_ORDER.reduce((acc, section) => {
    acc[section] = items.filter((item) => item.section === section && !item.is_deleted);
    return acc;
  }, {} as Record<string, MeetingItem[]>);

  const periodLabel = periodKey ? `${periodKey.slice(0, 4)}-${periodKey.slice(5)}` : "";

  return (
    <div className="print-view hidden print:block p-8 bg-white text-black">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        {organizationName && (
          <p className="text-sm text-gray-600 mb-1">{organizationName}</p>
        )}
        <h1 className="text-2xl font-bold">{meeting.title || "Level 10 Meeting"}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span>{format(new Date(meeting.scheduled_for), "PPPP 'at' p")}</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs uppercase">
            {meeting.status}
          </span>
        </div>
        {periodLabel && (
          <p className="text-sm text-gray-600 mt-1">Period: {periodLabel}</p>
        )}
      </div>

      {/* Agenda Sections */}
      {SECTION_ORDER.map((section) => {
        const sectionItems = groupedItems[section] || [];
        if (sectionItems.length === 0) return null;

        return (
          <div key={section} className="mb-6 break-inside-avoid">
            <h2 className="text-lg font-semibold border-b border-gray-300 pb-1 mb-3">
              {SECTION_LABELS[section]} ({sectionItems.length})
            </h2>
            <div className="space-y-3">
              {sectionItems.map((item) => {
                const metricStatus = item.item_type === "metric" && item.source_ref_id
                  ? metricStatusMap?.get(item.source_ref_id)
                  : null;
                const rockGap = item.item_type === "rock" && item.source_ref_id
                  ? rockGapMap?.get(item.source_ref_id)
                  : null;

                return (
                  <div key={item.id} className="pl-4 border-l-2 border-gray-200">
                    <div className="flex items-start gap-2">
                      <span className={`w-4 h-4 mt-0.5 border rounded-sm flex-shrink-0 ${item.discussed ? 'bg-gray-800' : 'bg-white'}`}>
                        {item.discussed && <span className="text-white text-xs flex items-center justify-center">✓</span>}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}

                        {/* Metric-specific info */}
                        {metricStatus && (
                          <div className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span>Month: {periodLabel}</span>
                              <span>Value: {metricStatus.value !== null ? metricStatus.value : "—"}</span>
                              <span>Target: {metricStatus.target !== null ? metricStatus.target : "—"}</span>
                              <span>Status: {STATUS_LABELS[metricStatus.status] || metricStatus.status}</span>
                            </div>
                          </div>
                        )}

                        {/* Rock-specific info */}
                        {rockGap && (
                          <div className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span>Owner: {rockGap.rock.owner_name || "Unassigned"}</span>
                              <span>Confidence: {rockGap.rock.confidence ?? "—"}/5</span>
                              {rockGap.totalLinkedMetrics > 0 && (
                                <span>
                                  Reality Gap: {rockGap.offTrackCount} off-track, {rockGap.needsDataCount} needs data
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Issues Created */}
      {issues.length > 0 && (
        <div className="mt-8 pt-4 border-t-2 border-black">
          <h2 className="text-lg font-semibold mb-3">Issues Created in This Meeting ({issues.length})</h2>
          <ul className="list-disc list-inside space-y-1">
            {issues.map((issue) => (
              <li key={issue.id} className="text-sm">
                {issue.title} <span className="text-gray-500">({issue.status})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
        <p>Generated: {format(new Date(), "PPP 'at' p")}</p>
      </div>
    </div>
  );
}
