"""
In-memory database implementation for testing purposes.
This replaces MongoDB with a simple in-memory storage system.
"""
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId
import asyncio

class InMemoryCursor:
    """Simulates a MongoDB cursor for in-memory storage"""
    
    def __init__(self, documents: List[Dict]):
        self.documents = documents
        self._sort_field = None
        self._sort_direction = 1
    
    def sort(self, field: str, direction: int = 1):
        """Sort the cursor results"""
        self._sort_field = field
        self._sort_direction = direction
        return self
    
    async def to_list(self, length: Optional[int] = None) -> List[Dict]:
        """Convert cursor to list"""
        results = self.documents.copy()
        
        # Apply sorting if specified
        if self._sort_field:
            def sort_key(doc):
                value = doc.get(self._sort_field)
                # Handle datetime objects for sorting
                if isinstance(value, datetime):
                    return value
                # Handle None values
                if value is None:
                    return datetime.min if self._sort_direction == 1 else datetime.max
                return value
            
            results.sort(key=sort_key, reverse=(self._sort_direction == -1))
        
        # Apply length limit if specified
        if length is not None and length > 0:
            results = results[:length]
        
        return results


class InMemoryCollection:
    """Simulates a MongoDB collection with in-memory storage"""
    
    def __init__(self, name: str):
        self.name = name
        self.documents: Dict[str, Dict] = {}
        self._counter = 0
    
    async def find_one(self, filter_dict: Dict) -> Optional[Dict]:
        """Find a single document matching the filter"""
        for doc_id, doc in self.documents.items():
            if self._matches_filter(doc, filter_dict):
                return doc.copy()
        return None
    
    def find(self, filter_dict: Dict = None):
        """Find all documents matching the filter - returns a cursor"""
        if filter_dict is None:
            results = list(self.documents.values())
        else:
            results = []
            for doc_id, doc in self.documents.items():
                if self._matches_filter(doc, filter_dict):
                    results.append(doc.copy())
        
        return InMemoryCursor(results)
    
    async def insert_one(self, document: Dict) -> Any:
        """Insert a single document"""
        # Generate a new ObjectId if not provided
        if "_id" not in document:
            document["_id"] = ObjectId()
        
        doc_id = str(document["_id"])
        self.documents[doc_id] = document.copy()
        
        # Return a mock result object
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        
        return InsertResult(document["_id"])
    
    async def insert_many(self, documents: List[Dict]) -> Any:
        """Insert multiple documents"""
        inserted_ids = []
        
        for document in documents:
            # Generate a new ObjectId if not provided
            if "_id" not in document:
                document["_id"] = ObjectId()
            
            doc_id = str(document["_id"])
            self.documents[doc_id] = document.copy()
            inserted_ids.append(document["_id"])
        
        # Return a mock result object
        class InsertManyResult:
            def __init__(self, inserted_ids):
                self.inserted_ids = inserted_ids
        
        return InsertManyResult(inserted_ids)
    
    async def update_one(self, filter_dict: Dict, update_dict: Dict) -> Any:
        """Update a single document"""
        for doc_id, doc in self.documents.items():
            if self._matches_filter(doc, filter_dict):
                if "$set" in update_dict:
                    doc.update(update_dict["$set"])
                
                # Return a mock result object
                class UpdateResult:
                    def __init__(self, modified_count):
                        self.modified_count = modified_count
                
                return UpdateResult(1)
        
        # No document found
        class UpdateResult:
            def __init__(self, modified_count):
                self.modified_count = modified_count
        
        return UpdateResult(0)
    
    async def delete_one(self, filter_dict: Dict) -> Any:
        """Delete a single document"""
        for doc_id, doc in self.documents.items():
            if self._matches_filter(doc, filter_dict):
                del self.documents[doc_id]
                
                # Return a mock result object
                class DeleteResult:
                    def __init__(self, deleted_count):
                        self.deleted_count = deleted_count
                
                return DeleteResult(1)
        
        # No document found
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        
        return DeleteResult(0)
    
    async def delete_many(self, filter_dict: Dict) -> Any:
        """Delete multiple documents"""
        deleted_count = 0
        docs_to_delete = []
        
        for doc_id, doc in self.documents.items():
            if self._matches_filter(doc, filter_dict):
                docs_to_delete.append(doc_id)
        
        for doc_id in docs_to_delete:
            del self.documents[doc_id]
            deleted_count += 1
        
        # Return a mock result object
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        
        return DeleteResult(deleted_count)
    
    async def find_one_and_update(self, filter_dict: Dict, update_dict: Dict, return_document: bool = False) -> Optional[Dict]:
        """Find and update a single document"""
        for doc_id, doc in self.documents.items():
            if self._matches_filter(doc, filter_dict):
                if "$set" in update_dict:
                    doc.update(update_dict["$set"])
                
                if return_document:
                    return doc.copy()
                else:
                    return doc.copy()  # Return the document regardless for compatibility
        
        return None
    
    async def count_documents(self, filter_dict: Dict = None) -> int:
        """Count documents matching the filter"""
        if filter_dict is None:
            return len(self.documents)
        
        count = 0
        for doc_id, doc in self.documents.items():
            if self._matches_filter(doc, filter_dict):
                count += 1
        return count
    
    async def create_index(self, field_name: str, unique: bool = False):
        """Create an index (no-op for in-memory database)"""
        # In-memory database doesn't need real indexes
        # This is just for compatibility with MongoDB API
        pass
    
    def _matches_filter(self, document: Dict, filter_dict: Dict) -> bool:
        """Check if a document matches the filter criteria"""
        for key, value in filter_dict.items():
            if key not in document:
                return False
            
            # Handle ObjectId comparison
            if isinstance(document[key], ObjectId) and isinstance(value, ObjectId):
                if document[key] != value:
                    return False
            elif isinstance(document[key], ObjectId):
                if str(document[key]) != str(value):
                    return False
            elif isinstance(value, ObjectId):
                if str(document[key]) != str(value):
                    return False
            elif document[key] != value:
                return False
        
        return True


