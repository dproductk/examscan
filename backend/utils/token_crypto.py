"""
token_crypto.py
---------------
Generates and decrypts short opaque tokens for roll numbers.

Algorithm:
  - AES-128-CBC encryption of the roll number string
  - Output encoded with Base32 (uppercase, no padding) → short printable token
  - Tokens are 8-16 characters depending on roll number length

Usage:
  token = generate_token("2023CS045")   → e.g. "XK729FAB"
  roll  = decrypt_token("XK729FAB")     → "2023CS045"

The SECRET_TOKEN_KEY (32 hex chars = 16 bytes AES key) must be set in .env
The SECRET_TOKEN_IV  (32 hex chars = 16 bytes IV) must be set in .env
"""

import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from decouple import config

SECRET_KEY_HEX = config('TOKEN_AES_KEY')   # 32 hex chars = 16 bytes
SECRET_IV_HEX  = config('TOKEN_AES_IV')    # 32 hex chars = 16 bytes


def _get_key_iv():
    key = bytes.fromhex(SECRET_KEY_HEX)
    iv  = bytes.fromhex(SECRET_IV_HEX)
    assert len(key) == 16, "TOKEN_AES_KEY must be exactly 32 hex characters (16 bytes)"
    assert len(iv)  == 16, "TOKEN_AES_IV must be exactly 32 hex characters (16 bytes)"
    return key, iv


def generate_token(roll_number: str) -> str:
    """
    Encrypts roll_number → returns a short uppercase Base32 token.
    Example: "2023CS045" → "XK729FABMN2Q"
    """
    key, iv = _get_key_iv()
    cipher = AES.new(key, AES.MODE_CBC, iv)
    padded = pad(roll_number.encode('utf-8'), AES.block_size)
    encrypted = cipher.encrypt(padded)
    # Base32 encode → strip '=' padding → uppercase
    token = base64.b32encode(encrypted).decode('utf-8').rstrip('=')
    return token


def decrypt_token(token: str) -> str:
    """
    Decrypts a Base32 token back to the original roll number.
    Raises ValueError if token is invalid or tampered.
    """
    key, iv = _get_key_iv()
    # Restore Base32 padding
    padding_needed = (8 - len(token) % 8) % 8
    padded_token = token + '=' * padding_needed
    try:
        encrypted = base64.b32decode(padded_token.upper())
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted = unpad(cipher.decrypt(encrypted), AES.block_size)
        return decrypted.decode('utf-8')
    except Exception as e:
        raise ValueError(f"Invalid or tampered token: {token}") from e
