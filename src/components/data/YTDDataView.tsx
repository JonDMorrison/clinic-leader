/**
 * YTDDataView
 * 
 * Aggregates multiple months of legacy report data into a Year-to-Date view.
 * Sums numeric columns across all months, preserving row structure.
 */

import { useMemo } from "react";
import { LegacyMonthPayload } from "./LegacyMonthlyReportView";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface YTDDataViewProps {
  payloads: LegacyMonthPayload[];
  periodKeys: string[];
  year: number;
}

interface TableBlock {
  headers: string[];
  rows: any[][];
}

/**
 * Parse a cell value to a number, handling currency and percentages
 */
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  // Remove currency symbols, commas, and handle percentages
  const cleaned = str.replace(/[$,]/g, '').replace(/%$/, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
}

/**
 * Format a number back to display format
 */
function formatAggregatedValue(value: number, isPercentage: boolean): string {
  if (isPercentage) {
    return `${value.toFixed(1)}%`;
  }
  // Format with commas for large numbers
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

/**
 * Check if a column contains percentage values
 */
function isPercentageColumn(rows: any[][], colIndex: number): boolean {
  for (const row of rows) {
    const val = row[colIndex];
    if (val && typeof val === 'string' && val.includes('%')) {
      return true;
    }
  }
  return false;
}

/**
 * Aggregate rows across multiple table blocks
 * Groups by first column (label), sums numeric columns
 */
function aggregateTableBlocks(blocks: TableBlock[], shouldAverage: boolean = false): TableBlock {
  if (blocks.length === 0) {
    return { headers: [], rows: [] };
  }

  // Use headers from first block
  const headers = blocks[0].headers;
  const rowMap = new Map<string, { sums: (number | null)[]; counts: number[]; isPercentage: boolean[] }>();

  // Determine which columns are percentages
  const percentageCols: boolean[] = [];
  for (let i = 0; i < headers.length; i++) {
    percentageCols[i] = blocks.some(block => isPercentageColumn(block.rows, i));
  }

  // Process each block
  for (const block of blocks) {
    for (const row of block.rows) {
      const label = String(row[0] || '').trim();
      if (!label) continue;

      if (!rowMap.has(label)) {
        rowMap.set(label, {
          sums: new Array(headers.length).fill(null),
          counts: new Array(headers.length).fill(0),
          isPercentage: percentageCols,
        });
      }

      const entry = rowMap.get(label)!;
      
      // First column is always the label
      entry.sums[0] = label as any;

      // Sum numeric columns
      for (let i = 1; i < Math.min(row.length, headers.length); i++) {
        const numVal = parseNumericValue(row[i]);
        if (numVal !== null) {
          entry.sums[i] = (entry.sums[i] as number || 0) + numVal;
          entry.counts[i]++;
        }
      }
    }
  }

  // Convert map to rows, calculating averages for percentage columns
  const aggregatedRows: any[][] = [];
  for (const [label, entry] of rowMap) {
    const row: any[] = [label];
    for (let i = 1; i < headers.length; i++) {
      const sum = entry.sums[i];
      if (sum === null) {
        row.push('');
      } else if (shouldAverage || entry.isPercentage[i]) {
        // Average for percentages
        const count = entry.counts[i] || 1;
        row.push(formatAggregatedValue((sum as number) / count, entry.isPercentage[i]));
      } else {
        row.push(formatAggregatedValue(sum as number, false));
      }
    }
    aggregatedRows.push(row);
  }

  return { headers, rows: aggregatedRows };
}

/**
 * Normalize headers - fill in blanks from data rows if needed
 */
function normalizeHeaders(headers: any[], rows: any[][]): string[] {
  const maxWidth = Math.max(headers.length, ...rows.map(r => r?.length ?? 0));
  const result: string[] = [];
  const nonEmptyCount = headers.filter(h => h != null && String(h).trim() !== '').length;
  
  if (nonEmptyCount < 2 && rows.length > 0) {
    const firstRow = rows[0] || [];
    for (let i = 0; i < maxWidth; i++) {
      const fromFirst = firstRow[i];
      if (fromFirst != null && String(fromFirst).trim() !== '') {
        result.push(String(fromFirst).trim());
      } else {
        result.push(`Col ${i + 1}`);
      }
    }
    return result;
  }
  
  for (let i = 0; i < maxWidth; i++) {
    const h = headers[i];
    if (h != null && String(h).trim() !== '') {
      result.push(String(h).trim());
    } else {
      result.push(`Col ${i + 1}`);
    }
  }
  
  return result;
}

/**
 * Normalize rows to match header width
 */
function normalizeRows(rows: any[][], headerCount: number): any[][] {
  return rows.map(row => {
    const normalized = new Array(headerCount).fill('');
    for (let i = 0; i < Math.min(row?.length ?? 0, headerCount); i++) {
      normalized[i] = row[i];
    }
    return normalized;
  });
}

/**
 * Format a cell value for display
 */
function formatCellValue(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

/**
 * Compact data table component for YTD view
 */
function YTDTable({ 
  title, 
  headers, 
  rows,
  className,
}: { 
  title: string;
  headers: string[];
  rows: any[][];
  className?: string;
}) {
  const normalizedHeaders = normalizeHeaders(headers, rows);
  const normalizedRows = normalizeRows(rows, normalizedHeaders.length);
  const hasData = normalizedRows.length > 0;
  
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      {!hasData ? (
        <p className="text-xs text-muted-foreground py-2">No data</p>
      ) : (
        <div className="border rounded-lg max-h-[500px] overflow-y-auto">
          <Table className="text-xs w-full table-fixed">
            <TableHeader className="sticky top-0 bg-muted/90 z-10">
              <TableRow>
                {normalizedHeaders.map((header, idx) => (
                  <TableHead 
                    key={idx} 
                    className={cn(
                      "font-medium text-xs py-1.5 px-1.5 truncate",
                      idx === 0 ? "w-[30%] text-left" : "w-auto text-center"
                    )}
                    title={header}
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {normalizedRows.map((row, rowIdx) => {
                const isTotal = String(row[0]).toLowerCase().includes('total');
                return (
                  <TableRow key={rowIdx} className={cn(
                    "hover:bg-muted/20",
                    isTotal && "bg-muted/40 font-medium"
                  )}>
                    {row.map((cell, cellIdx) => {
                      const formatted = formatCellValue(cell);
                      const isNumeric = typeof cell === 'number' || /^[\$\-]?[\d,]+\.?\d*%?$/.test(formatted);
                      
                      return (
                        <TableCell 
                          key={cellIdx}
                          className={cn(
                            "py-1 px-1.5 text-xs truncate",
                            isNumeric && "text-right font-mono",
                            formatted === '' && "text-muted-foreground",
                            cellIdx === 0 && "font-medium"
                          )}
                          title={formatted}
                        >
                          {formatted || '\u00A0'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Get month range label
 */
function getMonthRangeLabel(periodKeys: string[]): string {
  if (periodKeys.length === 0) return '';
  
  const sorted = [...periodKeys].sort();
  const firstMonth = sorted[0];
  const lastMonth = sorted[sorted.length - 1];
  
  try {
    const firstDate = parseISO(`${firstMonth}-01`);
    const lastDate = parseISO(`${lastMonth}-01`);
    return `${format(firstDate, "MMM")} – ${format(lastDate, "MMM yyyy")}`;
  } catch {
    return `${firstMonth} – ${lastMonth}`;
  }
}

export default function YTDDataView({ payloads, periodKeys, year }: YTDDataViewProps) {
  // Aggregate all tables across months
  const aggregatedData = useMemo(() => {
    if (payloads.length === 0) return null;

    const providerBlocks = payloads.map(p => p.provider_table);
    const referralTotalsBlocks = payloads.map(p => p.referral_totals);
    const referralSourcesBlocks = payloads.map(p => p.referral_sources);

    return {
      provider_table: aggregateTableBlocks(providerBlocks, false),
      referral_totals: aggregateTableBlocks(referralTotalsBlocks, false),
      referral_sources: aggregateTableBlocks(referralSourcesBlocks, false),
    };
  }, [payloads]);

  if (!aggregatedData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available for {year}
      </div>
    );
  }

  const monthRangeLabel = getMonthRangeLabel(periodKeys);

  return (
    <div className="space-y-4">
      {/* YTD Header */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="font-medium">
          Year to Date ({monthRangeLabel})
        </span>
        <span className="text-muted-foreground">
          {periodKeys.length} month{periodKeys.length !== 1 ? 's' : ''} aggregated
        </span>
      </div>

      {/* Aggregated Tables */}
      <div className="space-y-6">
        <YTDTable
          title="Provider Production (YTD Total)"
          headers={aggregatedData.provider_table.headers}
          rows={aggregatedData.provider_table.rows}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <YTDTable
            title="Referral Totals (YTD Total)"
            headers={aggregatedData.referral_totals.headers}
            rows={aggregatedData.referral_totals.rows}
          />
          
          <YTDTable
            title="Referral Sources (YTD Total)"
            headers={aggregatedData.referral_sources.headers}
            rows={aggregatedData.referral_sources.rows}
          />
        </div>
      </div>
    </div>
  );
}
