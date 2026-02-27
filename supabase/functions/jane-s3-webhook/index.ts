import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface S3EventRecord {
  eventName: string;
  s3: {
    bucket: { name: string };
    object: { key: string; size: number };
  };
}

interface S3Event {
  Records: S3EventRecord[];
}

/**
 * Parse S3 key to extract org_id and resource type
 * Expected format: org_{uuid}/resource_accountguid.csv
 */
function parseS3Key(key: string): { orgId: string; resource: string; accountGuid: string; fileName: string } | null {
  // Decode URL-encoded key
  const decodedKey = decodeURIComponent(key);
  
  // Match pattern: org_{uuid}/{resource}_{accountguid}.csv
  const match = decodedKey.match(/^org_([a-f0-9-]+)\/([a-z_]+)_([a-f0-9-]+)\.csv$/i);
  if (!match) {
    console.log(`[jane-s3-webhook] Key doesn't match expected pattern: ${decodedKey}`);
    return null;
  }
  
  return {
    orgId: match[1],
    resource: match[2],
    accountGuid: match[3],
    fileName: decodedKey.split('/').pop() || '',
  };
}

/**
 * Fetch CSV file from S3 using AWS credentials
 */
async function fetchFromS3(bucket: string, key: string, region: string): Promise<string> {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }

  // Decode the key for the actual request
  const decodedKey = decodeURIComponent(key);
  
  // Create AWS Signature Version 4 signed request
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const encodedKey = decodedKey.split('/').map(encodeURIComponent).join('/');
  const url = `https://${host}/${encodedKey}`;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  // Create canonical request
  const method = "GET";
  const canonicalUri = "/" + encodedKey;
  const canonicalQueryString = "";
  const payloadHash = await sha256("");
  
  const canonicalHeaders = 
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  // Create string to sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n');
  
  // Calculate signature
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256Bytes(kDate, region);
  const kService = await hmacSha256Bytes(kRegion, "s3");
  const kSigning = await hmacSha256Bytes(kService, "aws4_request");
  const signature = await hmacSha256Hex(kSigning, stringToSign);
  
  // Create authorization header
  const authorization = 
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  console.log(`[jane-s3-webhook] Fetching from S3: ${url}`);
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Host": host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      "Authorization": authorization,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`S3 fetch failed: ${response.status} - ${errorText}`);
  }

  return await response.text();
}

// Helper functions for AWS signing
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: string, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function hmacSha256Bytes(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
  const result = await hmacSha256Bytes(key, message);
  return Array.from(new Uint8Array(result))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse CSV content into array of objects
 */
function parseCsv(csvContent: string): Record<string, unknown>[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, unknown>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== headers.length) continue;
    
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

/**
 * Delete object from S3 after successful processing
 */
async function deleteFromS3(bucket: string, key: string, region: string): Promise<void> {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  
  if (!accessKeyId || !secretAccessKey) {
    console.log("[jane-s3-webhook] Skipping delete - no AWS credentials");
    return;
  }

  const decodedKey = decodeURIComponent(key);
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const encodedKey = decodedKey.split('/').map(encodeURIComponent).join('/');
  const url = `https://${host}/${encodedKey}`;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const method = "DELETE";
  const canonicalUri = "/" + encodedKey;
  const payloadHash = await sha256("");
  
  const canonicalHeaders = 
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n');
  
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256Bytes(kDate, region);
  const kService = await hmacSha256Bytes(kRegion, "s3");
  const kSigning = await hmacSha256Bytes(kService, "aws4_request");
  const signature = await hmacSha256Hex(kSigning, stringToSign);
  
  const authorization = 
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  console.log(`[jane-s3-webhook] Deleting from S3: ${url}`);
  
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Host": host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      "Authorization": authorization,
    },
  });

  if (!response.ok && response.status !== 204) {
    console.error(`[jane-s3-webhook] Delete failed: ${response.status}`);
  } else {
    console.log(`[jane-s3-webhook] Successfully deleted: ${key}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const s3Bucket = Deno.env.get("AWS_S3_BUCKET") || "clinicleader-jane-ingest";
    const s3Region = Deno.env.get("AWS_S3_REGION") || "us-west-2";

    // Parse S3 event notification
    const body = await req.json();
    console.log(`[jane-s3-webhook] Received event:`, JSON.stringify(body).slice(0, 500));
    
    // Handle both direct S3 event and SNS-wrapped event
    let s3Event: S3Event;
    if (body.Records && body.Records[0]?.s3) {
      s3Event = body;
    } else if (body.Message) {
      // SNS wrapper
      s3Event = JSON.parse(body.Message);
    } else {
      console.log("[jane-s3-webhook] Unrecognized event format");
      return new Response(
        JSON.stringify({ message: "Unrecognized event format" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ key: string; success: boolean; error?: string }> = [];

    for (const record of s3Event.Records) {
      const { bucket, object } = record.s3;
      const s3Key = object.key;
      
      console.log(`[jane-s3-webhook] Processing: ${s3Key} from ${bucket.name}`);
      
      // Parse the S3 key to get org ID and resource
      const parsed = parseS3Key(s3Key);
      if (!parsed) {
        console.log(`[jane-s3-webhook] Skipping invalid key: ${s3Key}`);
        results.push({ key: s3Key, success: false, error: "Invalid key format" });
        continue;
      }
      
      const { orgId, resource, accountGuid, fileName } = parsed;
      console.log(`[jane-s3-webhook] Parsed: org=${orgId}, resource=${resource}, accountGuid=${accountGuid}`);
      
      // Find the connector for this org
      // Unique constraint uq_org_source guarantees at most one row
      const { data: connector, error: connectorError } = await supabase
        .from("bulk_analytics_connectors")
        .select("*")
        .eq("organization_id", orgId)
        .eq("source_system", "jane")
        .maybeSingle();
      
      if (connectorError || !connector) {
        console.error(`[jane-s3-webhook] Connector not found for org ${orgId}`);
        results.push({ key: s3Key, success: false, error: "Connector not found" });
        continue;
      }
      
      try {
        // Fetch CSV from S3
        const csvContent = await fetchFromS3(bucket.name || s3Bucket, s3Key, s3Region);
        console.log(`[jane-s3-webhook] Fetched CSV: ${csvContent.length} bytes`);
        
        // Parse CSV
        const csvData = parseCsv(csvContent);
        console.log(`[jane-s3-webhook] Parsed ${csvData.length} rows`);
        
        if (csvData.length === 0) {
          results.push({ key: s3Key, success: false, error: "Empty CSV" });
          continue;
        }
        
        // Call bulk-ingest-jane to process the data
        const { data: ingestResult, error: ingestError } = await supabase.functions.invoke(
          "bulk-ingest-jane",
          {
            body: {
              connector_id: connector.id,
              file_info: {
                resource,
                file_date: new Date().toISOString().split('T')[0],
                account_guid: accountGuid,
                s3_key: s3Key,
              },
              csv_data: csvData,
            },
          }
        );
        
        if (ingestError) {
          console.error(`[jane-s3-webhook] Ingest error:`, ingestError);
          results.push({ key: s3Key, success: false, error: ingestError.message });
          continue;
        }
        
        console.log(`[jane-s3-webhook] Ingest result:`, ingestResult);
        
        // Delete file from S3 on success
        if (ingestResult?.success) {
          await deleteFromS3(bucket.name || s3Bucket, s3Key, s3Region);
        }
        
        results.push({ key: s3Key, success: true });
        
      } catch (err) {
        console.error(`[jane-s3-webhook] Processing error:`, err);
        results.push({ key: s3Key, success: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[jane-s3-webhook] Error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
