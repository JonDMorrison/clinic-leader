/**
 * LegacyMonthlyReportView
 * 
 * Renders Lori's monthly workbook data with a 3-column layout matching the source Excel.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LegacyRowActionsMenu } from "./LegacyRowActionsMenu";

/** Row-level provenance for audit verification */
export interface RowProvenance {
  sheet_name: string;
  excel_row: number;    // 1-indexed Excel row
  start_col: number;    // 1-indexed column
  end_col: number;      // 1-indexed column
  raw_cells: any[];
}

export interface TableBlock {
  headers: string[];
  rows: any[][];
  /** Row provenance for audit - parallel array to rows */
  provenance?: RowProvenance[];
}

interface ExtraBlock extends TableBlock {
  title: string;
}

export interface LegacyMonthPayload {
  sheet_name: string;
  period_key?: string;
  provider_table: TableBlock;
  referral_totals: TableBlock;
  referral_sources: TableBlock;
  extra_blocks: ExtraBlock[];
  warnings?: string[];
  imported_at?: string;
  verification?: any;
}

interface LegacyMonthlyReportViewProps {
  payload: LegacyMonthPayload;
  periodKey: string;
  updatedAt?: string;
  organizationId?: string;
}

function normalizeHeaders(headers: any[], rows: any[][]): string[] {
  const maxWidth = Math.max(headers.length, ...rows.map(r => r?.length ?? 0));
  return Array.from({ length: maxWidth }, (_, i) => 
    headers[i] && String(headers[i]).trim() || `Col ${i + 1}`
  );
}

function normalizeRows(rows: any[][], headerCount: number): any[][] {
  return rows.map(row => {
    const normalized = new Array(headerCount).fill('');
    for (let i = 0; i < Math.min(row?.length ?? 0, headerCount); i++) {
      normalized[i] = row[i];
    }
    return normalized;
  });
}

interface DataTableProps {
  title: string;
  headers: string[];
  rows: any[][];
  periodKey: string;
  organizationId?: string;
}

function DataTable({ title, headers, rows, periodKey, organizationId }: DataTableProps) {
  const normalizedHeaders = normalizeHeaders(headers, rows);
  const normalizedRows = normalizeRows(rows, normalizedHeaders.length);
  
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      {normalizedRows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No data</p>
      ) : (
        <div className="border rounded-lg max-h-[500px] overflow-y-auto">
          <Table className="text-xs w-full table-fixed">
            <TableHeader className="sticky top-0 bg-muted/90 z-10">
              <TableRow>
                {normalizedHeaders.map((header, idx) => (
                  <TableHead key={idx} className="font-medium text-xs py-1.5 px-1.5 truncate">
                    {header}
                  </TableHead>
                ))}
                <TableHead className="w-10" /> {/* Actions column */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {normalizedRows.map((row, rowIdx) => (
                <TableRow key={rowIdx} className={cn(
                  "group hover:bg-muted/20",
                  String(row[0]).toLowerCase().includes('total') && "bg-muted/40 font-medium"
                )}>
                  {row.map((cell, cellIdx) => (
                    <TableCell key={cellIdx} className="py-1 px-1.5 text-xs truncate">
                      {cell ?? ''}
                    </TableCell>
                  ))}
                  <TableCell className="py-1 px-1.5 w-10">
                    <LegacyRowActionsMenu
                      rowLabel={String(row[0] ?? '')}
                      rowData={row}
                      sectionTitle={title}
                      periodKey={periodKey}
                      organizationId={organizationId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function LegacyMonthlyReportView({ payload, periodKey, organizationId }: LegacyMonthlyReportViewProps) {
  const { provider_table, referral_totals, referral_sources, extra_blocks, warnings } = payload;

  return (
    <div className="space-y-4 p-4">
      <div className="text-xs text-muted-foreground">Period: {periodKey}</div>

      {warnings && warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <ul className="text-xs text-amber-700">{warnings.map((w, i) => <li key={i}>• {w}</li>)}</ul>
        </div>
      )}

      <div className="space-y-6">
        <DataTable title="Provider Production" headers={provider_table.headers} rows={provider_table.rows} periodKey={periodKey} organizationId={organizationId} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DataTable title="Referral Totals" headers={referral_totals.headers} rows={referral_totals.rows} periodKey={periodKey} organizationId={organizationId} />
          <DataTable title="Referral Sources" headers={referral_sources.headers} rows={referral_sources.rows} periodKey={periodKey} organizationId={organizationId} />
        </div>
      </div>

      {extra_blocks.filter(b => b.rows?.length > 0).map((block, idx) => (
        <DataTable key={idx} title={block.title} headers={block.headers} rows={block.rows} periodKey={periodKey} organizationId={organizationId} />
      ))}
    </div>
  );
}

export default LegacyMonthlyReportView;
