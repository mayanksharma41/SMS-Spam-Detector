import base64
import io
import re
from collections import Counter

import nltk
from nltk.corpus import stopwords, wordnet
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk.tokenize import sent_tokenize, word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from wordcloud import WordCloud

# Initialize NLTK components
stemmer = PorterStemmer()
lemmatizer = WordNetLemmatizer()
try:
    stop_words_set = set(stopwords.words("english"))
except Exception:
    nltk.download("stopwords", quiet=True)
    stop_words_set = set(stopwords.words("english"))

PENN_TAG_DESCRIPTIONS = {
    "CC": "Coordinating conjunction (e.g. and, but)",
    "CD": "Cardinal number (e.g. 1, 100)",
    "DT": "Determiner (e.g. the, a, an)",
    "EX": "Existential there",
    "FW": "Foreign word",
    "IN": "Preposition / Subordinating conjunction (e.g. in, from)",
    "JJ": "Adjective (e.g. free, new)",
    "JJR": "Adjective, comparative (e.g. better, larger)",
    "JJS": "Adjective, superlative (e.g. best, greatest)",
    "LS": "List item marker",
    "MD": "Modal auxiliary (e.g. will, can, must)",
    "NN": "Noun, singular or mass (e.g. prize, winner)",
    "NNS": "Noun, plural (e.g. tickets, days)",
    "NNP": "Proper noun, singular (e.g. London, Apple)",
    "NNPS": "Proper noun, plural",
    "PDT": "Predeterminer",
    "POS": "Possessive ending ('s)",
    "PRP": "Personal pronoun (e.g. you, I, he)",
    "PRP$": "Possessive pronoun (e.g. your, my, our)",
    "RB": "Adverb (e.g. urgently, only)",
    "RBR": "Adverb, comparative",
    "RBS": "Adverb, superlative",
    "RP": "Particle (e.g. up, off)",
    "SYM": "Symbol (e.g. %, £, $)",
    "TO": "to (infinitive or preposition)",
    "UH": "Interjection (e.g. oh, hey)",
    "VB": "Verb, base form (e.g. call, claim)",
    "VBD": "Verb, past tense (e.g. won, visited)",
    "VBG": "Verb, gerund or present participle (e.g. meeting)",
    "VBN": "Verb, past participle (e.g. selected, updated)",
    "VBP": "Verb, non-3rd person singular present (e.g. have, want)",
    "VBZ": "Verb, 3rd person singular present (e.g. announces, is)",
    "WDT": "Wh-determiner (e.g. which, that)",
    "WP": "Wh-pronoun (e.g. who, what)",
    "WP$": "Possessive wh-pronoun (whose)",
    "WRB": "Wh-adverb (e.g. where, when)",
    ".": "Sentence-final punctuation (. ! ?)",
    ",": "Comma",
    ":": "Colon, semicolon, or dash",
    "(": "Opening bracket / parenthesis",
    ")": "Closing bracket / parenthesis",
    "$": "Currency symbol",
    "\"": "Quote",
    "''": "Closing quote",
    "``": "Opening quote",
}


def penn_to_wordnet(penn_tag: str):
    """Maps Penn Treebank POS tag to WordNet POS tag for accurate lemmatization."""
    if penn_tag.startswith("J"):
        return wordnet.ADJ
    elif penn_tag.startswith("V"):
        return wordnet.VERB
    elif penn_tag.startswith("N"):
        return wordnet.NOUN
    elif penn_tag.startswith("R"):
        return wordnet.ADV
    return wordnet.NOUN


