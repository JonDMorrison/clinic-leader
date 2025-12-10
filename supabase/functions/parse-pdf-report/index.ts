import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_base64, file_name, organization_id } = await req.json();

    if (!file_base64 || !organization_id) {
      return new Response(
        JSON.stringify({ error: { message: "Missing required fields" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Parsing PDF: ${file_name} for org: ${organization_id}`);

    // Decode base64 to bytes
    const pdfBytes = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));
    
    // Extract text using basic regex parser (same as extract-doc-text)
    let extractedText = "";
    try {
      const pdfString = new TextDecoder("latin1").decode(pdfBytes);
      
      // Extract text between BT...ET operators
      const btEtMatches = pdfString.match(/BT[\s\S]*?ET/g) || [];
      for (const block of btEtMatches) {
        const textMatches = block.match(/\(([^)]*)\)|<([^>]*)>/g) || [];
        for (const match of textMatches) {
          if (match.startsWith("(") && match.endsWith(")")) {
            extractedText += match.slice(1, -1) + " ";
          }
        }
      }
      
      // Fallback: extract readable sequences
      if (extractedText.length < 100) {
        const readableMatches = pdfString.match(/[\x20-\x7E]{4,}/g) || [];
        extractedText = readableMatches.join(" ");
      }
    } catch (e) {
      console.error("Text extraction error:", e);
    }

    console.log(`Extracted ${extractedText.length} characters of text`);

    // Create Supabase client to fetch organization's metrics
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: metrics, error: metricsError } = await supabase
      .from("metrics")
      .select("id, name, unit, target")
      .eq("organization_id", organization_id);

    if (metricsError) {
      console.error("Error fetching metrics:", metricsError);
      throw metricsError;
    }

    const metricNames = metrics?.map(m => m.name) || [];
    console.log(`Found ${metricNames.length} metrics for org`);

    // Use Lovable AI to extract metric values
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiPrompt = `You are a data extraction assistant. Extract metric values from this report text.

Here are the metrics we're looking for:
${metricNames.map(n => `- ${n}`).join("\n")}

Report text:
${extractedText.slice(0, 15000)}

Instructions:
1. Find any numbers that appear to be values for the metrics listed above
2. Match them to the closest metric name
3. Return ONLY a JSON array of objects with format: { "name": "metric name from text", "value": number, "matchedMetric": "exact metric name from list above", "confidence": 0.0-1.0 }
4. Only include matches where you're reasonably confident
5. If no metrics found, return empty array []

Return ONLY the JSON array, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise data extraction assistant. Return only valid JSON." },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Strip markdown fences if present
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let extractedMetrics = [];
    try {
      extractedMetrics = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      extractedMetrics = [];
    }

    // Map AI results to our format with metric IDs
    const mappedMetrics = extractedMetrics.map((em: any) => {
      const matchedMetric = metrics?.find(m => 
        m.name.toLowerCase() === em.matchedMetric?.toLowerCase()
      );
      
      return {
        name: em.name || em.matchedMetric,
        value: typeof em.value === "number" ? em.value : parseFloat(em.value) || 0,
        matchedMetricId: matchedMetric?.id,
        matchedMetricName: matchedMetric?.name,
        confidence: em.confidence || 0.5,
      };
    }).filter((m: any) => !isNaN(m.value));

    console.log(`Extracted ${mappedMetrics.length} metric values`);

    return new Response(
      JSON.stringify({ metrics: mappedMetrics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("parse-pdf-report error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: { message: errMsg } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
