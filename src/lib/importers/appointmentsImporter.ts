import { supabase } from "@/integrations/supabase/client";
import { parseCSV } from "./csvParser";

export const importAppointments = async (fileContent: string, fileName: string, checksum: string) => {
  try {
    const { headers, rows } = parseCSV(fileContent);
    
    if (rows.length === 0) {
      throw new Error('No data found in file');
    }

    // Insert into staging table
    const stagingData = rows.map(row => ({
      raw: row as any,
    }));

    const { error: stagingError } = await supabase
      .from('staging_appointments')
      .insert(stagingData);

    if (stagingError) throw stagingError;

    // Log the import
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
    // Log the error
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
