/**
 * LegacyMonthlyReportView
 * 
 * Renders Lori's monthly workbook data with a 3-column layout matching the source Excel.
 * - Left: Provider Production (A-G)
 * - Middle: Referral Totals
 * - Right: Referral Sources
 * - Below: Extra blocks like Pain Management
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
 * Normalize headers - fill in blanks from data rows if needed
 */
function normalizeHeaders(headers: any[], rows: any[][]): string[] {
  const maxWidth = Math.max(
    headers.length,
    ...rows.map(r => r?.length ?? 0)
  );
  
  const result: string[] = [];
  const nonEmptyCount = headers.filter(h => h != null && String(h).trim() !== '').length;
  
  // If headers are mostly blank, try to use first data row as headers
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
  
  // Normal case - use headers, fill blanks
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
 * Format a cell value for display - preserve raw formatting
 */
function formatCellValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value);
}

/**
 * Compact data table component
 */
function DataTable({ 
  title, 
  headers, 
  rows,
  className
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
        <div className="overflow-x-auto border rounded-lg max-h-[500px] overflow-y-auto">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-muted/90 z-10">
              <TableRow>
                {normalizedHeaders.map((header, idx) => (
                  <TableHead 
                    key={idx} 
                    className="whitespace-nowrap font-medium text-xs py-1.5 px-2"
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
                            "whitespace-nowrap py-1 px-2 text-xs",
                            isNumeric && "text-right font-mono",
                            formatted === '' && "text-muted-foreground"
                          )}
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

export default function LegacyMonthlyReportView({ 
  payload, 
  periodKey,
  updatedAt 
}: LegacyMonthlyReportViewProps) {
  const { provider_table, referral_totals, referral_sources, extra_blocks, warnings } = payload;

  // Filter out invalid extra blocks (must have real titles, not just random cells)
  const validExtraBlocks = (extra_blocks || []).filter(block => {
    if (!block.title || block.title.length < 5) return false;
    if (block.rows.length < 2) return false;
    if (block.headers.length < 2) return false;
    // Skip blocks that look like they came from the main data
    const lowerTitle = block.title.toLowerCase();
    if (lowerTitle === 'total' || lowerTitle === 'totals') return false;
    if (lowerTitle.includes('massage therapist')) return false;
    if (lowerTitle.includes('northwest injury')) return false;
    if (lowerTitle.includes('swapp')) return false;
    if (lowerTitle.includes('sears injury')) return false;
    if (lowerTitle.includes('injury law')) return false;
    if (lowerTitle.includes('law')) return false; // Law firms are referral sources
    if (lowerTitle.includes('accident help')) return false;
    // Skip month names
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december'];
    if (months.some(m => lowerTitle === m || lowerTitle.startsWith(m + ' '))) return false;
    return true;
  });

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

      {/* Main 3-column layout matching workbook */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Provider Production (largest, spans more) */}
        <div className="lg:col-span-2">
          <DataTable
            title="Provider Production"
            headers={provider_table.headers}
            rows={provider_table.rows}
          />
        </div>

        {/* Right: Referral data stacked */}
        <div className="space-y-4">
          <DataTable
            title="Referral Totals"
            headers={referral_totals.headers}
            rows={referral_totals.rows}
          />
          
          <DataTable
            title="Referral Sources"
            headers={referral_sources.headers}
            rows={referral_sources.rows}
          />
        </div>
      </div>

      {/* Extra blocks below (like Pain Management) */}
      {validExtraBlocks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {validExtraBlocks.map((block, idx) => (
            <DataTable
              key={idx}
              title={block.title}
              headers={block.headers}
              rows={block.rows}
            />
          ))}
        </div>
      )}
    </div>
  );
}
