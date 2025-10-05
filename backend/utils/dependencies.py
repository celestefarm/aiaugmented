from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from models.user import UserInDB, UserResponse
from utils.auth import verify_token
from database import get_database
from bson import ObjectId

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserResponse:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer token credentials
        
    Returns:
        Current user data
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify the token
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    # Extract user ID from token
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Get database instance
    database = get_database()
    if database is None:
        # Try to connect if not already connected
        from database import connect_to_mongo
        await connect_to_mongo()
        database = get_database()
        if database is None:
            raise credentials_exception
    
    # Get user from database
    try:
        user_doc = await database.users.find_one({"_id": ObjectId(user_id)})
        if user_doc is None:
            raise credentials_exception
        
        # Convert ObjectId to string for Pydantic compatibility
        if user_doc and "_id" in user_doc:
            user_doc["_id"] = str(user_doc["_id"])
        
        # Convert to UserInDB model and then to response
        user_in_db = UserInDB(**user_doc)
        return user_in_db.to_response()
        
    except Exception:
        raise credentials_exception


async def get_current_active_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """
    Dependency to get the current active user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current active user data
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[UserResponse]:
    """
    Optional dependency to get the current user (doesn't raise exception if no token).
    
    Args:
        credentials: Optional HTTP Bearer token credentials
        
    Returns:
        Current user data if authenticated, None otherwise
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None