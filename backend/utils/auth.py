import hashlib
import secrets
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Union
import os
from dotenv import load_dotenv

load_dotenv()

# Simple password hashing using hashlib (for development/testing)
# In production, you should use proper bcrypt or similar
def _hash_password_simple(password: str, salt: str = None) -> str:
    """Simple password hashing using SHA-256 with salt"""
    if salt is None:
        salt = secrets.token_hex(16)
    
    # Combine password and salt
    password_salt = f"{password}{salt}"
    
    # Hash using SHA-256
    hashed = hashlib.sha256(password_salt.encode()).hexdigest()
    
    # Return salt + hash (separated by $)
    return f"{salt}${hashed}"

def _verify_password_simple(password: str, hashed_password: str) -> bool:
    """Verify password against simple hash"""
    try:
        salt, stored_hash = hashed_password.split('$', 1)
        password_salt = f"{password}{salt}"
        computed_hash = hashlib.sha256(password_salt.encode()).hexdigest()
        return computed_hash == stored_hash
    except ValueError:
        return False

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRES_IN", 86400))  # 24 hours default


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    # Generate salt and hash password using bcrypt
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash using bcrypt.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Stored hashed password
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        # Use bcrypt to verify the password
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(seconds=ACCESS_TOKEN_EXPIRE_SECONDS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_token_expiry() -> int:
    """
    Get the token expiry time in seconds.
    
    Returns:
        Token expiry time in seconds
    """
    return ACCESS_TOKEN_EXPIRE_SECONDS