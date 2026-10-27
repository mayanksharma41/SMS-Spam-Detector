"""
Database module for SMS Spam Detection application.
Uses Python's built-in sqlite3 — no external database server or paid tier needed.
"""
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "data" / "app.db"


def get_db_path(custom_path=None):
    if custom_path:
        return Path(custom_path)
    env_path = os.environ.get("DATABASE_PATH")
    if env_path:
        p = Path(env_path)
        return p if p.is_absolute() else (Path(__file__).resolve().parent / p)
    return DEFAULT_DB_PATH


def get_connection(db_path=None):
    target = get_db_path(db_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path=None):
    """Initializes the database schema if tables do not exist."""
    conn = get_connection(db_path)
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                store_history_opt_in INTEGER NOT NULL DEFAULT 0,
                reset_token TEXT,
                reset_token_expiry TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS prediction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                prediction TEXT NOT NULL,
                is_spam INTEGER NOT NULL,
                confidence REAL NOT NULL,
                text_preview TEXT NOT NULL,
                full_text TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_history_user_created
            ON prediction_history (user_id, created_at DESC);
            """
        )
    conn.close()


# ── User Queries ──────────────────────────────────────────────────

def create_user(email, password_hash, db_path=None):
    """Creates a new user. Returns user dictionary or None if duplicate."""
    conn = get_connection(db_path)
    clean_email = email.strip().lower()
    try:
        with conn:
            cursor = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (clean_email, password_hash),
            )
            user_id = cursor.lastrowid
        return get_user_by_id(user_id, db_path)
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def get_user_by_email(email, db_path=None):
    conn = get_connection(db_path)
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
            (email.strip().lower(),),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id, db_path=None):
    conn = get_connection(db_path)
    try:
        row = conn.execute(
            "SELECT id, email, store_history_opt_in, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_user_preferences(user_id, store_history_opt_in, db_path=None):
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute(
                "UPDATE users SET store_history_opt_in = ? WHERE id = ?",
                (1 if store_history_opt_in else 0, user_id),
            )
        return get_user_by_id(user_id, db_path)
    finally:
        conn.close()


def set_password_reset_token(user_id, token, expiry_iso, db_path=None):
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute(
                "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
                (token, expiry_iso, user_id),
            )
    finally:
        conn.close()


def get_user_by_reset_token(token, db_path=None):
    """Retrieves user if valid, non-expired reset token is provided."""
    if not token:
        return None
    conn = get_connection(db_path)
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE reset_token = ?",
            (token,),
        ).fetchone()
        if not row:
            return None

        # Check expiry
        expiry_str = row["reset_token_expiry"]
        if not expiry_str:
            return None

        try:
            expiry_dt = datetime.fromisoformat(expiry_str)
            now_dt = datetime.now(timezone.utc)
            if expiry_dt.tzinfo is None:
                expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
            if now_dt > expiry_dt:
                return None
        except Exception:
            return None

        return dict(row)
    finally:
        conn.close()


def update_user_password(user_id, new_password_hash, db_path=None):
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute(
                "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
                (new_password_hash, user_id),
            )
    finally:
        conn.close()


# ── Prediction History Queries ────────────────────────────────────

def add_prediction_history(user_id, prediction, is_spam, confidence, text_preview, full_text=None, db_path=None):
    conn = get_connection(db_path)
    try:
        with conn:
            cursor = conn.execute(
                """
                INSERT INTO prediction_history
                (user_id, prediction, is_spam, confidence, text_preview, full_text)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    prediction,
                    1 if is_spam else 0,
                    float(confidence),
                    text_preview[:120],
                    full_text if full_text else None,
                ),
            )
            item_id = cursor.lastrowid
        return item_id
    finally:
        conn.close()


def get_user_prediction_history(user_id, limit=50, db_path=None):
    conn = get_connection(db_path)
    try:
        rows = conn.execute(
            """
            SELECT id, prediction, is_spam, confidence, text_preview, full_text, created_at
            FROM prediction_history
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "prediction": r["prediction"],
                "is_spam": bool(r["is_spam"]),
                "confidence": r["confidence"],
                "text_preview": r["text_preview"],
                "full_text": r["full_text"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]
    finally:
        conn.close()


def delete_user_prediction_history(user_id, db_path=None):
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute(
                "DELETE FROM prediction_history WHERE user_id = ?",
                (user_id,),
            )
    finally:
        conn.close()


def delete_history_item(user_id, item_id, db_path=None):
    conn = get_connection(db_path)
    try:
        with conn:
            cursor = conn.execute(
                "DELETE FROM prediction_history WHERE id = ? AND user_id = ?",
                (item_id, user_id),
            )
            return cursor.rowcount > 0
    finally:
        conn.close()
