"""
Test suite for the SMS Spam Detection backend API.
Uses pytest with Flask's test client — no running server required.

Run: cd backend && python -m pytest tests/ -v
"""
import json
import sys
from pathlib import Path

import pytest

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import app as flask_app


@pytest.fixture
def client():
    """Flask test client fixture with an authenticated test user session."""
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        # Create or log in test user
        client.post(
            "/api/auth/register",
            data=json.dumps({
                "email": "api_tester@example.com",
                "password": "Password123",
                "confirm_password": "Password123",
            }),
            content_type="application/json",
        )
        res = client.post(
            "/api/auth/login",
            data=json.dumps({"email": "api_tester@example.com", "password": "Password123"}),
            content_type="application/json",
        )
        csrf = res.get_json().get("csrf_token") if res.status_code == 200 else ""
        if csrf:
            client.environ_base["HTTP_X_CSRF_TOKEN"] = csrf
        yield client


# ── 1. Health Check ──────────────────────────────────────────────

class TestHealth:
    def test_health_returns_ok(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["ok"] is True
        assert data["service"] == "sms-spam-detection"

    def test_health_reports_model_status(self, client):
        resp = client.get("/api/health")
        data = resp.get_json()
        assert "model_ready" in data
        assert isinstance(data["model_ready"], bool)


# ── 2. Model Metrics ────────────────────────────────────────────

class TestModelMetrics:
    def test_metrics_endpoint_returns_200(self, client):
        resp = client.get("/api/model/metrics")
        assert resp.status_code == 200

    def test_metrics_contain_expected_fields(self, client):
        resp = client.get("/api/model/metrics")
        data = resp.get_json()
        for key in ("accuracy", "precision", "recall", "f1_score", "confusion_matrix"):
            assert key in data, f"Missing metric field: {key}"

    def test_metrics_values_are_valid(self, client):
        resp = client.get("/api/model/metrics")
        data = resp.get_json()
        for key in ("accuracy", "precision", "recall", "f1_score"):
            assert 0.0 <= data[key] <= 1.0, f"{key} out of [0, 1] range"

    def test_confusion_matrix_has_required_keys(self, client):
        resp = client.get("/api/model/metrics")
        cm = resp.get_json()["confusion_matrix"]
        for key in ("tn", "fp", "fn", "tp"):
            assert key in cm
            assert isinstance(cm[key], int)


# ── 3. Spam Prediction ──────────────────────────────────────────

class TestPrediction:
    def test_spam_message_detected(self, client):
        """A clearly spammy message should be classified as Spam."""
        resp = client.post(
            "/api/predict",
            data=json.dumps({"text": "WINNER! You have won a £1,000 cash prize. Call 09061701461 to claim now."}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_spam"] is True
        assert data["prediction"] == "Spam"

    def test_ham_message_detected(self, client):
        """A clearly normal message should be classified as Not Spam."""
        resp = client.post(
            "/api/predict",
            data=json.dumps({"text": "Hey, are we still meeting at the park tomorrow at 5pm?"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_spam"] is False
        assert data["prediction"] == "Not Spam"

    def test_prediction_response_structure(self, client):
        """Verify prediction response includes all expected fields."""
        resp = client.post(
            "/api/predict",
            data=json.dumps({"text": "Hello there, how are you?"}),
            content_type="application/json",
        )
        data = resp.get_json()
        required_fields = (
            "text", "prediction", "is_spam", "confidence",
            "spam_probability", "ham_probability", "spam_cues",
        )
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_probabilities_are_valid(self, client):
        """Spam and ham probabilities should sum to approximately 100%."""
        resp = client.post(
            "/api/predict",
            data=json.dumps({"text": "Free entry in a weekly competition to win cash prizes"}),
            content_type="application/json",
        )
        data = resp.get_json()
        total = data["spam_probability"] + data["ham_probability"]
        assert 99.0 <= total <= 101.0, f"Probabilities sum to {total}, expected ~100"

    def test_empty_text_returns_400(self, client):
        """Empty text should be rejected with 400."""
        resp = client.post(
            "/api/predict",
            data=json.dumps({"text": ""}),
            content_type="application/json",
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_missing_text_field_returns_400(self, client):
        """Missing 'text' field should return 400."""
        resp = client.post(
            "/api/predict",
            data=json.dumps({"message": "hello"}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_invalid_json_returns_400(self, client):
        """Malformed JSON should be handled gracefully."""
        resp = client.post(
            "/api/predict",
            data="not valid json",
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_whitespace_only_text_returns_400(self, client):
        resp = client.post(
            "/api/predict",
            data=json.dumps({"text": "   "}),
            content_type="application/json",
        )
        assert resp.status_code == 400


# ── 4. NLP Analysis ─────────────────────────────────────────────

class TestAnalysis:
    def test_analyze_returns_statistics(self, client):
        resp = client.post(
            "/api/analyze",
            data=json.dumps({"text": "Hello world, this is a test message for NLP analysis."}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "statistics" in data
        assert "tokens" in data
        assert "pos_tags" in data
        assert "morphology" in data

    def test_analyze_includes_prediction(self, client):
        resp = client.post(
            "/api/analyze",
            data=json.dumps({"text": "Hey, are you coming to the meeting today?"}),
            content_type="application/json",
        )
        data = resp.get_json()
        assert "prediction" in data
        # Prediction should be a dict with prediction details
        assert data["prediction"] is not None
        assert "is_spam" in data["prediction"]

    def test_analyze_word_frequencies(self, client):
        resp = client.post(
            "/api/analyze",
            data=json.dumps({"text": "test test test message message analysis"}),
            content_type="application/json",
        )
        data = resp.get_json()
        assert "word_frequencies" in data
        assert len(data["word_frequencies"]) > 0

    def test_analyze_empty_text_returns_400(self, client):
        resp = client.post(
            "/api/analyze",
            data=json.dumps({"text": ""}),
            content_type="application/json",
        )
        assert resp.status_code == 400


# ── 5. Text Similarity ──────────────────────────────────────────

class TestSimilarity:
    def test_similar_texts_high_score(self, client):
        resp = client.post(
            "/api/similarity",
            data=json.dumps({
                "text1": "You have won a cash prize of 1000 pounds",
                "text2": "You have been awarded a cash prize of 1000 pounds",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["score"] > 0.5

    def test_dissimilar_texts_low_score(self, client):
        resp = client.post(
            "/api/similarity",
            data=json.dumps({
                "text1": "Free cash prize call now to claim",
                "text2": "Hey are we meeting for lunch tomorrow at noon",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["score"] < 0.5

    def test_similarity_missing_text2_returns_400(self, client):
        resp = client.post(
            "/api/similarity",
            data=json.dumps({"text1": "hello"}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_similarity_response_fields(self, client):
        resp = client.post(
            "/api/similarity",
            data=json.dumps({"text1": "hello world", "text2": "hello there"}),
            content_type="application/json",
        )
        data = resp.get_json()
        assert "score" in data
        assert "percentage" in data
        assert 0.0 <= data["score"] <= 1.0


# ── 6. Word Cloud ────────────────────────────────────────────────

class TestWordCloud:
    def test_wordcloud_returns_base64_image(self, client):
        resp = client.post(
            "/api/wordcloud",
            data=json.dumps({"text": "Free cash prize winner congratulations claim reward money call now"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "image" in data
        assert data["image"].startswith("data:image/png;base64,")

    def test_wordcloud_empty_text_returns_400(self, client):
        resp = client.post(
            "/api/wordcloud",
            data=json.dumps({"text": ""}),
            content_type="application/json",
        )
        assert resp.status_code == 400


# ── 7. Samples ───────────────────────────────────────────────────

class TestSamples:
    def test_samples_list(self, client):
        resp = client.get("/api/samples")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "samples" in data
        assert len(data["samples"]) >= 4  # At least the 4 bundled examples

    def test_sample_by_id(self, client):
        resp = client.get("/api/samples/example-personal")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["id"] == "example-personal"
        assert "text" in data

    def test_sample_not_found(self, client):
        resp = client.get("/api/samples/nonexistent-id")
        assert resp.status_code == 404


# ── 8. Evaluation Consistency ────────────────────────────────────

class TestEvaluationConsistency:
    def test_confusion_matrix_sums_to_test_size(self, client):
        """The confusion matrix values should sum to the test set size."""
        resp = client.get("/api/model/metrics")
        data = resp.get_json()
        cm = data["confusion_matrix"]
        total = cm["tn"] + cm["fp"] + cm["fn"] + cm["tp"]
        assert total == data["test_size"], (
            f"CM total ({total}) != test_size ({data['test_size']})"
        )

    def test_accuracy_matches_confusion_matrix(self, client):
        """Accuracy from metrics should approximately match (TN+TP)/total."""
        resp = client.get("/api/model/metrics")
        data = resp.get_json()
        cm = data["confusion_matrix"]
        total = cm["tn"] + cm["fp"] + cm["fn"] + cm["tp"]
        computed_acc = (cm["tn"] + cm["tp"]) / total
        assert abs(computed_acc - data["accuracy"]) < 0.01, (
            f"Computed accuracy {computed_acc:.4f} != reported {data['accuracy']}"
        )
