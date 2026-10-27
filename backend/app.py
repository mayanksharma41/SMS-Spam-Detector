import os
from datetime import timedelta

from flask import Flask, g, jsonify, request, session
from flask_cors import CORS

from auth import (
    generate_csrf_token,
    generate_reset_token,
    hash_password,
    login_required,
    validate_email,
    validate_password,
    verify_csrf_token,
    verify_password,
)
from db import (
    add_prediction_history,
    create_user,
    delete_history_item,
    delete_user_prediction_history,
    get_user_by_email,
    get_user_by_id,
    get_user_by_reset_token,
    get_user_prediction_history,
    init_db,
    update_user_password,
    update_user_preferences,
)
from nlp.classifier import get_model_metrics, predict_sms
from nlp.processor import analyze_text, compare_texts, generate_wordcloud_image
from nlp.samples import get_sample_by_id, list_samples

MAX_TEXT_LENGTH = 10_000
IS_PRODUCTION = os.environ.get("FLASK_ENV", "").lower() == "production"

app = Flask(__name__)

# Security & Session Configuration
configured_secret = os.environ.get("SECRET_KEY")
if not configured_secret:
    if IS_PRODUCTION:
        import secrets
        configured_secret = secrets.token_hex(32)
        app.logger.warning("SECRET_KEY not set in production. Generated ephemeral random key.")
    else:
        configured_secret = "sms-spam-dev-secret-key-change-in-prod-xyz789"

app.secret_key = configured_secret
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=IS_PRODUCTION or (os.environ.get("COOKIE_SECURE", "false").lower() == "true"),
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
)

# CORS: allow localhost dev origins with session cookie credentials
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173",
    ).split(",")
    if origin.strip()
]
CORS(app, origins=allowed_origins, supports_credentials=True)

# Initialize SQLite database on module load
init_db()


def json_error(message, status=400, code=None):
    payload = {"error": message}
    if code:
        payload["code"] = code
    return jsonify(payload), status


def validate_text(payload, field="text"):
    """Extracts and validates a text field from JSON payload."""
    value = payload.get(field)
    if not isinstance(value, str) or not value.strip():
        return None, f"Request body must include a non-empty string '{field}' field."
    if len(value) > MAX_TEXT_LENGTH:
        return None, f"Text exceeds maximum length of {MAX_TEXT_LENGTH:,} characters."
    return value.strip(), None


def check_csrf_or_error():
    """Validates CSRF token if user is authenticated with active session."""
    if "user_id" in session:
        if not verify_csrf_token():
            return json_error("Invalid or missing CSRF token.", 403, "CSRF_ERROR")
    return None


# ── Health & Status (Public) ─────────────────────────────────────

@app.get("/api/health")
def health():
    metrics = None
    try:
        metrics = get_model_metrics()
    except Exception:
        metrics = None

    return jsonify(
        {
            "ok": True,
            "service": "sms-spam-detection",
            "model_ready": metrics is not None,
            "accuracy": metrics.get("accuracy") if metrics else None,
        }
    )


@app.get("/api/model/metrics")
def model_metrics():
    try:
        metrics = get_model_metrics()
        return jsonify(metrics)
    except Exception as e:
        return json_error(f"Failed to load model metrics: {str(e)}", 500)


# ── Samples (Public) ─────────────────────────────────────────────

@app.get("/api/samples")
def samples():
    return jsonify(list_samples())


@app.get("/api/samples/<sample_id>")
def sample_detail(sample_id):
    item = get_sample_by_id(sample_id)
    if not item:
        return json_error("Sample not found.", 404)
    return jsonify(item)


# ── Authentication Endpoints ─────────────────────────────────────

@app.get("/api/auth/csrf")
def get_csrf():
    """Provides a fresh CSRF token stored in current session."""
    token = generate_csrf_token()
    return jsonify({"csrf_token": token})


