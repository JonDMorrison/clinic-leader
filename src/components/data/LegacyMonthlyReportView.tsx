/**
 * LegacyMonthlyReportView
 * 
 * Renders Lori's monthly workbook data in a layout that matches the spreadsheet.
 * Shows provider table, referral totals, referral sources, and any extra blocks.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Target, Handshake, LayoutGrid } from "lucide-react";

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
 * - Null/undefined -> empty string
 * - Numbers stay as-is (no forced rounding)
 * - Strings render as-is
 */
function formatCellValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  // If it's a number, format nicely but don't round integers
  if (typeof value === 'number') {
    // Check if it's an integer
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    // For decimals, show up to 2 decimal places
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  }
  return String(value);
}

/**
 * Renders a data table block with headers and rows
 */
function DataTableBlock({ 
  title, 
  icon: Icon, 
  headers, 
  rows,
  emptyMessage = "No data"
}: { 
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  headers: string[];
  rows: any[][];
  emptyMessage?: string;
}) {
  const hasData = rows && rows.length > 0;
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Icon className="w-4 h-4 text-brand" />
          {title}
          <Badge variant="secondary" className="ml-auto text-xs">
            {rows?.length || 0} rows
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  {headers.map((header, idx) => (
                    <TableHead 
                      key={idx} 
                      className="whitespace-nowrap font-medium text-xs bg-muted/50"
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
                          className={`
                            whitespace-nowrap py-2
                            ${isNumeric ? 'text-right font-mono' : ''}
                            ${isTotal ? 'font-semibold bg-muted/30' : ''}
                            ${formatted === '' ? 'text-muted-foreground' : ''}
                          `}
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
    </Card>
  );
}

export default function LegacyMonthlyReportView({ 
  payload, 
  periodKey,
  updatedAt 
}: LegacyMonthlyReportViewProps) {
  const { provider_table, referral_totals, referral_sources, extra_blocks, warnings } = payload;

  return (
    <div className="space-y-6">
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

      {/* Main three-column layout matching spreadsheet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Provider Table */}
        <div className="lg:col-span-1">
          <DataTableBlock
            title="Provider Production"
            icon={Users}
            headers={provider_table.headers}
            rows={provider_table.rows}
            emptyMessage="No provider data"
          />
        </div>

        {/* Middle: Referral Totals */}
        <div className="lg:col-span-1">
          <DataTableBlock
            title="Referral Totals"
            icon={Target}
            headers={referral_totals.headers}
            rows={referral_totals.rows}
            emptyMessage="No referral totals"
          />
        </div>

        {/* Right: Referral Sources */}
        <div className="lg:col-span-1">
          <DataTableBlock
            title="Referral Sources"
            icon={Handshake}
            headers={referral_sources.headers}
            rows={referral_sources.rows}
            emptyMessage="No referral sources"
          />
        </div>
      </div>

      {/* Extra blocks below (e.g., Pain Management) */}
      {extra_blocks && extra_blocks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Additional Sections
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extra_blocks.map((block, idx) => (
              <DataTableBlock
                key={idx}
                title={block.title}
                icon={LayoutGrid}
                headers={block.headers}
                rows={block.rows}
                emptyMessage={`No ${block.title} data`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
