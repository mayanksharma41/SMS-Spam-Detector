import json
import os
import re
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

from nlp.samples import parse_dataset

MODEL_DIR = Path(__file__).resolve().parent.parent / "model"
PIPELINE_PATH = MODEL_DIR / "spam_detector_pipeline.joblib"
METRICS_PATH = MODEL_DIR / "model_metrics.json"

_cached_pipeline = None


def get_model_directory():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    return MODEL_DIR


def train_and_save_model():
    """
    Trains a genuine Multinomial Naive Bayes classifier with TF-IDF vectorization
    on the authentic SMSSpamCollection dataset using a stratified 80/20 train/test split.
    Calculates genuine evaluation metrics (accuracy, precision, recall, F1, confusion matrix)
    on the held-out test set and serializes the pipeline and metrics.
    """
    global _cached_pipeline

    records, dataset_stats = parse_dataset()
    if not dataset_stats["available"] or len(records) == 0:
        raise RuntimeError("SMSSpamCollection dataset is not available for training.")

    texts = [r["text"] for r in records]
    # 1 for spam, 0 for ham
    labels = [1 if r["label"] == "spam" else 0 for r in records]

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=5000,
        sublinear_tf=True,
    )
    classifier = MultinomialNB(alpha=0.2)

    pipeline = Pipeline([
        ("tfidf", vectorizer),
        ("clf", classifier),
    ])

    pipeline.fit(X_train, y_train)

    # Evaluate on held-out test data
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="binary", pos_label=1
    )
    cm = confusion_matrix(y_test, y_pred)
    # cm format: [[TN, FP], [FN, TP]]
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]

    # Extract top spam-indicative keywords from model weights
    feature_names = np.array(vectorizer.get_feature_names_out())
    log_diff = classifier.feature_log_prob_[1] - classifier.feature_log_prob_[0]
    top_indices = np.argsort(log_diff)[-20:][::-1]
    top_spam_keywords = [
        {"keyword": str(feature_names[i]), "weight": round(float(log_diff[i]), 3)}
        for i in top_indices
    ]

    metrics = {
        "model_name": "Multinomial Naive Bayes + TF-IDF",
        "algorithm": "MultinomialNB(alpha=0.2)",
        "vectorizer": "TfidfVectorizer(ngram_range=(1, 2), max_features=5000, sublinear_tf=True)",
        "trained_at": datetime.now().isoformat(),
        "dataset_total": len(records),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "accuracy": round(acc, 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": {
            "tn": tn,
            "fp": fp,
            "fn": fn,
            "tp": tp,
            "total_test": len(X_test),
        },
        "top_spam_keywords": top_spam_keywords,
    }

    # Save to disk
    get_model_directory()
    joblib.dump(pipeline, PIPELINE_PATH)
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    _cached_pipeline = pipeline
    return metrics


def get_pipeline():
    global _cached_pipeline
    if _cached_pipeline is not None:
        return _cached_pipeline

    if PIPELINE_PATH.is_file():
        try:
            _cached_pipeline = joblib.load(PIPELINE_PATH)
            return _cached_pipeline
        except Exception:
            pass

    # Train if not already saved
    train_and_save_model()
    return _cached_pipeline


def get_model_metrics():
    if not METRICS_PATH.is_file():
        return train_and_save_model()

    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return train_and_save_model()


def detect_spam_cues(text: str, top_keywords: list = None):
    """
    Identifies concrete spam cues/patterns in the SMS text.
    """
    cues = []
    lower = text.lower()

    # Urgency & Financial keywords
    urgency_patterns = [
        (r"\b(urgent|immediately|act now|hurry|valid \d+ hours?)\b", "Urgency language"),
        (r"\b(won|winner|jackpot|awarded|selected|claim|prize|congratulations)\b", "Prize / Claim announcement"),
        (r"\b(free|freeentry|complimentary|gift)\b", "Free offer / Promotion"),
        (r"\b(cash|credit|loan|\$|\£|\€|\b1000\b|\b5000\b)\b", "Financial / Money incentive"),
        (r"\b(txt|text to|send to \d+|call \d{6,}|reply to \d+)\b", "Direct phone / SMS call-to-action"),
        (r"(http[s]?://|www\.|\.co\.uk|\.com|\.net)", "Web link / Domain"),
    ]

    for pattern, description in urgency_patterns:
        matches = re.findall(pattern, lower)
        if matches:
            unique_matches = sorted(list(set(matches)))
            cues.append({
                "type": description,
                "matches": unique_matches[:5],
            })

    # Uppercase words (e.g. WINNER, FREE, URGENT)
    words = re.findall(r"\b[A-Z]{3,}\b", text)
    if words:
        cues.append({
            "type": "Capitalized emphasis words",
            "matches": list(set(words))[:5],
        })

    # High digit density / phone numbers
    digits = re.findall(r"\d{5,}", text)
    if digits:
        cues.append({
            "type": "Shortcodes / Premium phone numbers",
            "matches": digits[:5],
        })

    return cues


def predict_sms(text: str):
    """
    Predicts whether an SMS message is Spam or Ham (Not Spam) using the trained pipeline.
    Returns prediction, probabilities, confidence, and detected cues.
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("SMS text cannot be empty.")

    pipeline = get_pipeline()
    clean_text = text.strip()

    # Probabilities: [P(Ham), P(Spam)]
    probas = pipeline.predict_proba([clean_text])[0]
    ham_prob = float(probas[0])
    spam_prob = float(probas[1])

    is_spam = bool(spam_prob >= 0.5)
    prediction = "Spam" if is_spam else "Not Spam"
    confidence = spam_prob if is_spam else ham_prob

    metrics = get_model_metrics()
    cues = detect_spam_cues(clean_text, metrics.get("top_spam_keywords", []))

    # Highlight which top spam vocabulary words are present in this text
    matched_spam_features = []
    lower_text = clean_text.lower()
    for item in metrics.get("top_spam_keywords", []):
        kw = item["keyword"]
        if re.search(r"\b" + re.escape(kw) + r"\b", lower_text):
            matched_spam_features.append(item)

    return {
        "text": clean_text,
        "prediction": prediction,
        "is_spam": is_spam,
        "confidence": round(confidence * 100, 2),
        "spam_probability": round(spam_prob * 100, 2),
        "ham_probability": round(ham_prob * 100, 2),
        "spam_cues": cues,
        "matched_spam_keywords": matched_spam_features,
        "model_name": metrics.get("model_name"),
    }
