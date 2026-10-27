"""
Authentication and security helpers for SMS Spam Detection.
- Password hashing using Werkzeug's pbkdf2/scrypt (never stores plaintext)
- Email format validation
- Password complexity validation
- Flask session-based authentication decorator
- CSRF protection for state-modifying requests
"""
import functools
import re
import secrets
from datetime import datetime, timedelta, timezone

from flask import g, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_user_by_id

EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)
MIN_PASSWORD_LENGTH = 8


def validate_email(email: str) -> tuple[bool, str]:
    if not email or not isinstance(email, str):
        return False, "Email address is required."
    clean = email.strip()
    if len(clean) > 254:
        return False, "Email address is too long."
    if not EMAIL_REGEX.match(clean):
        return False, "Please enter a valid email address (e.g., user@example.com)."
    return True, clean


def validate_password(password: str) -> tuple[bool, str]:
    if not password or not isinstance(password, str):
        return False, "Password is required."
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."
    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    return True, ""


def hash_password(password: str) -> str:
    """Hashes password with pbkdf2:sha256 using random salt."""
    return generate_password_hash(password, method="scrypt")


def verify_password(stored_hash: str, candidate_password: str) -> bool:
    """Safely verifies candidate password against stored hash."""
    return check_password_hash(stored_hash, candidate_password)


def generate_csrf_token() -> str:
    """Generates and stores CSRF token in current session."""
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return session["csrf_token"]


def verify_csrf_token() -> bool:
    """Verifies that X-CSRF-Token header or JSON csrf_token matches session."""
    expected = session.get("csrf_token")
    if not expected:
        return False

    provided = request.headers.get("X-CSRF-Token")
    if not provided and request.is_json:
        payload = request.get_json(silent=True) or {}
        provided = payload.get("csrf_token")

    return bool(provided and secrets.compare_digest(provided, expected))


def generate_reset_token() -> tuple[str, str]:
    """Generates a secure password reset token and 1-hour expiration timestamp."""
    token = secrets.token_urlsafe(32)
    expiry = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    return token, expiry


def login_required(f):
    """
    Decorator for protected Flask endpoints.
    Verifies that a valid user_id exists in session and matches an active user.
    Sets g.current_user to the authenticated user dictionary.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Authentication required. Please log in.", "code": "UNAUTHENTICATED"}), 401

        user = get_user_by_id(user_id)
        if not user:
            session.clear()
            return jsonify({"error": "User account no longer exists.", "code": "UNAUTHENTICATED"}), 401

        g.current_user = user
        return f(*args, **kwargs)

    return decorated_function
