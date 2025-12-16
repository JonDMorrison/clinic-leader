import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SectionRow {
  organization_id: string;
  doc_id: string;
  source: 'body_markdown' | 'parsed_text';
  section_order: number;
  section_title: string;
  section_slug: string;
  section_body: string;
  section_type: string;
  heading_path: string;
  token_count: number;
}

interface ParsedHeading {
  level: number;
  title: string;
  startIndex: number;
  endIndex: number;
}

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function inferSectionType(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('what this is') || lower.includes('overview') || lower.includes('introduction') || lower.includes('about')) return 'overview';
  if (lower.includes('when to use') || lower.includes('when should')) return 'when_to_use';
  if (lower.includes('how to') || lower.includes('steps') || lower.includes('administer') || lower.includes('process') || lower.includes('procedure')) return 'steps';
  if (lower.includes('scoring') || lower.includes('score')) return 'scoring';
  if (lower.includes('interpretation') || lower.includes('interpret') || lower.includes('results')) return 'interpretation';
  if (lower.includes('where to find') || lower.includes('location') || lower.includes('access')) return 'where_to_find';
  if (lower.includes('clinical note') || lower.includes('clinical consideration') || lower.includes('note')) return 'clinical_notes';
  if (lower.includes('source') || lower.includes('reference') || lower.includes('citation')) return 'reference';
  return 'other';
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function parseHeadings(content: string): ParsedHeading[] {
  const headings: ParsedHeading[] = [];
  const lines = content.split('\n');
  let currentIndex = 0;
  
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        title: match[2].trim(),
        startIndex: currentIndex,
        endIndex: -1,
      });
    }
    currentIndex += line.length + 1;
  }
  
  for (let i = 0; i < headings.length; i++) {
    headings[i].endIndex = i < headings.length - 1 ? headings[i + 1].startIndex : content.length;
  }
  
  return headings;
}

function buildHeadingPath(headings: ParsedHeading[], currentIndex: number): string {
  const current = headings[currentIndex];
  const parents: string[] = [];
  
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (headings[i].level < current.level) {
      parents.unshift(headings[i].title);
      const parentLevel = headings[i].level;
      for (let j = i - 1; j >= 0; j--) {
        if (headings[j].level < parentLevel) {
          parents.unshift(headings[j].title);
        }
      }
      break;
    }
  }
  
  return parents.join(' > ');
}

function extractSectionBody(content: string, heading: ParsedHeading): string {
  const fullSection = content.slice(heading.startIndex, heading.endIndex);
  const firstNewline = fullSection.indexOf('\n');
  return firstNewline === -1 ? '' : fullSection.slice(firstNewline + 1).trim();
}

