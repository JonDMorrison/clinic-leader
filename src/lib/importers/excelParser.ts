import * as XLSX from 'xlsx';

export interface ParsedExcel {
  headers: string[];
  rows: Record<string, any>[];
  sheetNames: string[];
}

export const parseExcel = (file: File): Promise<ParsedExcel> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length === 0) {
          throw new Error('Empty Excel file');
        }
        
        // First row as headers
        const headers = jsonData[0].map((h: any) => String(h || '').trim());
        
        // Convert rows to objects
        const rows: Record<string, any>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            row[header] = jsonData[i][index];
          });
          rows.push(row);
        }
        
        resolve({
          headers,
          rows,
          sheetNames: workbook.SheetNames
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsBinaryString(file);
  });
};
