import { generateDisplayTitle, generateShortTitle, extractKeyPhrases } from './nodeUtils';

// Test cases for the title generation functions
const testCases = [
  {
    title: "This is a very long title that should be truncated because it exceeds the maximum length limit",
    description: "Some description",
    expected: {
      card: "This is a very long title...",
      tooltip: "This is a very long title that should be...",
      list: "This is a very long title that..."
    }
  },
  {
    title: "Short title",
    description: "Some description",
    expected: {
      card: "Short title",
      tooltip: "Short title", 
      list: "Short title"
    }
  },
  {
    title: "This is a sentence. This is another sentence that should be cut off.",
    description: "Some description",
    expected: {
      card: "This is a sentence...",
      tooltip: "This is a sentence. This is another...",
      list: "This is a sentence..."
    }
  },
  {
    title: "Strategic analysis of market conditions, competitive landscape, and growth opportunities",
    description: "Detailed analysis",
    expected: {
      card: "Strategic analysis of...",
      tooltip: "Strategic analysis of market conditions...",
      list: "Strategic analysis of market..."
    }
  }
];

// Manual test function (since we can't run jest in this environment)
function runTests() {
  console.log('=== Node Utils Tests ===\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`Test Case ${index + 1}:`);
    console.log(`Original: "${testCase.title}"`);
    
    const cardResult = generateDisplayTitle(testCase.title, testCase.description, 'card');
    const tooltipResult = generateDisplayTitle(testCase.title, testCase.description, 'tooltip');
    const listResult = generateDisplayTitle(testCase.title, testCase.description, 'list');
    
    console.log(`Card (≤25): "${cardResult}" (${cardResult.length} chars)`);
    console.log(`Tooltip (≤40): "${tooltipResult}" (${tooltipResult.length} chars)`);
    console.log(`List (≤30): "${listResult}" (${listResult.length} chars)`);
    
    // Check if results meet length requirements
    const cardPass = cardResult.length <= 25;
    const tooltipPass = tooltipResult.length <= 40;
    const listPass = listResult.length <= 30;
    
    console.log(`✓ Card length OK: ${cardPass}`);
    console.log(`✓ Tooltip length OK: ${tooltipPass}`);
    console.log(`✓ List length OK: ${listPass}`);
    console.log('---\n');
  });
  
  // Test key phrase extraction
  console.log('=== Key Phrase Extraction Tests ===\n');
  
  const phraseTests = [
    "Strategic analysis of market conditions and competitive landscape in the technology sector",
    "Implementation of new user authentication system with enhanced security features",
    "Risk assessment for the upcoming product launch in Q4 2024"
  ];
  
  phraseTests.forEach((text, index) => {
    console.log(`Phrase Test ${index + 1}:`);
    console.log(`Text: "${text}"`);
    const phrases = extractKeyPhrases(text, 3);
    console.log(`Key phrases: ${phrases.join(', ')}`);
    console.log('---\n');
  });
}

// Export the test function so it can be called
export { runTests };

// Test data for manual verification
export const testData = {
  longTitle: "This is an extremely long node title that contains a lot of detailed information about the strategic analysis and implementation plan for the new system architecture",
  mediumTitle: "Strategic analysis of market conditions and competitive landscape",
  shortTitle: "User authentication",
  sentenceTitle: "First sentence here. Second sentence that should be truncated. Third sentence.",
  commaTitle: "Strategic planning, market analysis, competitive research, implementation roadmap"
};

console.log('Node Utils test file created. Run runTests() to execute manual tests.');