/**
 * Utility functions for node operations
 */

import { summarizeNodeTitle } from '@/lib/api';
import type { Node } from '@/lib/api';

/**
 * Generates a short, descriptive title from node content
 * @param title - The original node title
 * @param description - The node description (optional fallback)
 * @param maxLength - Maximum length for the generated title (default: 25)
 * @returns A concise, readable title
 */
/**
 * Generates an intelligent summary title by extracting key concepts
 * @param title - The original title/content
 * @param description - Optional description for context
 * @param maxLength - Maximum length for the result
 * @returns A meaningful, concise title that captures the main idea
 */
export function generateShortTitle(
  title: string,
  description?: string,
  maxLength: number = 25
): string {
  // If title is already short enough, return as-is
  if (title.length <= maxLength) {
    return title;
  }

  // First, try intelligent summarization
  const intelligentTitle = generateIntelligentTitle(title, maxLength);
  if (intelligentTitle && intelligentTitle.length <= maxLength) {
    return intelligentTitle;
  }

  // Fallback to truncation with natural breaks
  const naturalBreaks = ['. ', '! ', '? ', ', ', '; ', ' - ', ' – '];
  
  for (const breakPoint of naturalBreaks) {
    const breakIndex = title.indexOf(breakPoint);
    if (breakIndex > 0 && breakIndex <= maxLength - 3) {
      return title.substring(0, breakIndex).trim() + '...';
    }
  }

  // Try to break at word boundaries
  const words = title.split(' ');
  let result = '';
  
  for (const word of words) {
    const testResult = result ? `${result} ${word}` : word;
    if (testResult.length > maxLength - 3) {
      break;
    }
    result = testResult;
  }

  // If we have a reasonable result, use it
  if (result.length >= 10) {
    return result + '...';
  }

  // Fallback: simple truncation at word boundary
  const truncated = title.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 10) {
    return truncated.substring(0, lastSpace) + '...';
  }

  // Final fallback: hard truncation
  return title.substring(0, maxLength - 3) + '...';
}

/**
 * Generates an intelligent title by extracting key concepts and themes
 * @param text - The text to analyze
 * @param maxLength - Maximum length for the result
 * @returns A meaningful title or null if no good title can be generated
 */