class InMemoryFileStorage:
    """Simple in-memory file storage to replace GridFS"""
    
    def __init__(self):
        self.files: Dict[str, Dict[str, Any]] = {}
    
    async def upload_from_stream(self, filename: str, file_content: bytes, metadata: Dict = None) -> ObjectId:
        """Upload a file and return its ID"""
        file_id = ObjectId()
        self.files[str(file_id)] = {
            '_id': file_id,
            'filename': filename,
            'content': file_content,
            'metadata': metadata or {},
            'upload_date': datetime.utcnow()
        }
        return file_id
    
    async def download_to_stream(self, file_id: ObjectId) -> bytes:
        """Download a file by ID"""
        file_data = self.files.get(str(file_id))
        if not file_data:
            raise FileNotFoundError(f"File with ID {file_id} not found")
        return file_data['content']
    
    async def delete(self, file_id: ObjectId):
        """Delete a file by ID"""
        if str(file_id) in self.files:
            del self.files[str(file_id)]
    
    async def find(self, filter_dict: Dict = None) -> List[Dict]:
        """Find files matching filter"""
        results = []
        for file_data in self.files.values():
            if filter_dict:
                # Simple metadata matching
                metadata = file_data.get('metadata', {})
                match = True
                for key, value in filter_dict.items():
                    if key not in metadata or metadata[key] != value:
                        match = False
                        break
                if match:
                    results.append(file_data)
            else:
                results.append(file_data)
        return results


class InMemoryDatabase:
    """Simulates a MongoDB database with in-memory collections"""
    
    def __init__(self, name: str):
        self.name = name
        self.collections: Dict[str, InMemoryCollection] = {}
        self.file_storage = InMemoryFileStorage()
    
    def __getattr__(self, collection_name: str) -> InMemoryCollection:
        """Get or create a collection"""
        if collection_name not in self.collections:
            self.collections[collection_name] = InMemoryCollection(collection_name)
        return self.collections[collection_name]


class InMemoryClient:
    """Simulates a MongoDB client with in-memory storage"""
    
    def __init__(self):
        self.databases: Dict[str, InMemoryDatabase] = {}
        self.admin = self  # For ping command
    
    def __getattr__(self, db_name: str) -> InMemoryDatabase:
        """Get or create a database"""
        if db_name not in self.databases:
            self.databases[db_name] = InMemoryDatabase(db_name)
        return self.databases[db_name]
    
    async def command(self, command: str):
        """Handle admin commands like ping"""
        if command == 'ping':
            return {"ok": 1}
        return {"ok": 1}
    
    def close(self):
        """Close the client (no-op for in-memory)"""
        pass


# Global in-memory database instances
memory_client = None
memory_database = None


async def connect_to_mongo():
    """Connect to in-memory database (for testing)"""
    global memory_client, memory_database
    
    print("Using in-memory database for testing...")
    memory_client = InMemoryClient()
    memory_database = memory_client.agentic_boardroom
    
    # Test connection
    try:
        await memory_client.admin.command('ping')
        print("Connected to in-memory database successfully")
        return memory_database
    except Exception as e:
        print(f"Failed to connect to in-memory database: {e}")
        return None


async def close_mongo_connection():
    """Close in-memory database connection"""
    global memory_client
    if memory_client:
        memory_client.close()
        print("Disconnected from in-memory database")


def get_database():
    """Get the in-memory database instance"""
    return memory_database