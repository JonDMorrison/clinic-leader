import * as XLSX from 'xlsx';

export interface SheetInfo {
  name: string;
  rowCount: number;
  colCount: number;
  metricDensity: number; // 0-1 score for how "metric-like" the sheet appears
}

export interface ParsedSheet {
  headers: string[];
  rows: any[][];
  sheetName: string;
}

export interface LayoutDetection {
  type: 'row_metrics' | 'column_metrics';
  confidence: number; // 0-1
  headerRowIndex: number;
  metricNameColumn?: string; // For row_metrics
  valueColumn?: string; // For row_metrics
  detectedLabels: string[];
}

export interface ExtractedMetricData {
  sourceLabel: string;
  normalizedLabel: string;
  value: number | null;
  rawValue: any;
}

// Parse all sheets info from workbook
export const getWorkbookSheets = (file: File): Promise<{ sheets: SheetInfo[], workbook: XLSX.WorkBook }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const sheets: SheetInfo[] = workbook.SheetNames.map(name => {
          const worksheet = workbook.Sheets[name];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          const rowCount = range.e.r - range.s.r + 1;
          const colCount = range.e.c - range.s.c + 1;
          
          // Calculate metric density - how many cells contain text that looks like metric names
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          let metricLikeCount = 0;
          let totalCells = 0;
          
          for (let r = 0; r < Math.min(rowCount, 20); r++) {
            for (let c = 0; c < Math.min(colCount, 10); c++) {
              const cell = jsonData[r]?.[c];
              if (cell !== undefined && cell !== null && cell !== '') {
                totalCells++;
                if (typeof cell === 'string' && cell.length > 3 && cell.length < 100) {
                  // Looks like a label
                  metricLikeCount++;
                }
              }
            }
          }
          
          return {
            name,
            rowCount,
            colCount,
            metricDensity: totalCells > 0 ? metricLikeCount / totalCells : 0
          };
        });
        
        resolve({ sheets, workbook });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsBinaryString(file);
  });
};

// Parse specific sheet with preview
export const parseSheet = (workbook: XLSX.WorkBook, sheetName: string, maxRows = 50): ParsedSheet => {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  // First row as headers (can be adjusted)
  const headers = (jsonData[0] || []).map((h: any) => String(h || '').trim());
  const rows = jsonData.slice(0, maxRows);
  
  return {
    headers,
    rows,
    sheetName
  };
};

// Auto-detect layout type
export const detectLayout = (parsedSheet: ParsedSheet): LayoutDetection => {
  const { rows } = parsedSheet;
  if (rows.length < 2) {
    return {
      type: 'column_metrics',
      confidence: 0.3,
      headerRowIndex: 0,
      detectedLabels: []
    };
  }
  
  // Check for column-based layout: headers are text, data rows are mostly numeric
  const headerRow = rows[0] || [];
  const dataRow = rows[1] || [];
  
  let headerTextCount = 0;
  let dataNumericCount = 0;
  
  for (let i = 0; i < headerRow.length; i++) {
    if (typeof headerRow[i] === 'string' && headerRow[i].length > 2) {
      headerTextCount++;
    }
    if (typeof dataRow[i] === 'number' || !isNaN(parseFloat(dataRow[i]))) {
      dataNumericCount++;
    }
  }
  
  const columnLayoutScore = (headerTextCount / Math.max(headerRow.length, 1)) * 
    (dataNumericCount / Math.max(dataRow.length, 1));
  
  // Check for row-based layout: first column is text labels, second+ are numeric
  let firstColTextCount = 0;
  let secondColNumericCount = 0;
  
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r] || [];
    if (typeof row[0] === 'string' && row[0].length > 2) {
      firstColTextCount++;
    }
    if (typeof row[1] === 'number' || !isNaN(parseFloat(row[1]))) {
      secondColNumericCount++;
    }
  }
  
  const rowLayoutScore = (firstColTextCount / Math.min(rows.length, 20)) * 
    (secondColNumericCount / Math.min(rows.length, 20));
  
  // Determine winner
  const isRowBased = rowLayoutScore > columnLayoutScore;
  
  // Extract detected labels
  let detectedLabels: string[] = [];
  let metricNameColumn: string | undefined;
  let valueColumn: string | undefined;
  
  if (isRowBased) {
    // Labels are in first column
    metricNameColumn = 'A';
    valueColumn = 'B';
    detectedLabels = rows
      .map(row => row[0])
      .filter(v => typeof v === 'string' && v.length > 2)
      .slice(0, 50);
  } else {
    // Labels are in header row
    detectedLabels = headerRow
      .filter(v => typeof v === 'string' && v.length > 2)
      .slice(0, 50);
  }
  
  return {
    type: isRowBased ? 'row_metrics' : 'column_metrics',
    confidence: Math.max(rowLayoutScore, columnLayoutScore),
    headerRowIndex: 0,
    metricNameColumn,
    valueColumn,
    detectedLabels
  };
};