@app.post("/api/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    email_raw = payload.get("email")
    password = payload.get("password")
    confirm_password = payload.get("confirm_password")

    is_valid_email, email_or_err = validate_email(email_raw)
    if not is_valid_email:
        return json_error(email_or_err, 400)

    is_valid_pw, pw_err = validate_password(password)
    if not is_valid_pw:
        return json_error(pw_err, 400)

    if confirm_password is not None and password != confirm_password:
        return json_error("Passwords do not match.", 400)

    # Check for duplicate registration safely
    existing = get_user_by_email(email_or_err)
    if existing:
        return json_error("An account with this email address already exists.", 409)

    hashed = hash_password(password)
    user = create_user(email_or_err, hashed)
    if not user:
        return json_error("Could not create user account. Please try again.", 500)

    # Establish authenticated session
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = True
    csrf = generate_csrf_token()

    return jsonify({"user": user, "csrf_token": csrf}), 201


@app.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email_raw = payload.get("email")
    password = payload.get("password")

    if not email_raw or not password:
        return json_error("Email and password are required.", 400)

    user = get_user_by_email(email_raw)
    if not user or not verify_password(user["password_hash"], password):
        return json_error("Invalid email or password.", 401)

    # Regenerate session to prevent fixation
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = True
    csrf = generate_csrf_token()

    clean_user = {
        "id": user["id"],
        "email": user["email"],
        "store_history_opt_in": bool(user["store_history_opt_in"]),
        "created_at": user["created_at"],
    }
    return jsonify({"user": clean_user, "csrf_token": csrf})


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"ok": True, "message": "Logged out successfully."})


@app.get("/api/auth/me")
def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False}), 401

    user = get_user_by_id(user_id)
    if not user:
        session.clear()
        return jsonify({"authenticated": False}), 401

    csrf = generate_csrf_token()
    return jsonify({
        "authenticated": True,
        "user": user,
        "csrf_token": csrf,
    })


@app.post("/api/auth/forgot-password")
def forgot_password():
    payload = request.get_json(silent=True) or {}
    email_raw = payload.get("email")

    is_valid, email_or_err = validate_email(email_raw)
    if not is_valid:
        return json_error(email_or_err, 400)

    user = get_user_by_email(email_or_err)
    if user:
        token, expiry = generate_reset_token()
        from db import set_password_reset_token
        set_password_reset_token(user["id"], token, expiry)

        # In development mode (not production) without configured SMTP: return token safely for local review
        if not IS_PRODUCTION:
            return jsonify({
                "ok": True,
                "message": "Password reset token generated. Since external email service is not configured in this development environment, use the dev token below to reset your password.",
                "dev_reset_token": token,
                "email_configured": False,
            })

    # In production (or if user not found), return safe generic response without exposing token
    return jsonify({
        "ok": True,
        "message": "If an account with that email exists, password reset instructions have been generated.",
        "dev_reset_token": None,
        "email_configured": False,
    })


@app.post("/api/auth/reset-password")
def reset_password():
    payload = request.get_json(silent=True) or {}
    token = payload.get("token")
    new_password = payload.get("password")
    confirm = payload.get("confirm_password")

    if not token or not isinstance(token, str):
        return json_error("Reset token is required.", 400)

    is_valid_pw, pw_err = validate_password(new_password)
    if not is_valid_pw:
        return json_error(pw_err, 400)

    if confirm is not None and new_password != confirm:
        return json_error("Passwords do not match.", 400)

    user = get_user_by_reset_token(token.strip())
    if not user:
        return json_error("Reset token is invalid or has expired.", 400)

    hashed = hash_password(new_password)
    update_user_password(user["id"], hashed)

    # Invalidate session if any
    session.clear()
    return jsonify({"ok": True, "message": "Password has been successfully updated. You can now log in."})


