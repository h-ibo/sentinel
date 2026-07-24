import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
load_dotenv()

# 1. Şifreleme (Hashing) Ayarları
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 2. JWT (Dijital Anahtar) Ayarları — .env'den okunuyor
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))


def get_password_hash(password: str) -> str:
    """Kullanıcının girdiği düz şifreyi geri döndürülemez bir metne çevirir."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Giriş ekranında yazılan şifre ile veritabanındaki kilitli şifrenin eşleşip eşleşmediğini kontrol eder."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """Kimliğini doğrulayan kullanıcıya, içinde bilgileri ve son kullanma tarihi olan bir JWT Token üretir."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

bearer_scheme = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    """
    Decode the JWT token and return the username if valid.
    Raises 401 if the token is missing, expired, or invalid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception