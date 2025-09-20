/**
 * Utility functions for processing and formatting tooltip content
 * according to the Progressive Disclosure specification
 */

import { Node } from '@/lib/api';

export interface ProcessedContent {
  executiveSummary: string;
  keyInsights: string[];
  strategicAnalysis: string;
  decisionPoints: string[];
  nextActions: string[];
}

export type DisplayTier = 'quick' | 'expanded' | 'modal';

/**
 * Intelligently truncates text while preserving context and meaning
 */
export function intelligentTruncate(
  text: string,
  maxWords: number,
  options: {
    preserveContext?: boolean;
    prioritizeKeywords?: string[];
    endWithCompleteSentence?: boolean;
  } = {}
): string {
  if (!text) return '';
  
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const { preserveContext = true, prioritizeKeywords = [], endWithCompleteSentence = true } = options;

  // If we have priority keywords, try to include sentences containing them
  if (prioritizeKeywords.length > 0 && preserveContext) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const prioritySentences = sentences.filter(sentence =>
      prioritizeKeywords.some(keyword =>
        sentence.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    if (prioritySentences.length > 0) {
      const combinedPriority = prioritySentences.join('. ').trim();
      const priorityWords = combinedPriority.split(/\s+/);
      
      if (priorityWords.length <= maxWords) {
        return combinedPriority + (combinedPriority.endsWith('.') ? '' : '.');
      }
    }
  }

  // Fallback to word-based truncation
  let truncated = words.slice(0, maxWords).join(' ');

  if (endWithCompleteSentence) {
    // Try to end at a sentence boundary
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    if (lastSentenceEnd > truncated.length * 0.7) {
      truncated = truncated.substring(0, lastSentenceEnd + 1);
    } else {
      truncated += '...';
    }
  } else {
    truncated += '...';
  }

  return truncated;
}

/**
 * Generates an executive summary from key message and keynote points
 */
export function generateExecutiveSummary(keyMessage?: string, keynotePoints?: string[]): string {
  if (keyMessage && keyMessage.length <= 200) {
    return keyMessage;
  }

  // Combine available content
  const combinedContent = [
    keyMessage || '',
    ...(keynotePoints || [])
  ].filter(Boolean).join(' ');

  if (!combinedContent) {
    return 'No summary available';
  }

  return intelligentTruncate(combinedContent, 50, {
    preserveContext: true,
    prioritizeKeywords: ['strategic', 'decision', 'opportunity', 'risk', 'key', 'important'],
    endWithCompleteSentence: true
  });
}

/**
 * Extracts key insights from keynote points with intelligent formatting
 */
export function extractKeyInsights(keynotePoints?: string[], maxCount: number = 4): string[] {
  if (!keynotePoints || keynotePoints.length === 0) {
    return [];
  }

  return keynotePoints
    .map(point => intelligentTruncate(point, 15, { endWithCompleteSentence: false }))
    .slice(0, maxCount)
    .filter(point => point.length > 5);
}

/**
 * Generates strategic analysis from description content
 */
export function generateStrategicAnalysis(description?: string): string {
  if (!description) {
    return 'No strategic analysis available';
  }

  return intelligentTruncate(description, 120, {
    preserveContext: true,
    prioritizeKeywords: [
      'market', 'strategy', 'analysis', 'opportunity', 'risk', 'competitive',
      'business', 'financial', 'growth', 'development', 'assessment'
    ],
    endWithCompleteSentence: true
  });
}

/**
 * Extracts decision points from content
 */
export function extractDecisionPoints(description?: string): string[] {
  if (!description) return [];

  // Look for question patterns and decision-related content
  const questionPatterns = [
    /should\s+we\s+[^?]*\?/gi,
    /what\s+[^?]*\?/gi,
    /how\s+[^?]*\?/gi,
    /when\s+[^?]*\?/gi,
    /which\s+[^?]*\?/gi,
    /whether\s+[^?]*\?/gi
  ];

  const decisionKeywords = [
    'decide', 'decision', 'choose', 'option', 'alternative', 'consider',
    'evaluate', 'assess', 'determine', 'select', 'prioritize'
  ];

  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const decisionSentences: string[] = [];

  // Extract questions
  questionPatterns.forEach(pattern => {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim();
        if (cleaned.length > 10 && cleaned.length < 100) {
          decisionSentences.push(cleaned);
        }
      });
    }
  });

  // Extract sentences with decision keywords
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (decisionKeywords.some(keyword => lowerSentence.includes(keyword))) {
      const cleaned = sentence.trim();
      if (cleaned.length > 10 && cleaned.length < 100) {
        decisionSentences.push(cleaned + (cleaned.endsWith('?') ? '' : '?'));
      }
    }
  });

  // Remove duplicates and limit to reasonable number
  const uniqueDecisions = Array.from(new Set(decisionSentences));
  return uniqueDecisions.slice(0, 4).map(decision => 
    intelligentTruncate(decision, 15, { endWithCompleteSentence: false })
  );
}

