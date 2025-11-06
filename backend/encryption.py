"""
Encryption utilities for sensitive data like email passwords.
Uses Fernet (symmetric encryption) from cryptography library.
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os
from config import settings

# Use a combination of JWT secret key and a fixed salt for deriving encryption key
# This ensures we have a consistent encryption key across restarts
def _get_encryption_key() -> bytes:
    """
    Derive encryption key from JWT secret key.
    Falls back to a default if JWT secret is not set (for development only).
    """
    # Use JWT secret key if available, otherwise use a default (INSECURE for production)
    secret_key = settings.jwt_secret_key or "default-secret-key-change-in-production"
    
    # Use a fixed salt based on the app identifier
    salt = b'quote_app_email_encryption_salt_2024'
    
    # Derive key using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
    return key

# Initialize Fernet with the derived key
_fernet = None

def _get_fernet() -> Fernet:
    """Get or create Fernet instance for encryption/decryption."""
    global _fernet
    if _fernet is None:
        key = _get_encryption_key()
        _fernet = Fernet(key)
    return _fernet

def encrypt_email_password(password: str) -> str:
    """
    Encrypt an email password before storing in database.
    
    Args:
        password: Plain text password to encrypt
        
    Returns:
        Encrypted password as base64 string
    """
    if not password:
        return ""
    
    try:
        fernet = _get_fernet()
        encrypted = fernet.encrypt(password.encode())
        return encrypted.decode()
    except Exception as e:
        # Log error but don't fail - return empty string
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to encrypt email password: {e}")
        return ""

def decrypt_email_password(encrypted_password: str) -> str:
    """
    Decrypt an email password from database.
    
    Args:
        encrypted_password: Encrypted password from database
        
    Returns:
        Decrypted plain text password
        
    Raises:
        ValueError: If decryption fails (e.g., password was stored in plain text)
    """
    if not encrypted_password:
        return ""
    
    try:
        fernet = _get_fernet()
        decrypted = fernet.decrypt(encrypted_password.encode())
        return decrypted.decode()
    except Exception as e:
        # If decryption fails, it might be a plain text password (migration scenario)
        # Try to detect if it's already plain text (doesn't look like base64 Fernet token)
        import logging
        logger = logging.getLogger(__name__)
        
        # Check if it looks like a Fernet token (base64, starts with gAAAAA)
        if encrypted_password.startswith('gAAAAA'):
            # It's encrypted but decryption failed - this is an error
            logger.error(f"Failed to decrypt email password: {e}")
            raise ValueError(f"Failed to decrypt email password: {e}")
        else:
            # Likely a plain text password from before encryption was implemented
            # Return as-is for backward compatibility during migration
            logger.warning("Email password appears to be in plain text (pre-encryption). Please update it.")
            return encrypted_password

