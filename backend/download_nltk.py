"""
Downloads required NLTK data packages for the SMS Spam Detection backend.
Run once after installing dependencies: python download_nltk.py
"""
import nltk

REQUIRED_PACKAGES = [
    "punkt",
    "punkt_tab",
    "averaged_perceptron_tagger",
    "averaged_perceptron_tagger_eng",
    "stopwords",
    "wordnet",
]


def download_all():
    print("Downloading required NLTK data packages...")
    for pkg in REQUIRED_PACKAGES:
        print(f"  → {pkg}", end=" ")
        try:
            nltk.download(pkg, quiet=True)
            print("✓")
        except Exception as e:
            print(f"✗ ({e})")
    print("Done.")


if __name__ == "__main__":
    download_all()
