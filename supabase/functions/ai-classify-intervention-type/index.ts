/**
 * AI Intervention Type Classifier
 * Suggests the best matching intervention type from the governance registry
 * - Uses structured tool calling for reliable JSON output
 * - Only sends title + description (no patient data)
 * - Logs classification events to intervention_events
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantContext } from '../_shared/tenant-context.ts';

const AI_MODEL = "google/gemini-3-flash-preview";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InterventionType {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface ClassificationResult {
  suggested_type_id: string | null;
  suggested_type_name: string | null;
  confidence: number;
  rationale: string;
  matched_signals: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tenantContext = await getTenantContext(req);
    console.log(`ai-classify-intervention-type: User ${tenantContext.userId}, Org ${tenantContext.organizationId}`);

    const { title, description, intervention_id } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active intervention types from registry
    const { data: types, error: typesError } = await supabase
      .from("intervention_type_registry")
      .select("id, name, category, description")
      .eq("status", "active")
      .order("category")
      .order("name");

    if (typesError || !types || types.length === 0) {
      console.error("Failed to fetch intervention types:", typesError);
      return new Response(
        JSON.stringify({ error: "No intervention types available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build type list for prompt
    const typeList = types.map((t: InterventionType, i: number) => 
      `${i + 1}. "${t.name}" (${t.category}): ${t.description}`
    ).join("\n");

    const prompt = `You are classifying a healthcare clinic intervention into a standardized type.

INTERVENTION TO CLASSIFY:
Title: "${title}"
${description ? `Description: "${description}"` : "No description provided."}

AVAILABLE INTERVENTION TYPES:
${typeList}

CLASSIFICATION RULES:
1. Pick the SINGLE best matching type based on the intervention's purpose and impact area
2. If the intervention clearly fits one type, confidence should be 85-100
3. If it probably fits but could be another, confidence should be 60-84
4. If no type fits well or it's ambiguous, return "none" with confidence < 60
5. Provide a 1-2 sentence rationale explaining your choice
6. List 2-4 short signal phrases that led to your classification

Classify this intervention now.`;

    // Use tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert at classifying healthcare operational interventions. Always use the classify_intervention_type tool to respond."
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_intervention_type",
              description: "Classify an intervention into a standardized type",
              parameters: {
                type: "object",
                properties: {
                  selected_type_name: {
                    type: "string",
                    description: "The exact name of the selected intervention type, or 'none' if no good match"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score from 0-100. 85-100 for clear match, 60-84 for probable match, <60 for uncertain/none"
                  },
                  rationale: {
                    type: "string",
                    description: "1-2 sentence explanation of why this type was chosen"
                  },
                  matched_signals: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 short phrases from the intervention that led to this classification"
                  }
                },
                required: ["selected_type_name", "confidence", "rationale", "matched_signals"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_intervention_type" } },
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "classify_intervention_type") {
      console.error("Unexpected AI response format:", JSON.stringify(aiData));
      throw new Error("AI did not return expected tool call format");
    }

    const classification = JSON.parse(toolCall.function.arguments);
    const tokensUsed = aiData.usage?.total_tokens || 0;

    // Map type name back to ID
    let result: ClassificationResult;
    
    if (classification.selected_type_name === "none" || classification.confidence < 60) {
      result = {
        suggested_type_id: null,
        suggested_type_name: null,
        confidence: classification.confidence,
        rationale: classification.rationale,
        matched_signals: classification.matched_signals || [],
      };
    } else {
      const matchedType = types.find((t: InterventionType) => 
        t.name.toLowerCase() === classification.selected_type_name.toLowerCase()
      );
      
      if (matchedType) {
        result = {
          suggested_type_id: matchedType.id,
          suggested_type_name: matchedType.name,
          confidence: classification.confidence,
          rationale: classification.rationale,
          matched_signals: classification.matched_signals || [],
        };
      } else {
        // Type name didn't match exactly, try fuzzy match
        const fuzzyMatch = types.find((t: InterventionType) =>
          t.name.toLowerCase().includes(classification.selected_type_name.toLowerCase()) ||
          classification.selected_type_name.toLowerCase().includes(t.name.toLowerCase())
        );
        
        if (fuzzyMatch) {
          result = {
            suggested_type_id: fuzzyMatch.id,
            suggested_type_name: fuzzyMatch.name,
            confidence: Math.min(classification.confidence, 75), // Lower confidence for fuzzy match
            rationale: classification.rationale,
            matched_signals: classification.matched_signals || [],
          };
        } else {
          result = {
            suggested_type_id: null,
            suggested_type_name: null,
            confidence: classification.confidence,
            rationale: `AI suggested "${classification.selected_type_name}" but no matching type found. ${classification.rationale}`,
            matched_signals: classification.matched_signals || [],
          };
        }
      }
    }

    // Track AI usage
    const costEstimate = (tokensUsed / 1000000) * 0.15;
    await supabase.from("ai_usage").upsert({
      date: new Date().toISOString().split("T")[0],
      organization_id: tenantContext.organizationId,
      tokens_used: tokensUsed,
      api_calls: 1,
      cost_estimate: costEstimate,
    }, {
      onConflict: "date,organization_id",
      ignoreDuplicates: false,
    });

    // Log classification event to intervention_events if intervention_id provided
    if (intervention_id && tenantContext.organizationId) {
      await supabase.from("intervention_events").insert({
        organization_id: tenantContext.organizationId,
        intervention_id,
        actor_user_id: tenantContext.userId,
        event_type: "type_suggested",
        details: {
          suggested_type_id: result.suggested_type_id,
          suggested_type_name: result.suggested_type_name,
          confidence: result.confidence,
          rationale: result.rationale,
          matched_signals: result.matched_signals,
          model: AI_MODEL,
          tokens_used: tokensUsed,
        },
      });
    }

    // Log to AI logs
    await supabase.from("ai_logs").insert({
      type: "intervention_type_classification",
      organization_id: tenantContext.organizationId,
      payload: {
        title_length: title.length,
        description_length: description?.length || 0,
        suggested_type_id: result.suggested_type_id,
        confidence: result.confidence,
        tokens_used: tokensUsed,
        intervention_id: intervention_id || null,
      },
    });

    console.log(`Classification complete: ${result.suggested_type_name || "none"} (${result.confidence}%)`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error classifying intervention type:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
