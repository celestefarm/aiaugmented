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


class ConversationSummarizer:
    """
    Conversation summarization service for generating key messages and keynote points.
    
    This class provides methods to analyze conversation text and extract:
    - Key Message: A concise 2-line summary capturing the main takeaway
    - Keynote Points: 3-5 bullet points highlighting important discussion points
    """
    
    # Keywords that indicate important conversation topics
    CONVERSATION_KEYWORDS = {
        'strategic', 'analysis', 'planning', 'implementation', 'assessment',
        'evaluation', 'research', 'development', 'solution', 'approach',
        'methodology', 'framework', 'system', 'process', 'workflow',
        'requirements', 'objectives', 'goals', 'targets', 'outcomes',
        'challenges', 'opportunities', 'risks', 'issues', 'problems',
        'recommendations', 'suggestions', 'proposals', 'ideas', 'concepts',
        'insights', 'findings', 'conclusions', 'results', 'impact',
        'benefits', 'advantages', 'disadvantages', 'limitations', 'constraints'
    }
    
    # Phrases that often introduce important points
    IMPORTANT_PHRASES = {
        'key point', 'important', 'critical', 'essential', 'crucial',
        'significant', 'major', 'primary', 'main', 'core', 'fundamental',
        'however', 'therefore', 'consequently', 'as a result', 'in conclusion',
        'to summarize', 'in summary', 'overall', 'ultimately', 'finally',
        'most importantly', 'notably', 'specifically', 'particularly'
    }
    
    def __init__(self):
        """Initialize the conversation summarizer"""
        pass
    
    def summarize_conversation(self, conversation_text: str) -> Dict[str, any]:
        """
        Generate both key message and keynote points from conversation text.
        
        Args:
            conversation_text: The full conversation text to summarize
            
        Returns:
            Dictionary containing:
            - key_message: Concise 2-line summary
            - keynote_points: List of 3-5 bullet points
            - confidence: Overall confidence score (0-100)
            - method_used: Summarization method used
        """
        if not conversation_text or not conversation_text.strip():
            return {
                'key_message': '',
                'keynote_points': [],
                'confidence': 0,
                'method_used': 'fallback'
            }
        
        try:
            # Generate key message
            key_message = self._generate_key_message(conversation_text)
            
            # Generate keynote points
            keynote_points = self._generate_keynote_points(conversation_text)
            
            # Calculate confidence based on content quality
            confidence = self._calculate_confidence(conversation_text, key_message, keynote_points)
            
            return {
                'key_message': key_message,
                'keynote_points': keynote_points,
                'confidence': confidence,
                'method_used': 'local_nlp'
            }
            
        except Exception as e:
            # Fallback to simple extraction
            return self._fallback_summarization(conversation_text)
    
    def _generate_key_message(self, text: str) -> str:
        """
        Generate a concise 2-line key message from conversation text.
        
        Args:
            text: Input conversation text
            
        Returns:
            Key message string (max 2 lines)
        """
        # Split into sentences and clean
        sentences = self._split_into_sentences(text)
        if not sentences:
            return "No clear message identified."
        
        # Score sentences by importance
        scored_sentences = []
        for sentence in sentences:
            score = self._score_sentence_importance(sentence)
            if score > 30:  # Only consider reasonably important sentences
                scored_sentences.append((sentence, score))
        
        # Sort by score and select best sentences
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        
        if not scored_sentences:
            # Fallback to first meaningful sentence
            for sentence in sentences[:3]:
                if len(sentence.strip()) > 20:
                    return self._format_key_message([sentence])
            return "More context needed for tailored strategy."
        
        # Try to create a 2-line message from top sentences
        selected_sentences = []
        total_length = 0
        max_length = 160  # Reasonable limit for 2 lines
        
        for sentence, score in scored_sentences:
            if total_length + len(sentence) + 1 <= max_length and len(selected_sentences) < 2:
                selected_sentences.append(sentence)
                total_length += len(sentence) + 1
            elif len(selected_sentences) >= 2:
                break
        
        if not selected_sentences:
            selected_sentences = [scored_sentences[0][0]]
        
        return self._format_key_message(selected_sentences)
    
    def _generate_keynote_points(self, text: str) -> List[str]:
        """
        Generate 3-5 keynote bullet points from conversation text.
        
        Args:
            text: Input conversation text
            
        Returns:
            List of keynote points (3-5 items)
        """
        # Split into sentences and analyze
        sentences = self._split_into_sentences(text)
        if not sentences:
            return ["Lacks specific details on market scope", "Cannot propose targeted strategies without context"]
        
        # Extract key topics and themes
        key_topics = self._extract_key_topics(text)
        important_sentences = self._find_important_sentences(sentences)
        
        # Generate points from different sources
        keynote_points = []
        
        # Add topic-based points
        for topic in key_topics[:2]:
            point = self._create_topic_point(topic, text)
            if point and point not in keynote_points:
                keynote_points.append(point)
        
        # Add sentence-based points
        for sentence in important_sentences[:3]:
            point = self._create_sentence_point(sentence)
            if point and point not in keynote_points and len(keynote_points) < 5:
                keynote_points.append(point)
        
        # Ensure we have at least 3 points
        if len(keynote_points) < 3:
            fallback_points = [
                "Requires additional context for comprehensive analysis",
                "Strategic direction depends on specific objectives",
                "Implementation approach needs further clarification"
            ]
            for point in fallback_points:
                if point not in keynote_points and len(keynote_points) < 5:
                    keynote_points.append(point)
        
        # Limit to 3-5 points
        return keynote_points[:5]
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into clean sentences."""
        # Split on sentence boundaries
        sentences = re.split(r'[.!?]+', text)
        
        # Clean and filter sentences
        clean_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 10:  # Filter out very short fragments
                clean_sentences.append(sentence)
        
        return clean_sentences
    
    def _score_sentence_importance(self, sentence: str) -> int:
        """Score a sentence's importance for key message extraction."""
        score = 0
        sentence_lower = sentence.lower()
        
        # Base score for reasonable length
        if 20 <= len(sentence) <= 150:
            score += 30
        
        # Bonus for conversation keywords
        keyword_count = sum(1 for keyword in self.CONVERSATION_KEYWORDS
                          if keyword in sentence_lower)
        score += keyword_count * 10
        
        # Bonus for important phrases
        phrase_count = sum(1 for phrase in self.IMPORTANT_PHRASES
                         if phrase in sentence_lower)
        score += phrase_count * 15
        
        # Bonus for questions (often indicate key issues)
        if '?' in sentence:
            score += 10
        
        # Penalty for very long sentences (harder to use as key message)
        if len(sentence) > 200:
            score -= 20
        
        return min(100, max(0, score))
    
    def _extract_key_topics(self, text: str) -> List[str]:
        """Extract key topics from the conversation."""
        text_lower = text.lower()
        found_topics = []
        
        # Look for conversation keywords
        for keyword in self.CONVERSATION_KEYWORDS:
            if keyword in text_lower:
                # Try to extract context around the keyword
                pattern = rf'\b\w*{keyword}\w*\b'
                matches = re.findall(pattern, text_lower)
                for match in matches:
                    if match not in found_topics:
                        found_topics.append(match)
        
        # Sort by frequency and importance
        topic_scores = {}
        for topic in found_topics:
            count = text_lower.count(topic)
            importance = 2 if topic in self.CONVERSATION_KEYWORDS else 1
            topic_scores[topic] = count * importance
        
        # Return top topics
        sorted_topics = sorted(topic_scores.items(), key=lambda x: x[1], reverse=True)
        return [topic for topic, score in sorted_topics[:5]]
    
    def _find_important_sentences(self, sentences: List[str]) -> List[str]:
        """Find the most important sentences for keynote points."""
        scored_sentences = []
        
        for sentence in sentences:
            score = self._score_sentence_importance(sentence)
            if score > 40:  # Higher threshold for keynote points
                scored_sentences.append((sentence, score))
        
        # Sort by score and return top sentences
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        return [sentence for sentence, score in scored_sentences[:5]]
    
    def _create_topic_point(self, topic: str, text: str) -> str:
        """Create a keynote point based on a key topic."""
        topic_patterns = {
            'strategic': 'Strategic approach requires further definition',
            'analysis': 'Analysis scope needs clarification',
            'planning': 'Planning framework requires specific objectives',
            'implementation': 'Implementation strategy depends on context',
            'assessment': 'Assessment criteria need to be established',
            'requirements': 'Requirements gathering is incomplete',
            'challenges': 'Key challenges have been identified',
            'opportunities': 'Potential opportunities require evaluation',
            'risks': 'Risk factors need comprehensive analysis'
        }
        
        # Try to find a specific pattern for the topic
        for pattern_key, point_template in topic_patterns.items():
            if pattern_key in topic.lower():
                return point_template
        
        # Generic topic-based point
        return f"Focus on {topic} requires additional context"
    
    def _create_sentence_point(self, sentence: str) -> str:
        """Create a keynote point from an important sentence."""
        # Truncate if too long
        if len(sentence) > 80:
            # Try to find a good breaking point
            words = sentence.split()
            truncated_words = []
            current_length = 0
            
            for word in words:
                if current_length + len(word) + 1 <= 77:  # Reserve space for "..."
                    truncated_words.append(word)
                    current_length += len(word) + 1
                else:
                    break
            
            if truncated_words:
                return " ".join(truncated_words) + "..."
        
        return sentence
    
    def _format_key_message(self, sentences: List[str]) -> str:
        """Format sentences into a proper key message."""
        if not sentences:
            return "More context needed for tailored strategy."
        
        # Join sentences with proper spacing
        message = ". ".join(sentence.strip().rstrip('.') for sentence in sentences)
        
        # Ensure it ends with a period
        if not message.endswith('.'):
            message += '.'
        
        return message
    
    def _calculate_confidence(self, text: str, key_message: str, keynote_points: List[str]) -> int:
        """Calculate confidence score for the summarization."""
        confidence = 50  # Base confidence
        
        # Bonus for text length (more content = better analysis)
        if len(text) > 200:
            confidence += 20
        elif len(text) > 100:
            confidence += 10
        
        # Bonus for keyword density
        keyword_count = sum(1 for keyword in self.CONVERSATION_KEYWORDS
                          if keyword in text.lower())
        confidence += min(20, keyword_count * 3)
        
        # Bonus for quality key message
        if key_message and len(key_message) > 20:
            confidence += 10
        
        # Bonus for good number of keynote points
        if 3 <= len(keynote_points) <= 5:
            confidence += 10
        
        return min(100, confidence)
    
    def _fallback_summarization(self, text: str) -> Dict[str, any]:
        """Fallback summarization when main algorithm fails."""
        # Simple fallback key message
        sentences = self._split_into_sentences(text)
        if sentences:
            key_message = sentences[0][:160] + ("..." if len(sentences[0]) > 160 else "")
        else:
            key_message = "More context needed for tailored strategy."
        
        # Simple fallback keynote points
        keynote_points = [
            "Lacks specific details on market scope",
            "Cannot propose targeted strategies without context",
            "Requires additional information for comprehensive analysis"
        ]
        
        return {
            'key_message': key_message,
            'keynote_points': keynote_points,
            'confidence': 30,
            'method_used': 'fallback'
        }


# Global instance for conversation summarization
conversation_summarizer = ConversationSummarizer()


def summarize_conversation(conversation_text: str) -> Dict[str, any]:
    """
    Convenience function to summarize a conversation.
    
    Args:
        conversation_text: The full conversation text to summarize
        
    Returns:
        Dictionary containing key_message, keynote_points, confidence, and method_used
    """
    return conversation_summarizer.summarize_conversation(conversation_text)