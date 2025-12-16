import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { validateTenantAccess } from '../_shared/tenant-context.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntentResult {
  intent: string;
  keywords: string[];
  preferred_section_types: string[];
  preferred_doc_titles: string[];
}

interface SectionMatch {
  id: string;
  doc_id: string;
  doc_title: string;
  section_title: string;
  section_type: string;
  heading_path: string;
  section_body: string;
  score: number;
}

interface SourceRef {
  doc_id: string;
  section_id: string;
  label: string;
  confidence: 'low' | 'med' | 'high';
}

interface QueryResponse {
  answer: string;
  steps?: string[];
  sources: SourceRef[];
  suggested_followups?: string[];
}

/**
 * Classify user intent using AI
 */
async function classifyIntent(question: string, lovableApiKey: string): Promise<IntentResult> {
  const prompt = `Classify this question about clinic SOPs/documents.

Question: "${question}"

Return JSON only:
{
  "intent": one of: how_to_steps, scoring, interpretation, when_to_use, where_to_find, definition, policy_rule, troubleshooting, general
  "keywords": [3-5 key terms from the question]
  "preferred_section_types": [matching types from: overview, steps, scoring, interpretation, when_to_use, where_to_find, clinical_notes, reference, other]
  "preferred_doc_titles": [if question mentions specific document names, list them]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('Intent classification failed:', response.status);
      return { intent: 'general', keywords: [], preferred_section_types: [], preferred_doc_titles: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Intent classification error:', e);
  }

  return { intent: 'general', keywords: [], preferred_section_types: [], preferred_doc_titles: [] };
}

/**
 * Generate embedding for query
 */
async function generateQueryEmbedding(text: string, lovableApiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

/**
 * First pass: keyword and heading match
 */
async function keywordSearch(
  supabase: any,
  orgId: string,
  intent: IntentResult
): Promise<SectionMatch[]> {
  const { keywords, preferred_section_types, preferred_doc_titles } = intent;
  
  // Build search pattern from keywords
  const searchTerms = keywords.map(k => k.toLowerCase());
  
  // Fetch sections with doc info
  const { data: sections, error } = await supabase
    .from('doc_sections')
    .select(`
      id,
      doc_id,
      section_title,
      section_type,
      heading_path,
      section_body,
      token_count,
      docs!inner(title, kind, status)
    `)
    .eq('organization_id', orgId)
    .eq('docs.status', 'approved')
    .eq('docs.kind', 'SOP');

  if (error || !sections) {
    console.error('Keyword search error:', error);
    return [];
  }

  // Score each section
  const scored: SectionMatch[] = [];
  
  for (const section of sections) {
    let score = 0;
    const docTitle = section.docs?.title?.toLowerCase() || '';
    const sectionTitle = section.section_title?.toLowerCase() || '';
    const headingPath = section.heading_path?.toLowerCase() || '';
    const body = section.section_body?.toLowerCase() || '';
    
    // Keyword matches
    for (const term of searchTerms) {
      if (docTitle.includes(term)) score += 3;
      if (sectionTitle.includes(term)) score += 4;
      if (headingPath.includes(term)) score += 2;
      if (body.includes(term)) score += 1;
    }
    
    // Boost preferred section types
    if (preferred_section_types.includes(section.section_type)) {
      score += 2;
    }
    
    // Boost preferred doc titles
    for (const prefTitle of preferred_doc_titles) {
      if (docTitle.includes(prefTitle.toLowerCase())) {
        score += 5;
      }
    }
    
    if (score > 0) {
      scored.push({
        id: section.id,
        doc_id: section.doc_id,
        doc_title: section.docs?.title || 'Unknown',
        section_title: section.section_title,
        section_type: section.section_type,
        heading_path: section.heading_path,
        section_body: section.section_body,
        score,
      });
    }
  }
  
  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Second pass: semantic similarity search using pgvector
 */
async function semanticSearch(
  supabase: any,
  orgId: string,
  queryEmbedding: number[],
  limit: number = 10
): Promise<SectionMatch[]> {
  // Format embedding for pgvector
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  
  // Use raw SQL for vector similarity search
  const { data, error } = await supabase.rpc('match_doc_sections', {
    query_embedding: embeddingStr,
    match_org_id: orgId,
    match_threshold: 0.3,
    match_count: limit,
  });

  if (error) {
    // RPC might not exist yet, fallback gracefully
    console.log('Semantic search unavailable (RPC not found):', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    doc_id: row.doc_id,
    doc_title: row.doc_title,
    section_title: row.section_title,
    section_type: row.section_type,
    heading_path: row.heading_path,
    section_body: row.section_body,
    score: row.similarity || 0,
  }));
}

/**
 * Merge and rank results from both passes
 */
function mergeAndRank(
  keywordResults: SectionMatch[],
  semanticResults: SectionMatch[],
  maxSections: number = 6
): SectionMatch[] {
  const seen = new Set<string>();
  const merged: SectionMatch[] = [];
  
  // Add keyword results first (they have explicit matches)
  for (const r of keywordResults) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      merged.push(r);
    }
  }
  
  // Add semantic results not already included
  for (const r of semanticResults) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      // Semantic scores are typically 0-1, scale up
      merged.push({ ...r, score: r.score * 5 });
    }
  }
  
  // Sort by score
  merged.sort((a, b) => b.score - a.score);
  
  // Boost same doc cohesion - if multiple sections from same doc, keep them together
  const topDocs = new Map<string, number>();
  for (const m of merged.slice(0, 3)) {
    topDocs.set(m.doc_id, (topDocs.get(m.doc_id) || 0) + 1);
  }
  
  const final: SectionMatch[] = [];
  const usedIds = new Set<string>();
  
  // First pass: add from top docs
  for (const m of merged) {
    if (usedIds.has(m.id)) continue;
    if (topDocs.has(m.doc_id)) {
      final.push(m);
      usedIds.add(m.id);
      if (final.length >= maxSections) break;
    }
  }
  
  // Second pass: fill remaining slots
  for (const m of merged) {
    if (usedIds.has(m.id)) continue;
    final.push(m);
    usedIds.add(m.id);
    if (final.length >= maxSections) break;
  }
  
  return final;
}

/**
 * Build context string from sections
 */
function buildContext(sections: SectionMatch[]): string {
  return sections.map((s, i) => {
    const label = `[S${i + 1}]`;
    const path = s.heading_path ? ` | Path: ${s.heading_path}` : '';
    return `${label} Doc: ${s.doc_title}${path} | Title: ${s.section_title} | Type: ${s.section_type}\nContent: ${s.section_body.slice(0, 2000)}`;
  }).join('\n\n---\n\n');
}

/**
 * Generate answer using AI
 */
async function generateAnswer(
  question: string,
  sections: SectionMatch[],
  intent: IntentResult,
  lovableApiKey: string
): Promise<QueryResponse> {
  const context = buildContext(sections);
  
  const systemPrompt = `You are a helpful assistant answering questions about clinic SOPs and documents.

RULES:
- Only answer based on the provided sections below
- If the sections don't contain relevant information, say so
- Always cite which section(s) you used (reference by [S1], [S2], etc.)
- Be concise and direct
- If asked for steps, format as a numbered list
- Do NOT make up information not in the sections

SECTIONS:
${context}

Respond with JSON only:
{
  "answer": "your answer text, referencing [S1], [S2] etc.",
  "steps": ["step 1", "step 2"] (only if question asks for steps/process),
  "sources": [
    {"doc_id": "uuid", "section_id": "uuid", "label": "Doc Title → Section Title", "confidence": "high|med|low"}
  ],
  "suggested_followups": ["follow-up question 1", "follow-up question 2"] (optional, 2-3 suggestions)
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Extract JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure sources have correct IDs from our sections
      if (parsed.sources) {
        parsed.sources = parsed.sources.map((src: any, i: number) => {
          const section = sections[i] || sections[0];
          return {
            doc_id: section?.doc_id || src.doc_id,
            section_id: section?.id || src.section_id,
            label: src.label || `${section?.doc_title} → ${section?.section_title}`,
            confidence: src.confidence || 'med',
          };
        });
      }
      
      return parsed;
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }
  }
  
  // Fallback: return raw answer
  return {
    answer: content,
    sources: sections.slice(0, 3).map(s => ({
      doc_id: s.doc_id,
      section_id: s.id,
      label: `${s.doc_title} → ${s.section_title}`,
      confidence: 'med' as const,
    })),
  };
}