function generateIntelligentTitle(text: string, maxLength: number = 25): string | null {
  // Clean the text
  const cleanText = text.toLowerCase().trim();
  
  // Key business/strategic terms that should be prioritized
  const keyTerms = [
    'market', 'strategy', 'strategic', 'analysis', 'planning', 'plan',
    'implementation', 'roadmap', 'assessment', 'evaluation', 'review',
    'risk', 'opportunity', 'competitive', 'business', 'financial',
    'revenue', 'growth', 'expansion', 'development', 'innovation',
    'customer', 'client', 'user', 'stakeholder', 'partner',
    'product', 'service', 'solution', 'platform', 'system',
    'project', 'initiative', 'program', 'campaign', 'launch',
    'optimization', 'improvement', 'enhancement', 'upgrade',
    'research', 'insights', 'data', 'analytics', 'metrics',
    'recommendation', 'proposal', 'suggestion', 'advice',
    'decision', 'choice', 'option', 'alternative', 'approach'
  ];

  // Action words that indicate intent
  const actionWords = [
    'provide', 'deliver', 'create', 'develop', 'build', 'implement',
    'execute', 'launch', 'establish', 'design', 'analyze', 'evaluate',
    'assess', 'review', 'optimize', 'improve', 'enhance', 'upgrade',
    'research', 'investigate', 'explore', 'identify', 'determine',
    'recommend', 'suggest', 'propose', 'advise', 'guide', 'support'
  ];

  // Extract key terms found in the text
  const foundTerms: string[] = [];
  const foundActions: string[] = [];
  
  keyTerms.forEach(term => {
    if (cleanText.includes(term)) {
      foundTerms.push(term);
    }
  });
  
  actionWords.forEach(action => {
    if (cleanText.includes(action)) {
      foundActions.push(action);
    }
  });

  // Pattern matching for common business scenarios
  if (cleanText.includes('market') && (cleanText.includes('request') || cleanText.includes('need') || cleanText.includes('require'))) {
    return 'Market Request';
  }
  
  if (cleanText.includes('strategic') && (cleanText.includes('option') || cleanText.includes('recommendation'))) {
    return 'Strategic Options';
  }
  
  if (cleanText.includes('provide') && cleanText.includes('strategic')) {
    return 'Strategic Guidance';
  }
  
  if (cleanText.includes('analysis') && cleanText.includes('market')) {
    return 'Market Analysis';
  }
  
  if (cleanText.includes('implementation') && cleanText.includes('roadmap')) {
    return 'Implementation Plan';
  }
  
  if (cleanText.includes('risk') && cleanText.includes('assessment')) {
    return 'Risk Assessment';
  }

  // Generate title from found terms
  if (foundTerms.length > 0) {
    // Prioritize the most important terms
    const priorityTerms = foundTerms.filter(term =>
      ['strategic', 'market', 'analysis', 'planning', 'implementation', 'risk'].includes(term)
    );
    
    if (priorityTerms.length > 0) {
      const mainTerm = priorityTerms[0];
      
      // Add a complementary term if space allows
      if (foundActions.length > 0) {
        const action = foundActions[0];
        const combined = `${capitalizeFirst(mainTerm)} ${capitalizeFirst(action)}`;
        if (combined.length <= maxLength) {
          return combined;
        }
      }
      
      // Add another key term if space allows
      if (priorityTerms.length > 1) {
        const combined = `${capitalizeFirst(priorityTerms[0])} ${capitalizeFirst(priorityTerms[1])}`;
        if (combined.length <= maxLength) {
          return combined;
        }
      }
      
      return capitalizeFirst(mainTerm);
    }
    
    // Use any found term
    return capitalizeFirst(foundTerms[0]);
  }

  // Extract first meaningful words (skip common words)
  const words = text.split(/\s+/);
  const meaningfulWords = words.filter(word => {
    const clean = word.toLowerCase().replace(/[^\w]/g, '');
    return clean.length > 2 &&
           !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'then', 'them', 'well', 'were'].includes(clean);
  });

  if (meaningfulWords.length >= 2) {
    const title = `${capitalizeFirst(meaningfulWords[0])} ${capitalizeFirst(meaningfulWords[1])}`;
    if (title.length <= maxLength) {
      return title;
    }
  }

  if (meaningfulWords.length >= 1) {
    return capitalizeFirst(meaningfulWords[0]);
  }

  return null;
}

/**
 * Capitalizes the first letter of a string
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Generates a title specifically for display in node UI elements (synchronous fallback)
 * @param title - The original node title
 * @param description - The node description
 * @param context - The display context ('card' | 'tooltip' | 'list')
 * @returns A context-appropriate title
 */
export function generateDisplayTitle(
  title: string,
  description?: string,
  context: 'card' | 'tooltip' | 'list' = 'card'
): string {
  const maxLengths = {
    card: 25,
    tooltip: 40,
    list: 30
  };

  return generateShortTitle(title, description, maxLengths[context]);
}

/**
 * Generates a smart title for display using backend AI summarization when available
 * @param node - The node object containing title and cached summaries
 * @param context - The display context ('card' | 'tooltip' | 'list')
 * @returns Promise resolving to a context-appropriate title
 */