@app.patch("/api/auth/preferences")
@login_required
def update_preferences():
    csrf_err = check_csrf_or_error()
    if csrf_err:
        return csrf_err

    payload = request.get_json(silent=True) or {}
    opt_in = bool(payload.get("store_history_opt_in", False))
    updated = update_user_preferences(g.current_user["id"], opt_in)
    return jsonify({"user": updated})


# ── Prediction History (Protected, User-Isolated) ────────────────

@app.get("/api/history")
@login_required
def get_history():
    history = get_user_prediction_history(g.current_user["id"])
    return jsonify({"history": history})


@app.delete("/api/history")
@login_required
def clear_history():
    csrf_err = check_csrf_or_error()
    if csrf_err:
        return csrf_err

    delete_user_prediction_history(g.current_user["id"])
    return jsonify({"ok": True, "message": "History cleared successfully."})


@app.delete("/api/history/<int:item_id>")
@login_required
def delete_single_history(item_id):
    csrf_err = check_csrf_or_error()
    if csrf_err:
        return csrf_err

    deleted = delete_history_item(g.current_user["id"], item_id)
    if not deleted:
        return json_error("History entry not found or already deleted.", 404)
    return jsonify({"ok": True, "message": "Item deleted."})


# ── Core NLP & Prediction (Protected) ────────────────────────────

@app.post("/api/predict")
@login_required
def predict():
    csrf_err = check_csrf_or_error()
    if csrf_err:
        return csrf_err

    payload = request.get_json(silent=True) or {}
    text, err = validate_text(payload)
    if err:
        return json_error(err, 400)

    try:
        result = predict_sms(text)

        # Store in user history: full text ONLY if user explicitly opted in
        opt_in = bool(g.current_user.get("store_history_opt_in"))
        add_prediction_history(
            user_id=g.current_user["id"],
            prediction=result["prediction"],
            is_spam=result["is_spam"],
            confidence=result["confidence"],
            text_preview=text[:80],
            full_text=text if opt_in else None,
        )

        return jsonify(result)
    except Exception as e:
        return json_error(f"Prediction failed: {str(e)}", 500)


@app.post("/api/analyze")
@login_required
def analyze():
    csrf_err = check_csrf_or_error()
    if csrf_err:
        return csrf_err

    payload = request.get_json(silent=True) or {}
    text, err = validate_text(payload)
    if err:
        return json_error(err, 400)

    try:
        nlp_result = analyze_text(text)
        try:
            pred_result = predict_sms(text)
            nlp_result["prediction"] = pred_result

            # Record in user history
            opt_in = bool(g.current_user.get("store_history_opt_in"))
            add_prediction_history(
                user_id=g.current_user["id"],
                prediction=pred_result["prediction"],
                is_spam=pred_result["is_spam"],
                confidence=pred_result["confidence"],
                text_preview=text[:80],
                full_text=text if opt_in else None,
            )
        except Exception:
            nlp_result["prediction"] = None

        return jsonify(nlp_result)
    except Exception as e:
        return json_error(f"Analysis failed: {str(e)}", 500)


@app.post("/api/similarity")
@login_required
def similarity():
    csrf_err = check_csrf_or_error()
    if csrf_err:
        return csrf_err

    payload = request.get_json(silent=True) or {}
    text1, err1 = validate_text(payload, "text1")
    text2, err2 = validate_text(payload, "text2")
    if err1 or err2:
        return json_error(err1 or err2, 400)

    try:
        result = compare_texts(text1, text2)
        return jsonify(result)
    except Exception as e:
        return json_error(f"Similarity comparison failed: {str(e)}", 500)


@app.post("/api/wordcloud")
@login_required
def wordcloud():
    csrf_err = check_csrf_or_error()
    if csrf_err:
        return csrf_err

    payload = request.get_json(silent=True) or {}
    text, err = validate_text(payload)
    if err:
        return json_error(err, 400)

    try:
        img_url = generate_wordcloud_image(text)
        return jsonify({"image": img_url})
    except Exception as e:
        return json_error(f"Word cloud generation failed: {str(e)}", 500)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
