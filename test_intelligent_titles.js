// Test the new intelligent title generation
console.log('=== TESTING INTELLIGENT TITLE GENERATION ===');

// Simulate the new intelligent title generation function
function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function generateIntelligentTitle(text, maxLength = 25) {
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
  const foundTerms = [];
  const foundActions = [];
  
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

function generateShortTitle(title, description = '', maxLength = 25) {
  // If title is already short enough, return as-is
  if (title.length <= maxLength) {
    return title;
  }

  // First, try intelligent summarization
  const intelligentTitle = generateIntelligentTitle(title, maxLength);
  if (intelligentTitle && intelligentTitle.length <= maxLength) {
    return intelligentTitle;
  }

  // Fallback to truncation
  return title.substring(0, maxLength - 3) + '...';
}

// Test with the exact example from the user
console.log('\n=== USER EXAMPLE TEST ===');
const userExample = "It seems you've mentioned 'market,' however, your request lacks specific details…";
const result = generateShortTitle(userExample);
console.log('Input:', userExample);
console.log('Output:', result);
console.log('Expected: "Market Request"');
console.log('✓ Match:', result === 'Market Request');

// Test with the screenshot example
console.log('\n=== SCREENSHOT EXAMPLE TEST ===');
const screenshotExample = "To provide you with the most relevant strategic options, I'm going to need a bit more information about your...";
const result2 = generateShortTitle(screenshotExample);
console.log('Input:', screenshotExample);
console.log('Output:', result2);
console.log('Expected: "Strategic Options" or "Strategic Guidance"');

// Test with other examples
console.log('\n=== ADDITIONAL TESTS ===');
const testCases = [
  "Strategic analysis of market conditions and competitive landscape",
  "Implementation roadmap for new authentication system with enhanced security features",
  "Risk assessment and mitigation strategies for upcoming product launch",
  "We need to analyze the market data for Q4 planning",
  "Can you provide strategic recommendations for our expansion?"
];

testCases.forEach((test, i) => {
  const result = generateShortTitle(test);
  console.log(`\nTest ${i + 1}:`);
  console.log('Input:', test);
  console.log('Output:', result);
});

console.log('\n✅ Intelligent title generation testing complete!');