// Normalize label for matching
export const normalizeLabel = (label: string): string => {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Collapse whitespace
};

// Match source label to metrics
export const findMetricMatch = (
  sourceLabel: string,
  metrics: Array<{ id: string; name: string; import_key?: string | null; aliases?: string[] | null }>
): { metricId: string | null; confidence: number; matchType: string } => {
  const normalized = normalizeLabel(sourceLabel);
  
  // Priority 1: Exact match on import_key
  for (const m of metrics) {
    if (m.import_key && normalizeLabel(m.import_key) === normalized) {
      return { metricId: m.id, confidence: 1, matchType: 'import_key' };
    }
  }
  
  // Priority 2: Exact match on name
  for (const m of metrics) {
    if (normalizeLabel(m.name) === normalized) {
      return { metricId: m.id, confidence: 0.95, matchType: 'name' };
    }
  }
  
  // Priority 3: Match on aliases
  for (const m of metrics) {
    if (m.aliases && Array.isArray(m.aliases)) {
      for (const alias of m.aliases) {
        if (normalizeLabel(alias) === normalized) {
          return { metricId: m.id, confidence: 0.9, matchType: 'alias' };
        }
      }
    }
  }
  
  // Priority 4: Fuzzy contains match (but only if unambiguous)
  const containsMatches: { metric: typeof metrics[0]; score: number }[] = [];
  for (const m of metrics) {
    const metricNorm = normalizeLabel(m.name);
    if (metricNorm.includes(normalized) || normalized.includes(metricNorm)) {
      const score = Math.min(normalized.length, metricNorm.length) / 
        Math.max(normalized.length, metricNorm.length);
      containsMatches.push({ metric: m, score });
    }
  }
  
  if (containsMatches.length === 1) {
    return { metricId: containsMatches[0].metric.id, confidence: containsMatches[0].score * 0.7, matchType: 'fuzzy' };
  }
  
  return { metricId: null, confidence: 0, matchType: 'none' };
};

// Extract data using profile mappings
export const extractDataWithMappings = (
  parsedSheet: ParsedSheet,
  layoutType: 'row_metrics' | 'column_metrics',
  headerRowIndex: number,
  metricNameColumn: string | undefined,
  valueColumn: string | undefined,
  mappings: Record<string, string> // sourceLabel -> metricId
): ExtractedMetricData[] => {
  const { rows } = parsedSheet;
  const results: ExtractedMetricData[] = [];
  
  if (layoutType === 'column_metrics') {
    // Headers contain metric names, values are in rows below
    const headers = rows[headerRowIndex] || [];
    const dataRow = rows[headerRowIndex + 1] || [];
    
    for (let c = 0; c < headers.length; c++) {
      const sourceLabel = String(headers[c] || '').trim();
      if (!sourceLabel) continue;
      
      const normalized = normalizeLabel(sourceLabel);
      const rawValue = dataRow[c];
      const numValue = parseFloat(String(rawValue).replace(/[,$%]/g, ''));
      
      results.push({
        sourceLabel,
        normalizedLabel: normalized,
        value: isNaN(numValue) ? null : numValue,
        rawValue
      });
    }
  } else {
    // Row-based: first column has names, specified column has values
    const nameColIndex = metricNameColumn ? columnLetterToIndex(metricNameColumn) : 0;
    const valueColIndex = valueColumn ? columnLetterToIndex(valueColumn) : 1;
    
    for (let r = headerRowIndex; r < rows.length; r++) {
      const row = rows[r] || [];
      const sourceLabel = String(row[nameColIndex] || '').trim();
      if (!sourceLabel) continue;
      
      const normalized = normalizeLabel(sourceLabel);
      const rawValue = row[valueColIndex];
      const numValue = parseFloat(String(rawValue).replace(/[,$%]/g, ''));
      
      results.push({
        sourceLabel,
        normalizedLabel: normalized,
        value: isNaN(numValue) ? null : numValue,
        rawValue
      });
    }
  }
  
  return results;
};

// Helper to convert column letter to index
const columnLetterToIndex = (letter: string): number => {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + letter.charCodeAt(i) - 64;
  }
  return result - 1;
};

// Helper to convert index to column letter
export const indexToColumnLetter = (index: number): string => {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};
