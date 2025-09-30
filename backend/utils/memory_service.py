"""
Memory Service for Strategic Analysis
Manages session memory, context retention, and knowledge persistence
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, asdict
from collections import defaultdict, deque

from backend.database_memory import get_database
from bson import ObjectId

logger = logging.getLogger(__name__)


class MemoryType(Enum):
    """Types of memory stored in the system"""
    SESSION_CONTEXT = "session_context"
    USER_PREFERENCES = "user_preferences"
    STRATEGIC_PATTERNS = "strategic_patterns"
    DECISION_HISTORY = "decision_history"
    EVIDENCE_CACHE = "evidence_cache"
    INTERACTION_HISTORY = "interaction_history"
    COGNITIVE_PROFILE = "cognitive_profile"


class MemoryPriority(Enum):
    """Priority levels for memory retention"""
    CRITICAL = "critical"  # Never expires, always retained
    HIGH = "high"         # Long retention period
    MEDIUM = "medium"     # Standard retention
    LOW = "low"          # Short retention, first to be cleaned


@dataclass
class MemoryItem:
    """Individual memory item with metadata"""
    id: str
    user_id: str
    session_id: Optional[str]
    memory_type: MemoryType
    content: Dict[str, Any]
    priority: MemoryPriority
    created_at: datetime
    last_accessed: datetime
    access_count: int
    expires_at: Optional[datetime]
    tags: List[str]
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database storage"""
        data = asdict(self)
        data['memory_type'] = self.memory_type.value
        data['priority'] = self.priority.value
        data['created_at'] = self.created_at.isoformat()
        data['last_accessed'] = self.last_accessed.isoformat()
        if self.expires_at:
            data['expires_at'] = self.expires_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MemoryItem':
        """Create from dictionary"""
        data['memory_type'] = MemoryType(data['memory_type'])
        data['priority'] = MemoryPriority(data['priority'])
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        data['last_accessed'] = datetime.fromisoformat(data['last_accessed'])
        if data.get('expires_at'):
            data['expires_at'] = datetime.fromisoformat(data['expires_at'])
        return cls(**data)