def analyze_text(text: str):
    """
    Performs comprehensive NLP analysis on the SMS text:
    - Text statistics & readability metrics
    - Tokenization & cleaning
    - Stopword detection & removal
    - Stemming & Lemmatization side-by-side
    - Part-of-Speech tagging with human-readable descriptions
    - Word frequency analysis
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Text cannot be empty.")

    raw_text = text.strip()

    # Sentences & Tokens
    try:
        sentences = sent_tokenize(raw_text)
    except Exception:
        sentences = [raw_text]

    try:
        tokens = word_tokenize(raw_text)
    except Exception:
        tokens = raw_text.split()

    # POS Tagging
    try:
        tagged = nltk.pos_tag(tokens)
    except Exception:
        tagged = [(t, "UNK") for t in tokens]

    pos_results = []
    tokens_detail = []
    morphology = []
    cleaned_words = []
    detected_stopwords = []

    for word, tag in tagged:
        is_punct = not bool(re.search(r"\w", word))
        is_sw = word.lower() in stop_words_set and not is_punct
        desc = PENN_TAG_DESCRIPTIONS.get(tag, f"Part of speech ({tag})")

        wn_pos = penn_to_wordnet(tag)
        stem = stemmer.stem(word.lower()) if not is_punct else word
        try:
            lemma = lemmatizer.lemmatize(word.lower(), pos=wn_pos) if not is_punct else word
        except Exception:
            lemma = word.lower()

        pos_results.append({
            "word": word,
            "tag": tag,
            "description": desc,
            "is_punctuation": is_punct,
        })

        if is_sw:
            detected_stopwords.append(word.lower())

        if not is_punct:
            cleaned_words.append(word.lower())
            morphology.append({
                "word": word,
                "stem": stem,
                "lemma": lemma,
                "pos_tag": tag,
                "is_stopword": is_sw,
            })

        tokens_detail.append({
            "token": word,
            "cleaned": word.lower() if not is_punct else "",
            "is_stopword": is_sw,
            "is_punctuation": is_punct,
            "filtered": "" if (is_sw or is_punct) else word.lower(),
        })

    # Word frequencies (excluding stopwords and punctuation)
    meaningful_words = [w for w in cleaned_words if w not in stop_words_set]
    word_counts = Counter(meaningful_words if meaningful_words else cleaned_words)
    word_frequencies = [
        {"word": w, "count": c}
        for w, c in word_counts.most_common(15)
    ]

    # Statistics
    words_count = len(cleaned_words)
    unique_words_count = len(set(cleaned_words))
    lexical_diversity = round(unique_words_count / words_count, 4) if words_count > 0 else 0
    uppercase_words = [w for w in tokens if len(w) > 1 and w.isupper()]
    digits_found = re.findall(r"\d+", raw_text)
    symbols_found = re.findall(r"[\$£€%&!#@\*\?]", raw_text)

    statistics = {
        "characters": len(raw_text),
        "characters_no_spaces": len(raw_text.replace(" ", "")),
        "words": words_count,
        "sentences": len(sentences),
        "unique_words": unique_words_count,
        "lexical_diversity": lexical_diversity,
        "total_tokens": len(tokens),
        "stopwords_count": len(detected_stopwords),
        "uppercase_words_count": len(uppercase_words),
        "digits_count": len(digits_found),
        "symbols_count": len(symbols_found),
    }

    return {
        "text": raw_text,
        "statistics": statistics,
        "tokens": tokens_detail,
        "pos_tags": pos_results,
        "morphology": morphology,
        "stopwords": {
            "count": len(detected_stopwords),
            "detected": sorted(list(set(detected_stopwords))),
            "filtered_text": " ".join(meaningful_words),
        },
        "word_frequencies": word_frequencies,
    }


def compare_texts(text1: str, text2: str):
    """
    Computes TF-IDF cosine similarity between two texts.
    Returns cosine similarity score between 0.0 and 1.0.
    """
    t1 = (text1 or "").strip()
    t2 = (text2 or "").strip()
    if not t1 or not t2:
        raise ValueError("Both text1 and text2 must be non-empty strings.")

    vectorizer = TfidfVectorizer(stop_words="english")
    try:
        tfidf = vectorizer.fit_transform([t1, t2])
        score = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
    except Exception:
        # Fallback if vocabulary is completely empty after stop words
        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform([t1, t2])
        score = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])

    return {
        "score": round(score, 4),
        "percentage": round(score * 100, 2),
        "text1_length": len(t1),
        "text2_length": len(t2),
    }


def generate_wordcloud_image(text: str):
    """
    Generates a word cloud PNG image returned as a base64 Data URL.
    """
    clean_text = (text or "").strip()
    if not clean_text:
        raise ValueError("Text cannot be empty.")

    wc = WordCloud(
        width=700,
        height=350,
        background_color="#ffffff",
        colormap="plasma",
        stopwords=stop_words_set,
        max_words=60,
        collocations=False,
    )

    # If text is too sparse or all stopwords
    try:
        wc.generate(clean_text)
    except ValueError:
        wc.generate(clean_text + " sms text nlp")

    img = wc.to_image()
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    b64_data = base64.b64encode(buf.getvalue()).decode("ascii")

    return f"data:image/png;base64,{b64_data}"
