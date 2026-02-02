/**
 * LegacyMonthlyReportView
 * 
 * Renders Lori's monthly workbook data using collapsible accordions.
 * Shows provider table, referral totals, referral sources, and any extra blocks.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Target, Handshake, LayoutGrid, ChevronDown } from "lucide-react";
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
 * Collapsible data table section
 */
function CollapsibleTableSection({ 
  title, 
  icon: Icon, 
  headers, 
  rows,
  defaultOpen = false,
  emptyMessage = "No data"
}: { 
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  headers: string[];
  rows: any[][];
  defaultOpen?: boolean;
  emptyMessage?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasData = rows && rows.length > 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand/10">
                <Icon className="w-5 h-5 text-brand" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">
                  {hasData ? `${rows.length} rows` : emptyMessage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasData && (
                <Badge variant="secondary" className="text-xs">
                  {rows.length}
                </Badge>
              )}
              <ChevronDown className={cn(
                "w-5 h-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {!hasData ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {emptyMessage}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      {headers.map((header, idx) => (
                        <TableHead 
                          key={idx} 
                          className="whitespace-nowrap font-medium text-xs bg-muted/50 first:rounded-tl last:rounded-tr"
                        >
                          {header || `Col ${idx + 1}`}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, rowIdx) => (
                      <TableRow key={rowIdx} className="hover:bg-muted/30">
                        {row.map((cell, cellIdx) => {
                          const formatted = formatCellValue(cell);
                          const isNumeric = typeof cell === 'number';
                          const isTotal = rowIdx === rows.length - 1 && 
                            String(row[0]).toLowerCase().includes('total');
                          
                          return (
                            <TableCell 
                              key={cellIdx}
                              className={cn(
                                "whitespace-nowrap py-2",
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
          </CardContent>
        </CollapsibleContent>
      </Card>
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

      {/* Main accordion sections */}
      <div className="space-y-3">
        <CollapsibleTableSection
          title="Provider Production"
          icon={Users}
          headers={provider_table.headers}
          rows={provider_table.rows}
          defaultOpen={true}
          emptyMessage="No provider data"
        />

        <CollapsibleTableSection
          title="Referral Totals"
          icon={Target}
          headers={referral_totals.headers}
          rows={referral_totals.rows}
          defaultOpen={false}
          emptyMessage="No referral totals"
        />

        <CollapsibleTableSection
          title="Referral Sources"
          icon={Handshake}
          headers={referral_sources.headers}
          rows={referral_sources.rows}
          defaultOpen={false}
          emptyMessage="No referral sources"
        />
      </div>

      {/* Extra blocks */}
      {extra_blocks && extra_blocks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 px-1">
            <LayoutGrid className="w-4 h-4" />
            Additional Sections
          </h3>
          {extra_blocks.map((block, idx) => (
            <CollapsibleTableSection
              key={idx}
              title={block.title}
              icon={LayoutGrid}
              headers={block.headers}
              rows={block.rows}
              defaultOpen={false}
              emptyMessage={`No ${block.title} data`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