export async function generateSmartDisplayTitle(
  node: Node,
  context: 'card' | 'tooltip' | 'list' = 'card'
): Promise<string> {
  console.log('=== GENERATE SMART DISPLAY TITLE ===');
  console.log('Node ID:', node.id);
  console.log('Node title:', node.title);
  console.log('Context:', context);
  console.log('Node summarized_titles:', node.summarized_titles);
  
  // CRITICAL FIX: Check for valid node ID before making API calls
  if (!node.id || node.id === 'undefined' || typeof node.id !== 'string') {
    console.error('🚫 [generateSmartDisplayTitle] Invalid node ID:', node.id);
    console.log('Using fallback title due to invalid node ID');
    return generateDisplayTitle(node.title, node.description, context);
  }
  
  const maxLengths = {
    card: 25,
    tooltip: 40,
    list: 30
  };

  const maxLength = maxLengths[context];
  console.log('Max length for context:', maxLength);

  // If title is already short enough, return as-is
  if (node.title.length <= maxLength) {
    console.log('Title is short enough, returning as-is');
    return node.title;
  }

  // Check if we have a cached summarized title for this context
  if (node.summarized_titles && node.summarized_titles[context]) {
    const cachedTitle = node.summarized_titles[context];
    console.log('Found cached title:', cachedTitle);
    // Verify the cached title is still appropriate length
    if (cachedTitle.length <= maxLength) {
      console.log('Using cached title');
      return cachedTitle;
    }
  }

  // Try to get a new summarized title from the backend
  try {
    console.log('Calling summarizeNodeTitle API with valid node ID:', node.id);
    const result = await summarizeNodeTitle(node.id, context, maxLength);
    console.log('API result:', result);
    return result.summarized_title;
  } catch (error) {
    console.warn(`Failed to get summarized title for node ${node.id}:`, error);
    // Fallback to local truncation
    const fallback = generateDisplayTitle(node.title, node.description, context);
    console.log('Using fallback title:', fallback);
    return fallback;
  }
}

/**
 * Gets a display title with loading state support
 * @param node - The node object
 * @param context - The display context
 * @param fallbackTitle - Optional fallback title to show while loading
 * @returns Object with title and loading state
 */
export function useSmartDisplayTitle(
  node: Node,
  context: 'card' | 'tooltip' | 'list' = 'card',
  fallbackTitle?: string
): { title: string; isLoading: boolean; refresh: () => Promise<void> } {
  const maxLengths = {
    card: 25,
    tooltip: 40,
    list: 30
  };

  const maxLength = maxLengths[context];

  // If title is already short enough, return immediately
  if (node.title.length <= maxLength) {
    return {
      title: node.title,
      isLoading: false,
      refresh: async () => {}
    };
  }

  // Check for cached title
  if (node.summarized_titles && node.summarized_titles[context]) {
    const cachedTitle = node.summarized_titles[context];
    if (cachedTitle.length <= maxLength) {
      return {
        title: cachedTitle,
        isLoading: false,
        refresh: async () => {
          try {
            // CRITICAL FIX: Check for valid node ID before making API calls
            if (!node.id || node.id === 'undefined' || typeof node.id !== 'string') {
              console.error('🚫 [useSmartDisplayTitle] Invalid node ID for refresh:', node.id);
              return;
            }
            await summarizeNodeTitle(node.id, context, maxLength);
          } catch (error) {
            console.warn(`Failed to refresh summarized title:`, error);
          }
        }
      };
    }
  }

  // Return fallback with loading state
  const initialTitle = fallbackTitle || generateDisplayTitle(node.title, node.description, context);
  
  return {
    title: initialTitle,
    isLoading: true,
    refresh: async () => {
      try {
        // CRITICAL FIX: Check for valid node ID before making API calls
        if (!node.id || node.id === 'undefined' || typeof node.id !== 'string') {
          console.error('🚫 [useSmartDisplayTitle] Invalid node ID for refresh:', node.id);
          return;
        }
        await summarizeNodeTitle(node.id, context, maxLength);
        // Note: The actual title update would need to be handled by the component
        // since this is a pure function
      } catch (error) {
        console.warn(`Failed to get summarized title:`, error);
      }
    }
  };
}

/**
 * Extracts key phrases from text for title generation
 * @param text - The text to extract key phrases from
 * @param maxPhrases - Maximum number of phrases to extract
 * @returns Array of key phrases
 */
export function extractKeyPhrases(text: string, maxPhrases: number = 3): string[] {
  // Remove common stop words and extract meaningful phrases
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const phrases: string[] = [];

  for (const sentence of sentences.slice(0, 2)) { // Only check first 2 sentences
    const words = sentence.trim().split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word.toLowerCase()))
      .slice(0, 4); // Take first 4 meaningful words

    if (words.length >= 2) {
      phrases.push(words.join(' '));
    }
  }

  return phrases.slice(0, maxPhrases);
}

/**
 * Formats a timestamp into a human-readable relative time string
 * @param timestamp - The timestamp to format (string or number)
 * @returns A formatted time string like "2h ago", "just now", etc.
 */
export function formatTimestamp(timestamp?: string | number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}