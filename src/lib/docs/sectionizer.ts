/**
 * SOP Document Sectionizer
 * Parses markdown documents into structured sections for improved retrieval
 */

export interface SectionInput {
  docId: string;
  organizationId: string;
  title: string;
  body: string | null;
  parsed_text: string | null;
  file_type: string | null;
}

export interface SectionRow {
  organization_id: string;
  doc_id: string;
  source: 'body_markdown' | 'parsed_text';
  section_order: number;
  section_title: string;
  section_slug: string;
  section_body: string;
  section_type: 'overview' | 'steps' | 'scoring' | 'interpretation' | 'when_to_use' | 'where_to_find' | 'clinical_notes' | 'reference' | 'other';
  heading_path: string;
  token_count: number;
}

interface ParsedHeading {
  level: number;
  title: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Create a URL-safe slug from text
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove symbols
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Determine section_type from title using keyword heuristics
 */
function inferSectionType(title: string): SectionRow['section_type'] {
  const lower = title.toLowerCase();
  
  if (lower.includes('what this is') || lower.includes('overview') || lower.includes('introduction') || lower.includes('about')) {
    return 'overview';
  }
  if (lower.includes('when to use') || lower.includes('when should')) {
    return 'when_to_use';
  }
  if (lower.includes('how to') || lower.includes('steps') || lower.includes('administer') || lower.includes('process') || lower.includes('procedure')) {
    return 'steps';
  }
  if (lower.includes('scoring') || lower.includes('score')) {
    return 'scoring';
  }
  if (lower.includes('interpretation') || lower.includes('interpret') || lower.includes('results')) {
    return 'interpretation';
  }
  if (lower.includes('where to find') || lower.includes('location') || lower.includes('access')) {
    return 'where_to_find';
  }
  if (lower.includes('clinical note') || lower.includes('clinical consideration') || lower.includes('note')) {
    return 'clinical_notes';
  }
  if (lower.includes('source') || lower.includes('reference') || lower.includes('citation') || lower.includes('bibliography')) {
    return 'reference';
  }
  
  return 'other';
}

/**
 * Estimate token count using chars/4 approximation
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Parse markdown content to extract headings and their positions
 */
function parseHeadings(content: string): ParsedHeading[] {
  const headings: ParsedHeading[] = [];
  const lines = content.split('\n');
  let currentIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (match) {
      headings.push({
        level: match[1].length,
        title: match[2].trim(),
        startIndex: currentIndex,
        endIndex: -1, // Will be filled in later
      });
    }
    
    currentIndex += line.length + 1; // +1 for newline
  }
  
  // Set end indices
  for (let i = 0; i < headings.length; i++) {
    if (i < headings.length - 1) {
      headings[i].endIndex = headings[i + 1].startIndex;
    } else {
      headings[i].endIndex = content.length;
    }
  }
  
  return headings;
}

/**
 * Build heading path by tracking parent headings at each level
 */
function buildHeadingPath(headings: ParsedHeading[], currentIndex: number): string {
  const current = headings[currentIndex];
  const parents: string[] = [];
  
  // Look backwards for parent headings (lower level numbers = higher in hierarchy)
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (headings[i].level < current.level) {
      parents.unshift(headings[i].title);
      // Continue looking for even higher level parents
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

/**
 * Extract section body content (everything after heading until next heading)
 */
function extractSectionBody(content: string, heading: ParsedHeading): string {
  const fullSection = content.slice(heading.startIndex, heading.endIndex);
  // Remove the heading line itself
  const firstNewline = fullSection.indexOf('\n');
  if (firstNewline === -1) {
    return '';
  }
  return fullSection.slice(firstNewline + 1).trim();
}

/**
 * Main sectionization function
 * Converts a document into structured sections for retrieval
 */
export function sectionizeDocument(input: SectionInput): SectionRow[] {
  const { docId, organizationId, title, body, parsed_text } = input;
  
  // Determine source content - prefer body (markdown) over parsed_text
  const content = body?.trim() || parsed_text?.trim() || '';
  const source: SectionRow['source'] = body?.trim() ? 'body_markdown' : 'parsed_text';
  
  if (!content) {
    return [];
  }
  
  const headings = parseHeadings(content);
  
  // Fallback: no headings found, create single overview section
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
  
  // Check if there's content before the first heading
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
  
  // Process each heading as a section
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const sectionBody = extractSectionBody(content, heading);
    const headingPath = buildHeadingPath(headings, i);
    
    // Build slug from heading path + title
    const slugBase = headingPath 
      ? `${headingPath}-${heading.title}`
      : heading.title;
    
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

/**
 * Test utilities for the sectionizer
 */
export const sectionizerTests = {
  testMarkdownWithHeadings: () => {
    const input: SectionInput = {
      docId: 'test-doc-1',
      organizationId: 'test-org-1',
      title: 'Referral Process',
      body: `# Referral Process

This is the overview.

## When to Use

Use this when referring patients.

## Steps

1. Step one
2. Step two

### Sub-steps

Some sub-steps here.

## Clinical Notes

Important clinical considerations.`,
      parsed_text: null,
      file_type: 'markdown',
    };
    
    const sections = sectionizeDocument(input);
    console.log('Test: Markdown with headings');
    console.log('Sections created:', sections.length);
    sections.forEach((s, i) => {
      console.log(`  ${i}: "${s.section_title}" (${s.section_type}) path="${s.heading_path}" tokens=${s.token_count}`);
    });
    return sections;
  },
  
  testMarkdownNoHeadings: () => {
    const input: SectionInput = {
      docId: 'test-doc-2',
      organizationId: 'test-org-1',
      title: 'Simple Document',
      body: `This is a simple document with no headings.

It has multiple paragraphs but no structure.

Just plain text content.`,
      parsed_text: null,
      file_type: 'markdown',
    };
    
    const sections = sectionizeDocument(input);
    console.log('Test: Markdown without headings');
    console.log('Sections created:', sections.length);
    sections.forEach((s, i) => {
      console.log(`  ${i}: "${s.section_title}" (${s.section_type}) tokens=${s.token_count}`);
    });
    return sections;
  },
  
  testParsedText: () => {
    const input: SectionInput = {
      docId: 'test-doc-3',
      organizationId: 'test-org-1',
      title: 'PDF Document',
      body: null,
      parsed_text: `# Extracted Content

## Overview

This was extracted from a PDF.

## How to Use

Follow these instructions.`,
      file_type: 'pdf',
    };
    
    const sections = sectionizeDocument(input);
    console.log('Test: Parsed text from PDF');
    console.log('Sections created:', sections.length);
    sections.forEach((s, i) => {
      console.log(`  ${i}: "${s.section_title}" (${s.section_type}) source=${s.source} tokens=${s.token_count}`);
    });
    return sections;
  },
};
