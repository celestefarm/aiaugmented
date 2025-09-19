"""
NLP-based title summarization service for intelligent node title generation.

This module provides local NLP algorithms for summarizing node titles based on
context and maximum length constraints. It uses keyword extraction, sentence
ranking, and pattern matching to create meaningful summaries.
"""

import re
from typing import Dict, List, Tuple, Optional
from enum import Enum


class SummarizationMethod(Enum):
    """Available summarization methods"""
    LOCAL = "local"
    FALLBACK = "fallback"


class TitleSummarizer:
    """
    Local NLP-based title summarization service.
    
    Implements various algorithms for intelligent title summarization:
    - Keyword extraction (nouns, verbs, adjectives)
    - Sentence ranking and selection
    - Pattern matching for common structures
    - Context-aware length optimization
    """
    
    # Common stop words to filter out
    STOP_WORDS = {
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
        'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
        'to', 'was', 'will', 'with', 'would', 'could', 'should', 'this',
        'these', 'those', 'they', 'them', 'their', 'there', 'where', 'when',
        'what', 'who', 'why', 'how', 'can', 'may', 'might', 'must', 'shall'
    }
    
    # Important keywords that should be preserved
    IMPORTANT_KEYWORDS = {
        'strategic', 'analysis', 'implementation', 'development', 'research',
        'assessment', 'evaluation', 'planning', 'design', 'architecture',
        'system', 'framework', 'solution', 'approach', 'methodology',
        'optimization', 'enhancement', 'improvement', 'innovation',
        'management', 'leadership', 'governance', 'compliance', 'security',
        'performance', 'scalability', 'reliability', 'availability',
        'integration', 'migration', 'transformation', 'modernization'
    }
    
    # Context-specific length limits
    CONTEXT_LIMITS = {
        'card': 25,
        'tooltip': 40,
        'list': 30,
        'default': 35
    }
    
    def __init__(self):
        """Initialize the title summarizer"""
        pass
    
    def summarize_title(
        self, 
        full_text: str, 
        context: str = 'default', 
        max_length: Optional[int] = None
    ) -> Dict[str, str]:
        """
        Generate a summarized title using local NLP algorithms.
        
        Args:
            full_text: The original full text/title to summarize
            context: Context for the summary ('card', 'tooltip', 'list', 'default')
            max_length: Maximum length override (uses context default if None)
            
        Returns:
            Dictionary containing:
            - summarized_title: The generated summary
            - method_used: 'local' or 'fallback'
            - confidence: Confidence score (0-100)
        """
        if not full_text or not full_text.strip():
            return {
                'summarized_title': '',
                'method_used': SummarizationMethod.FALLBACK.value,
                'confidence': 0
            }
        
        # Determine target length
        target_length = max_length or self.CONTEXT_LIMITS.get(context, self.CONTEXT_LIMITS['default'])
        
        # If already short enough, return as-is
        if len(full_text) <= target_length:
            return {
                'summarized_title': full_text,
                'method_used': SummarizationMethod.LOCAL.value,
                'confidence': 100
            }
        
        # Try different summarization strategies
        strategies = [
            self._extract_key_phrases,
            self._sentence_based_summary,
            self._keyword_extraction_summary,
            self._pattern_based_summary
        ]
        
        best_summary = None
        best_confidence = 0
        
        for strategy in strategies:
            try:
                summary, confidence = strategy(full_text, target_length)
                if summary and confidence > best_confidence:
                    best_summary = summary
                    best_confidence = confidence
            except Exception:
                continue
        
        # Fallback to intelligent truncation if no strategy worked
        if not best_summary or best_confidence < 30:
            best_summary = self._intelligent_truncation(full_text, target_length)
            method = SummarizationMethod.FALLBACK.value
            best_confidence = max(best_confidence, 50)
        else:
            method = SummarizationMethod.LOCAL.value
        
        return {
            'summarized_title': best_summary,
            'method_used': method,
            'confidence': best_confidence
        }
    
    def _extract_key_phrases(self, text: str, max_length: int) -> Tuple[str, int]:
        """
        Extract key phrases using noun-verb-adjective patterns.
        
        Args:
            text: Input text
            max_length: Maximum length for result
            
        Returns:
            Tuple of (summary, confidence_score)
        """
        # Clean and tokenize
        words = self._tokenize_and_clean(text)
        if not words:
            return "", 0
        
        # Extract important words
        important_words = []
        for word in words:
            word_lower = word.lower()
            if (word_lower in self.IMPORTANT_KEYWORDS or 
                self._is_likely_important(word) or
                len(word) > 6):  # Longer words often more meaningful
                important_words.append(word)
        
        # Build summary from important words
        if important_words:
            summary = self._build_phrase_from_words(important_words, max_length)
            confidence = min(90, len(important_words) * 15)
            return summary, confidence
        
        return "", 0
    
    def _sentence_based_summary(self, text: str, max_length: int) -> Tuple[str, int]:
        """
        Create summary by selecting the best sentence or sentence fragment.
        
        Args:
            text: Input text
            max_length: Maximum length for result
            
        Returns:
            Tuple of (summary, confidence_score)
        """
        # Split into sentences
        sentences = re.split(r'[.!?]+', text.strip())
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return "", 0
        
        # Find the best sentence that fits
        best_sentence = ""
        best_score = 0
        
        for sentence in sentences:
            if len(sentence) <= max_length:
                score = self._score_sentence(sentence)
                if score > best_score:
                    best_sentence = sentence
                    best_score = score
        
        if best_sentence:
            return best_sentence, min(85, best_score)
        
        # Try first sentence with intelligent truncation
        if sentences:
            truncated = self._intelligent_truncation(sentences[0], max_length)
            return truncated, 60
        
        return "", 0
    
    def _keyword_extraction_summary(self, text: str, max_length: int) -> Tuple[str, int]:
        """
        Extract and combine the most important keywords.
        
        Args:
            text: Input text
            max_length: Maximum length for result
            
        Returns:
            Tuple of (summary, confidence_score)
        """
        words = self._tokenize_and_clean(text)
        if not words:
            return "", 0
        
        # Score words by importance
        word_scores = {}
        for word in words:
            score = self._score_word_importance(word)
            if score > 0:
                word_scores[word] = score
        
        # Sort by score and build summary
        sorted_words = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)
        
        summary_words = []
        current_length = 0
        
        for word, score in sorted_words:
            if current_length + len(word) + 1 <= max_length:
                summary_words.append(word)
                current_length += len(word) + 1
            else:
                break
        
        if summary_words:
            summary = " ".join(summary_words)
            confidence = min(80, len(summary_words) * 10)
            return summary, confidence
        
        return "", 0
    
    def _pattern_based_summary(self, text: str, max_length: int) -> Tuple[str, int]:
        """
        Use pattern matching for common title structures.
        
        Args:
            text: Input text
            max_length: Maximum length for result
            
        Returns:
            Tuple of (summary, confidence_score)
        """
        # Common patterns in titles
        patterns = [
            # "X for Y" -> "X for Y"
            (r'^(.+?)\s+for\s+(.+?)(?:\s|$)', lambda m: f"{m.group(1)} for {m.group(2)}"),
            # "X and Y analysis" -> "X & Y analysis"
            (r'^(.+?)\s+and\s+(.+?)\s+(analysis|assessment|evaluation)', 
             lambda m: f"{m.group(1)} & {m.group(2)} {m.group(3)}"),
            # "Implementation of X" -> "X implementation"
            (r'^Implementation\s+of\s+(.+)', lambda m: f"{m.group(1)} implementation"),
            # "Analysis of X" -> "X analysis"
            (r'^Analysis\s+of\s+(.+)', lambda m: f"{m.group(1)} analysis"),
        ]
        
        for pattern, transform in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    result = transform(match)
                    if len(result) <= max_length:
                        return result, 75
                except Exception:
                    continue
        
        return "", 0
    
    def _intelligent_truncation(self, text: str, max_length: int) -> str:
        """
        Perform intelligent truncation that preserves meaning.
        
        Args:
            text: Input text
            max_length: Maximum length for result
            
        Returns:
            Intelligently truncated text
        """
        if len(text) <= max_length:
            return text
        
        # Try to truncate at word boundaries
        words = text.split()
        result = ""
        
        for word in words:
            if len(result) + len(word) + 1 <= max_length - 3:  # Reserve space for "..."
                if result:
                    result += " "
                result += word
            else:
                break
        
        if result and len(result) < len(text):
            return result + "..."
        
        # Fallback to character truncation
        return text[:max_length-3] + "..."
    
    def _tokenize_and_clean(self, text: str) -> List[str]:
        """Clean and tokenize text into words."""
        # Remove special characters but keep alphanumeric and spaces
        cleaned = re.sub(r'[^\w\s-]', ' ', text)
        # Split into words and filter
        words = [w.strip() for w in cleaned.split() if w.strip()]
        # Filter out stop words and very short words
        return [w for w in words if len(w) > 2 and w.lower() not in self.STOP_WORDS]
    
    def _is_likely_important(self, word: str) -> bool:
        """Determine if a word is likely important based on patterns."""
        word_lower = word.lower()
        
        # Check if it's a known important keyword
        if word_lower in self.IMPORTANT_KEYWORDS:
            return True
        
        # Capitalized words (proper nouns) are often important
        if word[0].isupper() and len(word) > 3:
            return True
        
        # Words ending in common important suffixes
        important_suffixes = ['tion', 'sion', 'ment', 'ness', 'ity', 'ing', 'ed']
        if any(word_lower.endswith(suffix) for suffix in important_suffixes):
            return True
        
        return False
    
    def _score_word_importance(self, word: str) -> int:
        """Score a word's importance (0-100)."""
        score = 0
        word_lower = word.lower()
        
        # Base score for length (longer words often more meaningful)
        score += min(20, len(word) * 2)
        
        # Bonus for important keywords
        if word_lower in self.IMPORTANT_KEYWORDS:
            score += 40
        
        # Bonus for capitalization (proper nouns)
        if word[0].isupper():
            score += 15
        
        # Bonus for technical/business terms
        if any(suffix in word_lower for suffix in ['tion', 'sion', 'ment', 'ness', 'ity']):
            score += 10
        
        return min(100, score)
    
    def _score_sentence(self, sentence: str) -> int:
        """Score a sentence's importance (0-100)."""
        words = self._tokenize_and_clean(sentence)
        if not words:
            return 0
        
        # Base score
        score = 30
        
        # Bonus for important words
        important_word_count = sum(1 for word in words if self._is_likely_important(word))
        score += important_word_count * 10
        
        # Bonus for optimal length (not too short, not too long)
        if 3 <= len(words) <= 8:
            score += 20
        
        # Penalty for very short or very long sentences
        if len(words) < 2:
            score -= 20
        elif len(words) > 12:
            score -= 10
        
        return min(100, max(0, score))
    
    def _build_phrase_from_words(self, words: List[str], max_length: int) -> str:
        """Build a meaningful phrase from important words."""
        if not words:
            return ""
        
        # Try to maintain some original order while prioritizing important words
        result_words = []
        current_length = 0
        
        for word in words:
            if current_length + len(word) + (1 if result_words else 0) <= max_length:
                result_words.append(word)
                current_length += len(word) + (1 if len(result_words) > 1 else 0)
            else:
                break
        
        return " ".join(result_words)


# Global instance for easy access
title_summarizer = TitleSummarizer()


def summarize_node_title(
    full_text: str, 
    context: str = 'default', 
    max_length: Optional[int] = None
) -> Dict[str, str]:
    """
    Convenience function to summarize a node title.
    
    Args:
        full_text: The original full text/title to summarize
        context: Context for the summary ('card', 'tooltip', 'list', 'default')
        max_length: Maximum length override
        
    Returns:
        Dictionary containing summarized_title, method_used, and confidence
    """
    return title_summarizer.summarize_title(full_text, context, max_length)