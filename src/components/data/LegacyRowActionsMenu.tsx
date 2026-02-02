/**
 * LegacyRowActionsMenu
 * 
 * Dropdown menu for each row in legacy monthly reports.
 * Actions: Add to Scorecard, Create Issue
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, AlertTriangle } from "lucide-react";
import { AddLegacyMetricModal } from "./AddLegacyMetricModal";
import { CreateIssueFromLegacyModal } from "./CreateIssueFromLegacyModal";

interface LegacyRowActionsMenuProps {
  rowLabel: string; // First column value (provider name, referral source, etc.)
  rowData: any[]; // Full row data
  sectionTitle: string; // "Provider Production", "Referral Sources", etc.
  periodKey: string;
  organizationId?: string;
}

export function LegacyRowActionsMenu({
  rowLabel,
  rowData,
  sectionTitle,
  periodKey,
  organizationId,
}: LegacyRowActionsMenuProps) {
  const [addMetricModal, setAddMetricModal] = useState(false);
  const [createIssueModal, setCreateIssueModal] = useState(false);

  // Don't show actions for empty rows or total rows
  const label = String(rowLabel).trim();
  if (!label || label.toLowerCase() === 'total' || label.toLowerCase() === 'totals') {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setAddMetricModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add to Scorecard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCreateIssueModal(true)}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Create Issue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddLegacyMetricModal
        open={addMetricModal}
        onOpenChange={setAddMetricModal}
        metricName={label}
        sectionTitle={sectionTitle}
        rowData={rowData}
      />

      <CreateIssueFromLegacyModal
        open={createIssueModal}
        onOpenChange={setCreateIssueModal}
        rowLabel={label}
        sectionTitle={sectionTitle}
        rowData={rowData}
        periodKey={periodKey}
        organizationId={organizationId}
      />
    </>
  );
}
