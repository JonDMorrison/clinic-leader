/**
 * LegacyMonthlyReportView
 * 
 * Renders Lori's monthly workbook data using collapsible accordions.
 * Shows provider table, referral totals, referral sources, and any extra blocks.
 */

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableBlock {
  headers: string[];
  rows: any[][];
}

interface ExtraBlock extends TableBlock {
  title: string;
}

export interface LegacyMonthPayload {
  sheet_name: string;
  provider_table: TableBlock;
  referral_totals: TableBlock;
  referral_sources: TableBlock;
  extra_blocks: ExtraBlock[];
  warnings?: string[];
  imported_at?: string;
  verification?: {
    provider_raw_range: string;
    provider_extracted: number;
    referral_totals_raw_range: string;
    referral_totals_extracted: number;
    referral_sources_raw_range: string;
    referral_sources_extracted: number;
    extra_blocks_counts: { title: string; extracted: number }[];
  };
}

interface LegacyMonthlyReportViewProps {
  payload: LegacyMonthPayload;
  periodKey: string;
  updatedAt?: string;
}

/**
 * Format a cell value for display.
 */
function formatCellValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  }
  return String(value);
}

/**
 * Collapsible data table section - minimal design
 */
function CollapsibleTableSection({ 
  title, 
  headers, 
  rows,
  defaultOpen = false,
  emptyMessage = "No data"
}: { 
  title: string;
  headers: string[];
  rows: any[][];
  defaultOpen?: boolean;
  emptyMessage?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasData = rows && rows.length > 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full group">
        <div className="flex items-center justify-between py-3 px-1 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
            <span className="font-medium text-sm">{title}</span>
            <span className="text-xs text-muted-foreground">
              ({hasData ? rows.length : 0})
            </span>
          </div>
        </div>
      </CollapsibleTrigger>
        
      <CollapsibleContent>
        <div className="pl-6 pt-2 pb-4">
          {!hasData ? (
            <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {headers.map((header, idx) => (
                      <TableHead 
                        key={idx} 
                        className="whitespace-nowrap font-medium text-xs"
                      >
                        {header || `Col ${idx + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-muted/20">
                      {row.map((cell, cellIdx) => {
                        const formatted = formatCellValue(cell);
                        const isNumeric = typeof cell === 'number';
                        const isTotal = rowIdx === rows.length - 1 && 
                          String(row[0]).toLowerCase().includes('total');
                        
                        return (
                          <TableCell 
                            key={cellIdx}
                            className={cn(
                              "whitespace-nowrap py-1.5 text-xs",
                              isNumeric && "text-right font-mono",
                              isTotal && "font-semibold bg-muted/30",
                              formatted === '' && "text-muted-foreground"
                            )}
                          >
                            {formatted || '—'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function LegacyMonthlyReportView({ 
  payload, 
  periodKey,
  updatedAt 
}: LegacyMonthlyReportViewProps) {
  const { provider_table, referral_totals, referral_sources, extra_blocks, warnings } = payload;

  return (
    <div className="space-y-4">
      {/* Warnings if any */}
      {warnings && warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
          <p className="text-sm font-medium text-warning mb-1">Import Warnings</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* All sections in a clean list */}
      <div className="space-y-1 bg-card rounded-lg border p-3">
        <CollapsibleTableSection
          title="Provider Production"
          headers={provider_table.headers}
          rows={provider_table.rows}
          defaultOpen={true}
          emptyMessage="No provider data"
        />

        <CollapsibleTableSection
          title="Referral Totals"
          headers={referral_totals.headers}
          rows={referral_totals.rows}
          defaultOpen={false}
          emptyMessage="No referral totals"
        />

        <CollapsibleTableSection
          title="Referral Sources"
          headers={referral_sources.headers}
          rows={referral_sources.rows}
          defaultOpen={false}
          emptyMessage="No referral sources"
        />

        {/* Extra blocks inline */}
        {extra_blocks && extra_blocks.length > 0 && extra_blocks.map((block, idx) => (
          <CollapsibleTableSection
            key={idx}
            title={block.title}
            headers={block.headers}
            rows={block.rows}
            defaultOpen={false}
            emptyMessage={`No ${block.title} data`}
          />
        ))}
      </div>
    </div>
  );
}
