/**
 * Simple text-similarity matcher to suggest links between VTO goals and existing entities
 */

interface LinkSuggestion {
  link_type: 'kpi' | 'rock' | 'issue' | 'doc';
  link_id: string;
  name: string;
  score: number;
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses token overlap and case-insensitive matching
 */
function calculateSimilarity(text1: string, text2: string): number {
  const tokens1 = text1.toLowerCase().split(/\s+/);
  const tokens2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  let matches = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      matches++;
    }
  }
  
  const union = new Set([...set1, ...set2]);
  return matches / union.size;
}

/**
 * Find the best matching entities for a given goal text
 */
export function suggestLinks(
  goalText: string,
  entities: {
    kpis?: Array<{ id: string; name: string }>;
    rocks?: Array<{ id: string; title: string }>;
    issues?: Array<{ id: string; title: string }>;
    docs?: Array<{ id: string; title: string }>;
  },
  threshold = 0.3
): LinkSuggestion[] {
  const suggestions: LinkSuggestion[] = [];
  
  // Match KPIs
  if (entities.kpis) {
    for (const kpi of entities.kpis) {
      const score = calculateSimilarity(goalText, kpi.name);
      if (score >= threshold) {
        suggestions.push({
          link_type: 'kpi',
          link_id: kpi.id,
          name: kpi.name,
          score
        });
      }
    }
  }
  
  // Match Rocks
  if (entities.rocks) {
    for (const rock of entities.rocks) {
      const score = calculateSimilarity(goalText, rock.title);
      if (score >= threshold) {
        suggestions.push({
          link_type: 'rock',
          link_id: rock.id,
          name: rock.title,
          score
        });
      }
    }
  }
  
  // Match Issues
  if (entities.issues) {
    for (const issue of entities.issues) {
      const score = calculateSimilarity(goalText, issue.title);
      if (score >= threshold) {
        suggestions.push({
          link_type: 'issue',
          link_id: issue.id,
          name: issue.title,
          score
        });
      }
    }
  }
  
  // Match Docs
  if (entities.docs) {
    for (const doc of entities.docs) {
      const score = calculateSimilarity(goalText, doc.title);
      if (score >= threshold) {
        suggestions.push({
          link_type: 'doc',
          link_id: doc.id,
          name: doc.title,
          score
        });
      }
    }
  }
  
  // Sort by score descending
  suggestions.sort((a, b) => b.score - a.score);
  
  // Return top 3 suggestions per goal
  return suggestions.slice(0, 3);
}