class MemoryService:
    """Advanced memory management service for strategic analysis"""
    
    def __init__(self):
        self.cache: Dict[str, MemoryItem] = {}
        self.user_sessions: Dict[str, List[str]] = defaultdict(list)
        self.recent_access: deque = deque(maxlen=1000)
        
        # Memory retention policies (in days)
        self.retention_policies = {
            MemoryPriority.CRITICAL: None,  # Never expires
            MemoryPriority.HIGH: 90,
            MemoryPriority.MEDIUM: 30,
            MemoryPriority.LOW: 7
        }
        
        # Cache size limits
        self.max_cache_size = 10000
        self.cleanup_threshold = 0.8  # Clean when 80% full

    async def store_memory(self, 
                          user_id: str,
                          memory_type: MemoryType,
                          content: Dict[str, Any],
                          session_id: Optional[str] = None,
                          priority: MemoryPriority = MemoryPriority.MEDIUM,
                          tags: List[str] = None,
                          metadata: Dict[str, Any] = None) -> str:
        """Store a memory item"""
        try:
            memory_id = f"{memory_type.value}_{user_id}_{int(datetime.utcnow().timestamp() * 1000)}"
            
            # Calculate expiration
            expires_at = None
            if self.retention_policies[priority] is not None:
                expires_at = datetime.utcnow() + timedelta(days=self.retention_policies[priority])
            
            memory_item = MemoryItem(
                id=memory_id,
                user_id=user_id,
                session_id=session_id,
                memory_type=memory_type,
                content=content,
                priority=priority,
                created_at=datetime.utcnow(),
                last_accessed=datetime.utcnow(),
                access_count=1,
                expires_at=expires_at,
                tags=tags or [],
                metadata=metadata or {}
            )
            
            # Store in cache
            self.cache[memory_id] = memory_item
            self.user_sessions[user_id].append(memory_id)
            
            # Store in database
            database = get_database()
            if database:
                await database.memory_items.insert_one(memory_item.to_dict())
            
            # Trigger cleanup if needed
            if len(self.cache) > self.max_cache_size * self.cleanup_threshold:
                await self._cleanup_cache()
            
            logger.info(f"Stored memory item {memory_id} for user {user_id}")
            return memory_id
            
        except Exception as e:
            logger.error(f"Error storing memory: {str(e)}")
            raise

    async def retrieve_memory(self, 
                             memory_id: str,
                             user_id: str) -> Optional[MemoryItem]:
        """Retrieve a specific memory item"""
        try:
            # Check cache first
            if memory_id in self.cache:
                memory_item = self.cache[memory_id]
                if memory_item.user_id == user_id:
                    await self._update_access(memory_item)
                    return memory_item
            
            # Check database
            database = get_database()
            if database:
                memory_doc = await database.memory_items.find_one({
                    "id": memory_id,
                    "user_id": user_id
                })
                
                if memory_doc:
                    memory_item = MemoryItem.from_dict(memory_doc)
                    
                    # Check if expired
                    if memory_item.expires_at and memory_item.expires_at < datetime.utcnow():
                        await self.delete_memory(memory_id, user_id)
                        return None
                    
                    # Update cache and access
                    self.cache[memory_id] = memory_item
                    await self._update_access(memory_item)
                    return memory_item
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving memory {memory_id}: {str(e)}")
            return None

    async def search_memories(self,
                             user_id: str,
                             memory_type: Optional[MemoryType] = None,
                             session_id: Optional[str] = None,
                             tags: List[str] = None,
                             content_query: Optional[str] = None,
                             limit: int = 50) -> List[MemoryItem]:
        """Search for memory items based on criteria"""
        try:
            database = get_database()
            if not database:
                return []
            
            # Build query
            query = {"user_id": user_id}
            
            if memory_type:
                query["memory_type"] = memory_type.value
            
            if session_id:
                query["session_id"] = session_id
            
            if tags:
                query["tags"] = {"$in": tags}
            
            # Add content search if provided
            if content_query:
                query["$text"] = {"$search": content_query}
            
            # Execute query
            cursor = database.memory_items.find(query).sort("last_accessed", -1).limit(limit)
            memory_docs = await cursor.to_list(length=limit)
            
            memories = []
            current_time = datetime.utcnow()
            
            for doc in memory_docs:
                memory_item = MemoryItem.from_dict(doc)
                
                # Skip expired items
                if memory_item.expires_at and memory_item.expires_at < current_time:
                    continue
                
                memories.append(memory_item)
                
                # Update cache
                self.cache[memory_item.id] = memory_item
            
            return memories
            
        except Exception as e:
            logger.error(f"Error searching memories: {str(e)}")
            return []

    async def get_session_context(self, 
                                 user_id: str, 
                                 session_id: str) -> Dict[str, Any]:
        """Get comprehensive context for a session"""
        try:
            memories = await self.search_memories(
                user_id=user_id,
                session_id=session_id,
                limit=100
            )
            
            context = {
                "session_id": session_id,
                "user_id": user_id,
                "total_memories": len(memories),
                "memory_types": {},
                "key_insights": [],
                "decision_patterns": [],
                "evidence_summary": {},
                "interaction_summary": {},
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Organize by memory type
            for memory in memories:
                memory_type = memory.memory_type.value
                if memory_type not in context["memory_types"]:
                    context["memory_types"][memory_type] = []
                context["memory_types"][memory_type].append({
                    "id": memory.id,
                    "content": memory.content,
                    "created_at": memory.created_at.isoformat(),
                    "tags": memory.tags
                })
            
            # Extract key insights
            strategic_memories = [m for m in memories if m.memory_type == MemoryType.STRATEGIC_PATTERNS]
            for memory in strategic_memories[:5]:  # Top 5 strategic insights
                context["key_insights"].append(memory.content)
            
            # Extract decision patterns
            decision_memories = [m for m in memories if m.memory_type == MemoryType.DECISION_HISTORY]
            for memory in decision_memories[:3]:  # Recent decisions
                context["decision_patterns"].append(memory.content)
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting session context: {str(e)}")
            return {}

    async def get_user_cognitive_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user's cognitive profile from memory"""
        try:
            memories = await self.search_memories(
                user_id=user_id,
                memory_type=MemoryType.COGNITIVE_PROFILE,
                limit=10
            )
            
            if not memories:
                return self._create_default_cognitive_profile(user_id)
            
            # Get most recent profile
            latest_memory = max(memories, key=lambda m: m.last_accessed)
            profile = latest_memory.content.copy()
            
            # Enhance with historical data
            profile["profile_history"] = [
                {
                    "timestamp": m.created_at.isoformat(),
                    "data": m.content
                } for m in sorted(memories, key=lambda m: m.created_at, reverse=True)[:5]
            ]
            
            return profile
            
        except Exception as e:
            logger.error(f"Error getting cognitive profile: {str(e)}")
            return self._create_default_cognitive_profile(user_id)

    async def update_cognitive_profile(self, 
                                     user_id: str, 
                                     analysis_data: Dict[str, Any]) -> None:
        """Update user's cognitive profile with new analysis"""
        try:
            current_profile = await self.get_user_cognitive_profile(user_id)
            
            # Merge new analysis data
            updated_profile = self._merge_cognitive_data(current_profile, analysis_data)
            
            # Store updated profile
            await self.store_memory(
                user_id=user_id,
                memory_type=MemoryType.COGNITIVE_PROFILE,
                content=updated_profile,
                priority=MemoryPriority.HIGH,
                tags=["cognitive", "profile", "analysis"],
                metadata={"analysis_timestamp": datetime.utcnow().isoformat()}
            )
            
        except Exception as e:
            logger.error(f"Error updating cognitive profile: {str(e)}")

    async def store_strategic_pattern(self,
                                    user_id: str,
                                    session_id: str,
                                    pattern_data: Dict[str, Any]) -> str:
        """Store a strategic pattern or insight"""
        return await self.store_memory(
            user_id=user_id,
            memory_type=MemoryType.STRATEGIC_PATTERNS,
            content=pattern_data,
            session_id=session_id,
            priority=MemoryPriority.HIGH,
            tags=["strategic", "pattern", "insight"],
            metadata={"pattern_type": pattern_data.get("type", "general")}
        )

    async def store_decision_record(self,
                                  user_id: str,
                                  session_id: str,
                                  decision_data: Dict[str, Any]) -> str:
        """Store a decision record"""
        return await self.store_memory(
            user_id=user_id,
            memory_type=MemoryType.DECISION_HISTORY,
            content=decision_data,
            session_id=session_id,
            priority=MemoryPriority.HIGH,
            tags=["decision", "history", "outcome"],
            metadata={"decision_type": decision_data.get("type", "strategic")}
        )

    async def cache_evidence(self,
                           user_id: str,
                           session_id: str,
                           evidence_data: Dict[str, Any]) -> str:
        """Cache evidence for quick retrieval"""
        return await self.store_memory(
            user_id=user_id,
            memory_type=MemoryType.EVIDENCE_CACHE,
            content=evidence_data,
            session_id=session_id,
            priority=MemoryPriority.MEDIUM,
            tags=["evidence", "cache", evidence_data.get("quality", "medium")],
            metadata={"evidence_type": evidence_data.get("type", "qualitative")}
        )

    async def delete_memory(self, memory_id: str, user_id: str) -> bool:
        """Delete a memory item"""
        try:
            # Remove from cache
            if memory_id in self.cache:
                del self.cache[memory_id]
            
            # Remove from user sessions
            if user_id in self.user_sessions:
                self.user_sessions[user_id] = [
                    mid for mid in self.user_sessions[user_id] if mid != memory_id
                ]
            
            # Remove from database
            database = get_database()
            if database:
                result = await database.memory_items.delete_one({
                    "id": memory_id,
                    "user_id": user_id
                })
                return result.deleted_count > 0
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting memory {memory_id}: {str(e)}")
            return False

    async def cleanup_expired_memories(self) -> int:
        """Clean up expired memories"""
        try:
            current_time = datetime.utcnow()
            database = get_database()
            
            if not database:
                return 0
            
            # Find expired memories
            expired_query = {
                "expires_at": {"$lt": current_time.isoformat()}
            }
            
            expired_docs = await database.memory_items.find(expired_query).to_list(length=None)
            
            # Remove from cache
            for doc in expired_docs:
                memory_id = doc["id"]
                if memory_id in self.cache:
                    del self.cache[memory_id]
            
            # Remove from database
            result = await database.memory_items.delete_many(expired_query)
            
            logger.info(f"Cleaned up {result.deleted_count} expired memories")
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired memories: {str(e)}")
            return 0

    async def get_memory_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get memory usage statistics for a user"""
        try:
            database = get_database()
            if not database:
                return {}
            
            # Aggregate statistics
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": "$memory_type",
                    "count": {"$sum": 1},
                    "total_access": {"$sum": "$access_count"},
                    "avg_access": {"$avg": "$access_count"},
                    "latest": {"$max": "$last_accessed"}
                }}
            ]
            
            stats_cursor = database.memory_items.aggregate(pipeline)
            type_stats = await stats_cursor.to_list(length=None)
            
            # Calculate totals
            total_memories = sum(stat["count"] for stat in type_stats)
            total_accesses = sum(stat["total_access"] for stat in type_stats)
            
            return {
                "user_id": user_id,
                "total_memories": total_memories,
                "total_accesses": total_accesses,
                "memory_types": {
                    stat["_id"]: {
                        "count": stat["count"],
                        "total_access": stat["total_access"],
                        "avg_access": round(stat["avg_access"], 2),
                        "latest_access": stat["latest"]
                    } for stat in type_stats
                },
                "cache_size": len([m for m in self.cache.values() if m.user_id == user_id]),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting memory statistics: {str(e)}")
            return {}

    async def _update_access(self, memory_item: MemoryItem) -> None:
        """Update access information for a memory item"""
        try:
            memory_item.last_accessed = datetime.utcnow()
            memory_item.access_count += 1
            
            # Update in database
            database = get_database()
            if database:
                await database.memory_items.update_one(
                    {"id": memory_item.id},
                    {
                        "$set": {
                            "last_accessed": memory_item.last_accessed.isoformat(),
                            "access_count": memory_item.access_count
                        }
                    }
                )
            
            # Track recent access
            self.recent_access.append({
                "memory_id": memory_item.id,
                "user_id": memory_item.user_id,
                "timestamp": memory_item.last_accessed.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error updating access for memory {memory_item.id}: {str(e)}")

    async def _cleanup_cache(self) -> None:
        """Clean up cache when it gets too large"""
        try:
            if len(self.cache) <= self.max_cache_size:
                return
            
            # Sort by last accessed (oldest first) and priority (low priority first)
            cache_items = list(self.cache.values())
            cache_items.sort(key=lambda m: (m.priority.value, m.last_accessed))
            
            # Remove oldest, lowest priority items
            items_to_remove = len(cache_items) - int(self.max_cache_size * 0.7)
            
            for item in cache_items[:items_to_remove]:
                if item.priority != MemoryPriority.CRITICAL:
                    del self.cache[item.id]
            
            logger.info(f"Cleaned up {items_to_remove} items from memory cache")
            
        except Exception as e:
            logger.error(f"Error cleaning up cache: {str(e)}")

    def _create_default_cognitive_profile(self, user_id: str) -> Dict[str, Any]:
        """Create a default cognitive profile for a new user"""
        return {
            "user_id": user_id,
            "thinking_patterns": {
                "analytical": 0.5,
                "creative": 0.5,
                "systematic": 0.5,
                "intuitive": 0.5
            },
            "communication_style": "balanced",
            "decision_making_style": "collaborative",
            "risk_tolerance": "medium",
            "preferred_frameworks": [],
            "cognitive_biases": [],
            "interaction_count": 0,
            "created_at": datetime.utcnow().isoformat(),
            "last_updated": datetime.utcnow().isoformat()
        }

    def _merge_cognitive_data(self, 
                             current_profile: Dict[str, Any], 
                             new_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Merge new cognitive analysis data with existing profile"""
        updated_profile = current_profile.copy()
        
        # Update thinking patterns with weighted average
        if "thinking_patterns" in new_analysis:
            current_patterns = updated_profile.get("thinking_patterns", {})
            new_patterns = new_analysis["thinking_patterns"]
            
            # Weight: 70% existing, 30% new (to prevent rapid changes)
            for pattern, score in new_patterns.items():
                if pattern in current_patterns:
                    updated_profile["thinking_patterns"][pattern] = (
                        current_patterns[pattern] * 0.7 + score * 0.3
                    )
                else:
                    updated_profile["thinking_patterns"][pattern] = score * 0.3
        
        # Update communication style if confidence is high
        if "communication_style" in new_analysis:
            updated_profile["communication_style"] = new_analysis["communication_style"]
        
        # Accumulate detected biases
        if "biases_detected" in new_analysis:
            current_biases = set(updated_profile.get("cognitive_biases", []))
            new_biases = set(new_analysis["biases_detected"])
            updated_profile["cognitive_biases"] = list(current_biases.union(new_biases))
        
        # Update interaction count
        updated_profile["interaction_count"] = updated_profile.get("interaction_count", 0) + 1
        updated_profile["last_updated"] = datetime.utcnow().isoformat()
        
        return updated_profile


# Global memory service instance
memory_service = MemoryService()


# Utility functions for easy access
async def store_session_memory(user_id: str, 
                              session_id: str, 
                              content: Dict[str, Any]) -> str:
    """Store session-specific memory"""
    return await memory_service.store_memory(
        user_id=user_id,
        memory_type=MemoryType.SESSION_CONTEXT,
        content=content,
        session_id=session_id,
        priority=MemoryPriority.MEDIUM
    )


async def get_session_memory(user_id: str, session_id: str) -> Dict[str, Any]:
    """Get all memory for a session"""
    return await memory_service.get_session_context(user_id, session_id)


async def store_user_preference(user_id: str, 
                               preference_data: Dict[str, Any]) -> str:
    """Store user preference"""
    return await memory_service.store_memory(
        user_id=user_id,
        memory_type=MemoryType.USER_PREFERENCES,
        content=preference_data,
        priority=MemoryPriority.HIGH
    )