function sectionizeDocument(docId: string, organizationId: string, title: string, body: string | null, parsed_text: string | null): SectionRow[] {
  const content = body?.trim() || parsed_text?.trim() || '';
  const source: 'body_markdown' | 'parsed_text' = body?.trim() ? 'body_markdown' : 'parsed_text';
  
  if (!content) return [];
  
  const headings = parseHeadings(content);
  
  if (headings.length === 0) {
    return [{
      organization_id: organizationId,
      doc_id: docId,
      source,
      section_order: 0,
      section_title: 'Overview',
      section_slug: createSlug(`${title}-overview`),
      section_body: content,
      section_type: 'overview',
      heading_path: '',
      token_count: estimateTokens(content),
    }];
  }
  
  const sections: SectionRow[] = [];
  
  if (headings[0].startIndex > 0) {
    const preamble = content.slice(0, headings[0].startIndex).trim();
    if (preamble) {
      sections.push({
        organization_id: organizationId,
        doc_id: docId,
        source,
        section_order: 0,
        section_title: 'Overview',
        section_slug: createSlug(`${title}-overview`),
        section_body: preamble,
        section_type: 'overview',
        heading_path: '',
        token_count: estimateTokens(preamble),
      });
    }
  }
  
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const sectionBody = extractSectionBody(content, heading);
    const headingPath = buildHeadingPath(headings, i);
    const slugBase = headingPath ? `${headingPath}-${heading.title}` : heading.title;
    
    sections.push({
      organization_id: organizationId,
      doc_id: docId,
      source,
      section_order: sections.length,
      section_title: heading.title,
      section_slug: createSlug(slugBase),
      section_body: sectionBody,
      section_type: inferSectionType(heading.title),
      heading_path: headingPath,
      token_count: estimateTokens(sectionBody),
    });
  }
  
  return sections;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, allOrgs } = await req.json();

    console.log(`[rebuild-sop-sections] Starting rebuild. organizationId=${organizationId}, allOrgs=${allOrgs}`);

    let orgsToProcess: string[] = [];

    if (allOrgs) {
      // Get all unique organization IDs from docs
      const { data: orgs, error: orgsError } = await supabase
        .from('docs')
        .select('organization_id')
        .eq('kind', 'SOP')
        .eq('status', 'approved');
      
      if (orgsError) throw orgsError;
      orgsToProcess = [...new Set(orgs?.map(d => d.organization_id) || [])];
      console.log(`[rebuild-sop-sections] Processing ${orgsToProcess.length} organizations`);
    } else if (organizationId) {
      orgsToProcess = [organizationId];
    } else {
      return new Response(JSON.stringify({ error: 'organizationId or allOrgs=true required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalDocs = 0;
    let totalSections = 0;
    let fallbackDocs = 0;
    const results: { org: string; docs: number; sections: number; fallbacks: number }[] = [];

    for (const orgId of orgsToProcess) {
      console.log(`[rebuild-sop-sections] Processing org ${orgId}`);

      // Fetch SOPs for this org
      const { data: docs, error: docsError } = await supabase
        .from('docs')
        .select('id, organization_id, title, body, parsed_text, file_type')
        .eq('organization_id', orgId)
        .eq('kind', 'SOP')
        .eq('status', 'approved');

      if (docsError) {
        console.error(`[rebuild-sop-sections] Error fetching docs for org ${orgId}:`, docsError);
        continue;
      }

      if (!docs || docs.length === 0) {
        console.log(`[rebuild-sop-sections] No SOPs found for org ${orgId}`);
        continue;
      }

      let orgSections = 0;
      let orgFallbacks = 0;

      for (const doc of docs) {
        // Delete existing sections for this doc
        const { error: deleteError } = await supabase
          .from('doc_sections')
          .delete()
          .eq('doc_id', doc.id);

        if (deleteError) {
          console.error(`[rebuild-sop-sections] Error deleting sections for doc ${doc.id}:`, deleteError);
          continue;
        }

        // Generate new sections
        const sections = sectionizeDocument(
          doc.id,
          doc.organization_id,
          doc.title,
          doc.body,
          doc.parsed_text
        );

        if (sections.length === 0) {
          console.log(`[rebuild-sop-sections] No content to sectionize for doc ${doc.id} (${doc.title})`);
          continue;
        }

        // Check if fallback was used (single overview section with full content)
        if (sections.length === 1 && sections[0].section_title === 'Overview' && sections[0].heading_path === '') {
          orgFallbacks++;
        }

        // Insert new sections
        const { error: insertError } = await supabase
          .from('doc_sections')
          .insert(sections);

        if (insertError) {
          console.error(`[rebuild-sop-sections] Error inserting sections for doc ${doc.id}:`, insertError);
          continue;
        }

        orgSections += sections.length;
        console.log(`[rebuild-sop-sections] Doc "${doc.title}" -> ${sections.length} sections`);
      }

      totalDocs += docs.length;
      totalSections += orgSections;
      fallbackDocs += orgFallbacks;
      results.push({ org: orgId, docs: docs.length, sections: orgSections, fallbacks: orgFallbacks });
    }

    console.log(`[rebuild-sop-sections] Complete. Docs: ${totalDocs}, Sections: ${totalSections}, Fallbacks: ${fallbackDocs}`);

    return new Response(JSON.stringify({
      success: true,
      totalDocs,
      totalSections,
      fallbackDocs,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[rebuild-sop-sections] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