/**
 * Generates action items from content
 */
export function generateActionItems(description?: string): string[] {
  if (!description) return [];

  const actionKeywords = [
    'implement', 'execute', 'develop', 'create', 'build', 'establish',
    'conduct', 'perform', 'schedule', 'plan', 'organize', 'coordinate',
    'research', 'investigate', 'analyze', 'review', 'assess', 'evaluate',
    'contact', 'reach out', 'follow up', 'communicate', 'discuss'
  ];

  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const actionSentences: string[] = [];

  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (actionKeywords.some(keyword => lowerSentence.includes(keyword))) {
      const cleaned = sentence.trim();
      if (cleaned.length > 10 && cleaned.length < 80) {
        // Convert to action format
        let action = cleaned;
        if (!action.toLowerCase().startsWith('conduct') && 
            !action.toLowerCase().startsWith('schedule') &&
            !action.toLowerCase().startsWith('implement')) {
          // Try to make it more action-oriented
          if (action.includes('need to') || action.includes('should')) {
            action = action.replace(/.*(?:need to|should)\s*/i, '');
          }
        }
        actionSentences.push(action);
      }
    }
  });

  // If no actions found, generate some generic ones based on content
  if (actionSentences.length === 0) {
    const genericActions = [];
    if (description.toLowerCase().includes('research')) {
      genericActions.push('Conduct further research');
    }
    if (description.toLowerCase().includes('meeting') || description.toLowerCase().includes('discuss')) {
      genericActions.push('Schedule stakeholder meeting');
    }
    if (description.toLowerCase().includes('analysis') || description.toLowerCase().includes('analyze')) {
      genericActions.push('Complete detailed analysis');
    }
    return genericActions.slice(0, 3);
  }

  // Remove duplicates and limit
  const uniqueActions = Array.from(new Set(actionSentences));
  return uniqueActions.slice(0, 4).map(action => 
    intelligentTruncate(action, 10, { endWithCompleteSentence: false })
  );
}

/**
 * Processes all content for a node according to the progressive disclosure tiers
 */
export function processNodeContent(node: Node): ProcessedContent {
  // DIAGNOSTIC LOGGING: Check what data is available for AI processing
  console.log('🔍 [TOOLTIP-DIAGNOSIS] Processing node content:', {
    nodeId: node.id,
    hasKeyMessage: !!node.key_message,
    hasKeynotePoints: !!(node.keynote_points && node.keynote_points.length > 0),
    hasDescription: !!node.description,
    descriptionLength: node.description?.length || 0,
    sourceAgent: node.source_agent,
    nodeType: node.type,
    keyMessagePreview: node.key_message?.substring(0, 50) + '...',
    keynotePointsCount: node.keynote_points?.length || 0,
    descriptionPreview: node.description?.substring(0, 100) + '...'
  });

  return {
    executiveSummary: generateExecutiveSummary(node.key_message, node.keynote_points),
    keyInsights: extractKeyInsights(node.keynote_points, 4),
    strategicAnalysis: generateStrategicAnalysis(node.description),
    decisionPoints: extractDecisionPoints(node.description),
    nextActions: generateActionItems(node.description)
  };
}

/**
 * Calculates optimal height for tooltip based on content and tier
 */
export function calculateOptimalHeight(content: ProcessedContent, tier: DisplayTier): number {
  const baseHeight = 280;
  const lineHeight = 20;
  const sectionSpacing = 16;
  
  switch (tier) {
    case 'quick':
      return Math.min(
        baseHeight + (content.keyInsights.length * lineHeight),
        320
      );
    case 'expanded':
      return Math.min(
        baseHeight + 
        (content.strategicAnalysis.length * 0.1) + 
        (content.decisionPoints.length * lineHeight) +
        (content.nextActions.length * lineHeight) +
        (sectionSpacing * 4),
        500
      );
    default:
      return baseHeight;
  }
}

/**
 * Calculates optimal width for tooltip based on content and tier
 */
export function calculateOptimalWidth(tier: DisplayTier): number {
  switch (tier) {
    case 'quick':
      return 340;
    case 'expanded':
      return 380;
    case 'modal':
      return 800;
    default:
      return 340;
  }
}