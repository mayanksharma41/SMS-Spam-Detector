"""
Comprehensive test suite for Authentication, User Accounts, and Data Isolation.
Tests:
- Registration, validation, duplicate prevention
- Login, invalid credentials, session management, logout
- Password hashing verification (no plaintext stored)
- Protected endpoints & CSRF verification
- Password reset (development flow)
- User data isolation (User A vs User B)
- Privacy opt-in for prediction history storage
"""
import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

# Ensure backend package is in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db
from app import app as flask_app


@pytest.fixture
def auth_client():
    """Configures a temporary SQLite database for test isolation."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as temp_db:
        db_path = temp_db.name

    original_db = os.environ.get("DATABASE_PATH")
    os.environ["DATABASE_PATH"] = db_path
    flask_app.config["TESTING"] = True

    # Re-initialize isolated test database
    db.init_db(db_path)

    with flask_app.test_client() as client:
        yield client

    # Cleanup temp db
    if original_db:
        os.environ["DATABASE_PATH"] = original_db
    else:
        os.environ.pop("DATABASE_PATH", None)
    if os.path.exists(db_path):
        os.unlink(db_path)


def register_user(client, email="user@example.com", password="SecurePassword123"):
    return client.post(
        "/api/auth/register",
        data=json.dumps({
            "email": email,
            "password": password,
            "confirm_password": password,
        }),
        content_type="application/json",
    )


def login_user(client, email="user@example.com", password="SecurePassword123"):
    return client.post(
        "/api/auth/login",
        data=json.dumps({"email": email, "password": password}),
        content_type="application/json",
    )


# ── 1. Registration ──────────────────────────────────────────────

class TestRegistration:
    def test_successful_registration(self, auth_client):
        resp = register_user(auth_client, "alice@example.com", "SecretPass123")
        assert resp.status_code == 201
        data = resp.get_json()
        assert "user" in data
        assert data["user"]["email"] == "alice@example.com"
        assert "csrf_token" in data

    def test_duplicate_email_rejected(self, auth_client):
        register_user(auth_client, "duplicate@example.com", "SecretPass123")
        resp = register_user(auth_client, "duplicate@example.com", "AnotherPass456")
        assert resp.status_code == 409
        assert "already exists" in resp.get_json()["error"]

    def test_invalid_email_format_rejected(self, auth_client):
        for bad_email in ["not-an-email", "@missinguser.com", "user@", "spaces in@email.com"]:
            resp = register_user(auth_client, bad_email, "SecretPass123")
            assert resp.status_code == 400

    def test_weak_password_rejected(self, auth_client):
        # Too short
        resp = register_user(auth_client, "short@example.com", "Pass1")
        assert resp.status_code == 400
        # Missing number
        resp = register_user(auth_client, "nonum@example.com", "OnlyLettersPass")
        assert resp.status_code == 400
        # Missing letter
        resp = register_user(auth_client, "nolet@example.com", "1234567890")
        assert resp.status_code == 400

    def test_mismatched_password_rejected(self, auth_client):
        resp = auth_client.post(
            "/api/auth/register",
            data=json.dumps({
                "email": "mismatch@example.com",
                "password": "ValidPass123",
                "confirm_password": "DifferentPass123",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert "match" in resp.get_json()["error"]

    def test_passwords_never_stored_in_plaintext(self, auth_client):
        raw_password = "MySuperSecretPassword99"
        register_user(auth_client, "security@example.com", raw_password)

        user = db.get_user_by_email("security@example.com")
        assert user is not None
        assert raw_password not in user["password_hash"]
        assert user["password_hash"].startswith("scrypt:") or user["password_hash"].startswith("pbkdf2:")


# ── 2. Login, Session & Logout ───────────────────────────────────

class TestLoginAndSession:
    def test_login_successful(self, auth_client):
        register_user(auth_client, "bob@example.com", "Password123")
        auth_client.post("/api/auth/logout")

        resp = login_user(auth_client, "bob@example.com", "Password123")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["user"]["email"] == "bob@example.com"
        assert "csrf_token" in data

    def test_login_invalid_password(self, auth_client):
        register_user(auth_client, "charlie@example.com", "Password123")
        auth_client.post("/api/auth/logout")

        resp = login_user(auth_client, "charlie@example.com", "WrongPassword999")
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.get_json()["error"]

    def test_login_nonexistent_user(self, auth_client):
        resp = login_user(auth_client, "ghost@example.com", "Password123")
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.get_json()["error"]

    def test_current_user_me_endpoint(self, auth_client):
        register_user(auth_client, "dana@example.com", "Password123")
        resp = auth_client.get("/api/auth/me")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["authenticated"] is True
        assert data["user"]["email"] == "dana@example.com"

    def test_logout_clears_session(self, auth_client):
        register_user(auth_client, "evan@example.com", "Password123")
        logout_resp = auth_client.post("/api/auth/logout")
        assert logout_resp.status_code == 200

        me_resp = auth_client.get("/api/auth/me")
        assert me_resp.status_code == 401


# ── 3. Protected Endpoints & CSRF ────────────────────────────────

class TestProtectedRoutesAndCSRF:
    def test_predict_requires_auth(self, auth_client):
        resp = auth_client.post(
            "/api/predict",
            data=json.dumps({"text": "Urgent! Call now."}),
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_analyze_requires_auth(self, auth_client):
        resp = auth_client.post(
            "/api/analyze",
            data=json.dumps({"text": "Hello world"}),
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_history_requires_auth(self, auth_client):
        resp = auth_client.get("/api/history")
        assert resp.status_code == 401

    def test_csrf_protection_rejects_missing_token_on_mutation(self, auth_client):
        # Register logs the user in and establishes session
        reg_resp = register_user(auth_client, "csrf_test@example.com", "Password123")
        csrf_token = reg_resp.get_json()["csrf_token"]

        # Call with wrong CSRF header -> should be 403
        resp = auth_client.post(
            "/api/predict",
            data=json.dumps({"text": "Claim your prize!"}),
            content_type="application/json",
            headers={"X-CSRF-Token": "invalid-token"},
        )
        assert resp.status_code == 403

        # Call with correct CSRF header -> should succeed (200)
        resp_valid = auth_client.post(
            "/api/predict",
            data=json.dumps({"text": "Claim your prize!"}),
            content_type="application/json",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert resp_valid.status_code == 200


# ── 4. Password Reset Flow (Development) ─────────────────────────

class TestPasswordReset:
    def test_forgot_and_reset_flow(self, auth_client):
        register_user(auth_client, "resetme@example.com", "OriginalPass123")
        auth_client.post("/api/auth/logout")

        # Request reset token
        forgot_resp = auth_client.post(
            "/api/auth/forgot-password",
            data=json.dumps({"email": "resetme@example.com"}),
            content_type="application/json",
        )
        assert forgot_resp.status_code == 200
        token = forgot_resp.get_json()["dev_reset_token"]
        assert token is not None

        # Reset password
        reset_resp = auth_client.post(
            "/api/auth/reset-password",
            data=json.dumps({
                "token": token,
                "password": "NewSecretPassword456",
                "confirm_password": "NewSecretPassword456",
            }),
            content_type="application/json",
        )
        assert reset_resp.status_code == 200

        # Old password should now fail
        old_login = login_user(auth_client, "resetme@example.com", "OriginalPass123")
        assert old_login.status_code == 401

        # New password should succeed
        new_login = login_user(auth_client, "resetme@example.com", "NewSecretPassword456")
        assert new_login.status_code == 200

    def test_invalid_reset_token_fails(self, auth_client):
        resp = auth_client.post(
            "/api/auth/reset-password",
            data=json.dumps({
                "token": "completely-bogus-token-xyz",
                "password": "NewPassword789",
                "confirm_password": "NewPassword789",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_production_mode_does_not_leak_dev_reset_token(self, auth_client, monkeypatch):
        """In production, /api/auth/forgot-password must never expose dev_reset_token."""
        import app
        monkeypatch.setattr(app, "IS_PRODUCTION", True)

        register_user(auth_client, "produser@example.com", "Password123")
        auth_client.post("/api/auth/logout")

        resp = auth_client.post(
            "/api/auth/forgot-password",
            data=json.dumps({"email": "produser@example.com"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["dev_reset_token"] is None
        assert "reset instructions have been generated" in data["message"]

    def test_expired_token_is_rejected(self, auth_client):
        """A token with past expiry date must be rejected."""
        from datetime import datetime, timedelta, timezone
        register_user(auth_client, "expired@example.com", "Password123")
        auth_client.post("/api/auth/logout")

        user = db.get_user_by_email("expired@example.com")
        past_expiry = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        db.set_password_reset_token(user["id"], "expired-token-123", past_expiry)

        resp = auth_client.post(
            "/api/auth/reset-password",
            data=json.dumps({
                "token": "expired-token-123",
                "password": "NewValidPass999",
                "confirm_password": "NewValidPass999",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert "expired" in resp.get_json()["error"]


# ── 5. User Data Isolation & Privacy Opt-in ──────────────────────

class TestDataIsolationAndPrivacy:
    def test_user_history_isolation(self, auth_client):
        # 1. Register User A and make a prediction
        resp_a = register_user(auth_client, "user_a@example.com", "PassUserA123")
        csrf_a = resp_a.get_json()["csrf_token"]

        auth_client.post(
            "/api/predict",
            data=json.dumps({"text": "Message belonging to User A: prize claim"}),
            content_type="application/json",
            headers={"X-CSRF-Token": csrf_a},
        )
        auth_client.post("/api/auth/logout")

        # 2. Register User B and make a prediction
        resp_b = register_user(auth_client, "user_b@example.com", "PassUserB123")
        csrf_b = resp_b.get_json()["csrf_token"]

        auth_client.post(
            "/api/predict",
            data=json.dumps({"text": "Message belonging to User B: hello friend"}),
            content_type="application/json",
            headers={"X-CSRF-Token": csrf_b},
        )

        # User B inspects history: should only see User B's scan
        hist_b = auth_client.get("/api/history").get_json()["history"]
        assert len(hist_b) == 1
        assert "User B" in hist_b[0]["text_preview"]
        assert "User A" not in hist_b[0]["text_preview"]

        # 3. Log back in as User A: should only see User A's scan
        auth_client.post("/api/auth/logout")
        login_user(auth_client, "user_a@example.com", "PassUserA123")
        hist_a = auth_client.get("/api/history").get_json()["history"]
        assert len(hist_a) == 1
        assert "User A" in hist_a[0]["text_preview"]
        assert "User B" not in hist_a[0]["text_preview"]

    def test_privacy_default_no_full_text(self, auth_client):
        """By default (without explicit opt-in), full message text is NOT stored."""
        resp = register_user(auth_client, "privacy_user@example.com", "PrivacyPass123")
        csrf = resp.get_json()["csrf_token"]

        long_message = "Confidential SMS text containing sensitive info: " + ("x" * 200)
        auth_client.post(
            "/api/predict",
            data=json.dumps({"text": long_message}),
            content_type="application/json",
            headers={"X-CSRF-Token": csrf},
        )

        history = auth_client.get("/api/history").get_json()["history"]
        assert len(history) == 1
        # Full text must be None by default
        assert history[0]["full_text"] is None
        # Only truncated preview is retained
        assert len(history[0]["text_preview"]) <= 120

    def test_privacy_opt_in_stores_full_text(self, auth_client):
        """When user explicitly opts in, full message text is stored."""
        resp = register_user(auth_client, "optin_user@example.com", "PrivacyPass123")
        csrf = resp.get_json()["csrf_token"]

        # Enable opt-in preference
        pref_resp = auth_client.patch(
            "/api/auth/preferences",
            data=json.dumps({"store_history_opt_in": True}),
            content_type="application/json",
            headers={"X-CSRF-Token": csrf},
        )
        assert pref_resp.status_code == 200
        assert pref_resp.get_json()["user"]["store_history_opt_in"] == 1

        message = "User has explicitly opted in to store this full message."
        auth_client.post(
            "/api/predict",
            data=json.dumps({"text": message}),
            content_type="application/json",
            headers={"X-CSRF-Token": csrf},
        )

        history = auth_client.get("/api/history").get_json()["history"]
        assert len(history) == 1
        assert history[0]["full_text"] == message
