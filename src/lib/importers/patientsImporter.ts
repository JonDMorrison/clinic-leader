import { supabase } from "@/integrations/supabase/client";
import { parseCSV } from "./csvParser";

export const importPatients = async (fileContent: string, fileName: string, checksum: string) => {
  try {
    const { headers, rows } = parseCSV(fileContent);
    
    if (rows.length === 0) {
      throw new Error('No data found in file');
    }

    const stagingData = rows.map(row => ({
      raw: row as any,
    }));

    const { error: stagingError } = await supabase
      .from('staging_patients')
      .insert(stagingData);

    if (stagingError) throw stagingError;

    const { error: logError } = await supabase
      .from('file_ingest_log')
      .insert({
        file_name: fileName,
        checksum: checksum,
        status: 'success',
        rows: rows.length,
      });

    if (logError) throw logError;

    return { success: true, rows: rows.length };
  } catch (error: any) {
    await supabase
      .from('file_ingest_log')
      .insert({
        file_name: fileName,
        checksum: checksum,
        status: 'error',
        rows: 0,
        error: error.message,
      });

    throw error;
  }
};
