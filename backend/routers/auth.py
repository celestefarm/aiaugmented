from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials
from models.user import UserSignupRequest, UserLoginRequest, UserResponse, TokenResponse, UserInDB, UserCreate
from utils.auth import hash_password, verify_password, create_access_token, get_token_expiry
from utils.dependencies import get_current_active_user, security
from database import get_database
from datetime import datetime
from bson import ObjectId
from typing import Dict
import logging
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])


@router.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignupRequest, request: Request):
    """
    Register a new user account.
    
    Args:
        user_data: User registration data (email, password, name)
        
    Returns:
        JWT token and user information
        
    Raises:
        HTTPException: If email already exists or validation fails
    """
    # Log incoming request details
    logger.info(f"=== SIGNUP REQUEST ===")
    logger.info(f"Request URL: {request.url}")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request headers: {dict(request.headers)}")
    
    try:
        # Log the parsed user data
        logger.info(f"Parsed user data: email={user_data.email}, name='{user_data.name}', password_length={len(user_data.password)}")
        
        # Validate password length explicitly
        if len(user_data.password) < 8:
            logger.error(f"Password validation failed: length {len(user_data.password)} < 8")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 8 characters long"
            )
        
        # Get database instance
        database = get_database()
        logger.info("Database connection obtained")
    except Exception as e:
        logger.error(f"Error in signup request parsing: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Request validation failed: {str(e)}"
        )
    
    try:
        # Check if user already exists
        logger.info(f"Checking if user exists with email: {user_data.email}")
        existing_user = await database.users.find_one({"email": user_data.email})
        if existing_user:
            logger.warning(f"User already exists with email: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash the password
        logger.info("Hashing password")
        password_hash = hash_password(user_data.password)
        logger.info(f"Password hashed successfully, hash length: {len(password_hash)}")
        
        # Create user document
        user_create = UserCreate(
            email=user_data.email,
            password_hash=password_hash,
            name=user_data.name,
            created_at=datetime.utcnow(),
            is_active=True
        )
        logger.info(f"User create object: {user_create.model_dump()}")
        
        # Insert user into database
        logger.info("Inserting user into database")
        result = await database.users.insert_one(user_create.model_dump())
        user_id = result.inserted_id
        logger.info(f"User inserted with ID: {user_id}")
        
        # Get the created user
        user_doc = await database.users.find_one({"_id": user_id})
        logger.info(f"Retrieved user document: {user_doc}")
        
        # Convert ObjectId to string for Pydantic compatibility
        if user_doc and "_id" in user_doc:
            user_doc["_id"] = str(user_doc["_id"])
        
        user_in_db = UserInDB(**user_doc)
        user_response = user_in_db.to_response()
        logger.info(f"User response created: {user_response}")
        
        # Create access token
        logger.info("Creating access token")
        access_token = create_access_token(data={"sub": str(user_id)})
        logger.info("Access token created successfully")
        
        response = TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=get_token_expiry(),
            user=user_response
        )
        logger.info("=== SIGNUP SUCCESS ===")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in signup: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLoginRequest, request: Request):
    """
    Authenticate user and return JWT token.
    
    Args:
        user_data: User login credentials (email, password)
        
    Returns:
        JWT token and user information
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Log incoming request details
    logger.info(f"=== LOGIN REQUEST ===")
    logger.info(f"Request URL: {request.url}")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request headers: {dict(request.headers)}")
    
    # TEMPORARY DEBUG: Log raw request body
    try:
        body = await request.body()
        logger.info(f"Raw request body: {body}")
        logger.info(f"Raw request body decoded: {body.decode('utf-8') if body else 'Empty'}")
    except Exception as e:
        logger.error(f"Failed to read raw request body: {e}")
    
    logger.info(f"Login attempt for email: {user_data.email}, password_length: {len(user_data.password)}")
    logger.info(f"EXACT EMAIL RECEIVED: '{user_data.email}'")
    logger.info(f"EXACT PASSWORD RECEIVED: '{user_data.password}'")
    
    try:
        # Get database instance
        database = get_database()
        logger.info("Database connection obtained")
        
        # Find user by email
        logger.info(f"Looking up user with email: {user_data.email}")
        user_doc = await database.users.find_one({"email": user_data.email})
        if not user_doc:
            logger.warning(f"User not found with email: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        logger.info(f"User found: {user_doc.get('_id')}")
        
        # Convert ObjectId to string for Pydantic compatibility
        if user_doc and "_id" in user_doc:
            user_doc["_id"] = str(user_doc["_id"])
        
        user_in_db = UserInDB(**user_doc)
        logger.info(f"User loaded: {user_in_db.email}, active: {user_in_db.is_active}")
        
        # Verify password
        logger.info("Verifying password")
        password_valid = verify_password(user_data.password, user_in_db.password_hash)
        logger.info(f"Password verification result: {password_valid}")
        logger.info(f"Stored hash length: {len(user_in_db.password_hash)}")
        
        if not password_valid:
            logger.warning(f"Password verification failed for user: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user_in_db.is_active:
            logger.warning(f"Inactive user attempted login: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is inactive"
            )
        
        # Update last login timestamp
        logger.info("Updating last login timestamp")
        await database.users.update_one(
            {"_id": user_in_db.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Create access token
        logger.info("Creating access token")
        access_token = create_access_token(data={"sub": str(user_in_db.id)})
        logger.info("Access token created successfully")
        
        # Get updated user data
        user_response = user_in_db.to_response()
        user_response.last_login = datetime.utcnow()
        
        response = TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=get_token_expiry(),
            user=user_response
        )
        logger.info("=== LOGIN SUCCESS ===")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in login: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Logout user (token invalidation).
    
    Note: In a stateless JWT implementation, we can't truly invalidate tokens
    without maintaining a blacklist. For now, this endpoint serves as a placeholder
    for client-side token removal and could be extended with token blacklisting.
    
    Args:
        credentials: HTTP Bearer token credentials
        
    Returns:
        Success message
    """
    # In a production system, you might want to:
    # 1. Add the token to a blacklist/blocklist
    # 2. Store blacklisted tokens in Redis with expiration
    # 3. Check blacklist in the token verification process
    
    return {"message": "Successfully logged out"}


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_profile(current_user: UserResponse = Depends(get_current_active_user)):
    """
    Get current authenticated user's profile.
    
    Args:
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Current user profile data
    """
    return current_user


@router.put("/auth/me", response_model=UserResponse)
async def update_current_user_profile(
    update_data: Dict[str, str],
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Update current authenticated user's profile.
    
    Args:
        update_data: Fields to update (currently supports 'name')
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Updated user profile data
        
    Raises:
        HTTPException: If update fails or invalid fields provided
    """
    # Only allow updating specific fields
    allowed_fields = {"name"}
    update_fields = {}
    
    for field, value in update_data.items():
        if field in allowed_fields and value:
            update_fields[field] = value
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update"
        )
    
    # Get database instance
    database = get_database()
    
    # Update user in database
    user_object_id = ObjectId(current_user.id) if isinstance(current_user.id, str) else current_user.id
    result = await database.users.update_one(
        {"_id": user_object_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update user profile"
        )
    
    # Get updated user data
    user_object_id = ObjectId(current_user.id) if isinstance(current_user.id, str) else current_user.id
    user_doc = await database.users.find_one({"_id": user_object_id})
    
    # Convert ObjectId to string for Pydantic compatibility
    if user_doc and "_id" in user_doc:
        user_doc["_id"] = str(user_doc["_id"])
    
    user_in_db = UserInDB(**user_doc)
    
    return user_in_db.to_response()