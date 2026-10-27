from pathlib import Path

# Clearly labeled illustrative examples — NOT loaded from the SMS Spam Collection dataset.
# These are synthetic messages created for demonstration purposes only.
BUNDLED_EXAMPLES = [
    {
        "id": "example-personal",
        "source": "example",
        "label": "Personal Message (Ham)",
        "text": "Hey, are we still meeting at Central Park at 5pm? Bring the tickets for the concert.",
    },
    {
        "id": "example-notification",
        "source": "example",
        "label": "Service Notification (Ham)",
        "text": (
            "Your Amazon order #402-9831 has been shipped. "
            "Expected delivery: Thursday, Oct 15. Track at amazon.com/orders"
        ),
    },
    {
        "id": "example-promo-spam",
        "source": "example",
        "label": "Promotional Spam",
        "text": (
            "WINNER!! As a valued network customer you have been selected to receive "
            "a £900 prize reward! To claim call 09061701461. Claim code KL341. Valid 12 hours only."
        ),
    },
    {
        "id": "example-phishing-spam",
        "source": "example",
        "label": "Phishing-Style Spam",
        "text": (
            "URGENT: Your bank account has been compromised. "
            "Verify your identity immediately at http://secure-bank-login.com or your account will be suspended."
        ),
    },
]

DATASET_PATH = Path(__file__).resolve().parent.parent / "data" / "SMSSpamCollection"
FALLBACK_DATASET_PATH = Path(__file__).resolve().parent.parent / "data" / "spam.csv"


def get_dataset_path():
    if DATASET_PATH.is_file():
        return DATASET_PATH
    if FALLBACK_DATASET_PATH.is_file():
        return FALLBACK_DATASET_PATH
    return DATASET_PATH


def parse_dataset(file_path=None):
    """
    Parses tab-separated SMS Spam Collection file (<label>\\t<message_text>).
    Preserves text content with commas, punctuation, and quotes intact.
    Returns:
        records: list of dicts with {"label": "ham"|"spam", "text": "..."}
        stats: summary dict with total, ham, spam, and malformed counts
    """
    target_path = Path(file_path) if file_path else get_dataset_path()
    if not target_path.is_file():
        return [], {"total": 0, "ham": 0, "spam": 0, "malformed": 0, "available": False}

    records = []
    malformed_rows = []
    counts = {"ham": 0, "spam": 0}

    with open(target_path, "r", encoding="utf-8", errors="replace") as f:
        for line_num, line in enumerate(f, 1):
            line = line.rstrip("\r\n")
            if not line.strip():
                continue
            parts = line.split("\t", 1)
            if len(parts) != 2:
                malformed_rows.append({"line": line_num, "reason": "Missing tab separator", "content": line})
                continue
            label, text = parts[0].strip().lower(), parts[1].strip()
            if label not in ("ham", "spam"):
                malformed_rows.append({"line": line_num, "reason": f"Unknown label '{label}'", "content": line})
                continue
            counts[label] += 1
            records.append({"label": label, "text": text})

    stats = {
        "available": True,
        "total": len(records),
        "ham": counts["ham"],
        "spam": counts["spam"],
        "malformed": len(malformed_rows),
        "malformed_rows": malformed_rows,
        "file_path": str(target_path),
    }
    return records, stats


def list_samples():
    samples = list(BUNDLED_EXAMPLES)
    records, stats = parse_dataset()
    dataset_available = stats["available"]

    # When genuine dataset is available, include representative authentic SMS samples
    if dataset_available and records:
        first_ham = next((r for r in records if r["label"] == "ham"), None)
        first_spam = next((r for r in records if r["label"] == "spam"), None)
        if first_ham:
            samples.append({
                "id": "dataset-ham-1",
                "source": "dataset",
                "label": "Dataset Ham — Authentic",
                "text": first_ham["text"],
            })
        if first_spam:
            samples.append({
                "id": "dataset-spam-1",
                "source": "dataset",
                "label": "Dataset Spam — Authentic",
                "text": first_spam["text"],
            })

    dataset_note = (
        f"SMS Spam Collection loaded ({stats['total']:,} messages: {stats['ham']:,} ham, {stats['spam']:,} spam)."
        if dataset_available
        else "SMS dataset not present. Using labeled examples only."
    )

    return {
        "samples": samples,
        "dataset_available": dataset_available,
        "dataset_note": dataset_note,
        "dataset_stats": stats if dataset_available else None,
    }


def get_sample_by_id(sample_id):
    all_samples = list_samples()["samples"]
    for item in all_samples:
        if item["id"] == sample_id:
            return item
    return None