/**
 * Get suggested follow-ups when retrieval fails
 */
async function getSuggestedFollowups(
  supabase: any,
  orgId: string,
  intent: IntentResult
): Promise<string[]> {
  // Get available SOP titles
  const { data: docs } = await supabase
    .from('docs')
    .select('title')
    .eq('organization_id', orgId)
    .eq('kind', 'SOP')
    .eq('status', 'approved')
    .limit(10);

  const titles = docs?.map((d: any) => d.title) || [];
  
  if (titles.length === 0) {
    return ['What SOPs are available?', 'How do I add documents?'];
  }
  
  // Generate suggestions based on available docs
  return [
    `What is the ${titles[0]} process?`,
    titles.length > 1 ? `How do I use ${titles[1]}?` : 'What documents do we have?',
    'Show me all available SOPs',
  ].slice(0, 3);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, team_id } = await req.json();
    
    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantContext = await validateTenantAccess(req, team_id);
    console.log(`[ai-query-docs] User ${tenantContext.userId} from org ${tenantContext.teamId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const orgId = tenantContext.teamId;

    // Step 1: Classify intent
    console.log('[ai-query-docs] Classifying intent...');
    const intent = await classifyIntent(question, lovableApiKey);
    console.log('[ai-query-docs] Intent:', intent);

    // Step 2: First pass - keyword search
    console.log('[ai-query-docs] Running keyword search...');
    const keywordResults = await keywordSearch(supabase, orgId, intent);
    console.log(`[ai-query-docs] Keyword results: ${keywordResults.length}`);

    // Step 3: Second pass - semantic search (if embeddings available)
    let semanticResults: SectionMatch[] = [];
    const queryEmbedding = await generateQueryEmbedding(question, lovableApiKey);
    if (queryEmbedding) {
      console.log('[ai-query-docs] Running semantic search...');
      semanticResults = await semanticSearch(supabase, orgId, queryEmbedding);
      console.log(`[ai-query-docs] Semantic results: ${semanticResults.length}`);
    }

    // Step 4: Merge and rank
    const sections = mergeAndRank(keywordResults, semanticResults, 6);
    console.log(`[ai-query-docs] Final sections: ${sections.length}`);

    // Step 5: Handle no results
    if (sections.length === 0) {
      const followups = await getSuggestedFollowups(supabase, orgId, intent);
      
      const response: QueryResponse = {
        answer: "I couldn't find a matching SOP section for that question. Please try rephrasing or check the available documents.",
        sources: [],
        suggested_followups: followups,
      };

      // Log the failed query
      await supabase.from('ai_logs').insert({
        type: 'docs_query',
        organization_id: orgId,
        payload: { question, intent, sections_found: 0, response },
      });

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 6: Generate answer
    console.log('[ai-query-docs] Generating answer...');
    const response = await generateAnswer(question, sections, intent, lovableApiKey);

    // Log successful query
    await supabase.from('ai_logs').insert({
      type: 'docs_query',
      organization_id: orgId,
      payload: {
        question,
        intent,
        sections_found: sections.length,
        sections_used: sections.map(s => ({ id: s.id, title: s.section_title, score: s.score })),
        response,
      },
    });

    console.log('[ai-query-docs] Success');
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-query-docs] Error:', error);
    
    // Handle rate limits
    if (error instanceof Response && error.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An error occurred processing your request' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
