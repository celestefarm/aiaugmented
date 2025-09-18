from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)  # Convert ObjectId to string for Pydantic
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v  # Return string as-is
        raise ValueError("Invalid ObjectId")


# Request/Response Models
class UserSignupRequest(BaseModel):
    """User registration request model"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    name: str = Field(..., min_length=1, max_length=100, description="User display name")


class UserLoginRequest(BaseModel):
    """User login request model"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    """User response model (without sensitive data)"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: EmailStr
    name: str
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True


class TokenResponse(BaseModel):
    """JWT token response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


# Database Models
class UserInDB(BaseModel):
    """User model for database operations"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: EmailStr
    password_hash: str
    name: str
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True

    def to_response(self) -> UserResponse:
        """Convert to response model (without password_hash)"""
        return UserResponse(
            id=self.id,
            email=self.email,
            name=self.name,
            created_at=self.created_at,
            last_login=self.last_login,
            is_active=self.is_active
        )


class UserCreate(BaseModel):
    """User creation model for internal use"""
    email: EmailStr
    password_hash: str
    name: str
    created_at: datetime
    is_active: bool = True