# ============================================
# AI POWERED BUG TRIAGE SYSTEM (BACKEND MODULE)
# ============================================
# Load embold_train.json into backend/ to train the model.
# Exposes analyze(text) -> dict for API use.

import os
import numpy as np

# Optional: pandas, sklearn - only needed when training
try:
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.model_selection import train_test_split
    from sklearn.linear_model import LogisticRegression, LinearRegression
except ImportError:
    pd = None
    TfidfVectorizer = None
    train_test_split = None
    LogisticRegression = None
    LinearRegression = None

_MODEL_LOADED = False
tfidf = None
model = None
model_time = None
model_design = None
model_perf = None
max_fix = 1.0

# Bug types: Functional Error, Design Level, Systematic, Performance
PERFORMANCE_KEYWORDS = [
    "slow", "latency", "lag", "freeze", "timeout",
    "memory leak", "cpu", "bottleneck", "delay"
]
DESIGN_KEYWORDS = [
    "architecture", "scalability", "memory", "deadlock",
    "concurrency", "thread", "security", "database",
    "design flaw", "optimization", "latency"
]
SYSTEMATIC_KEYWORDS = [
    "integration", "api", "network", "infrastructure",
    "deployment", "configuration", "system crash", "build",
    "dependency", "environment", "deploy", "compile"
]
FUNCTIONAL_KEYWORDS = [
    "crash", "error", "fail", "incorrect", "wrong", "bug",
    "exception", "null pointer", "undefined", "logic error"
]


def _get_bug_type(text, design_pred, perf_pred):
    """
    Classify bug into: Functional Error, Design Level, Systematic, Performance.
    Uses model predictions + keyword analysis of document/code.
    """
    t = text.lower()
    # Check in order of specificity
    if perf_pred or any(w in t for w in PERFORMANCE_KEYWORDS):
        return "Performance"
    if design_pred or any(w in t for w in DESIGN_KEYWORDS):
        return "Design Level"
    if any(w in t for w in SYSTEMATIC_KEYWORDS):
        return "Systematic"
    return "Functional Error"


def _estimate_time(text):
    words = len(text.split())
    if words > 150:
        return np.random.randint(6, 10)
    elif words > 60:
        return np.random.randint(3, 6)
    else:
        return np.random.randint(1, 3)


def _severity_score(text):
    text = text.lower()
    if any(w in text for w in ["crash", "fatal", "security", "data loss"]):
        return 2
    elif any(w in text for w in ["error", "fail", "bug"]):
        return 1
    return 0


def load_models(data_path=None):
    """Load dataset and train models. Call once at server startup."""
    global _MODEL_LOADED, tfidf, model, model_time, model_design, model_perf, max_fix

    if pd is None or TfidfVectorizer is None:
        return False, "Missing dependencies: pip install pandas scikit-learn"

    if data_path is None:
        data_path = os.path.join(os.path.dirname(__file__), "embold_train.json")
    if not os.path.isfile(data_path):
        return False, "embold_train.json not found in backend/. Add it to train the AI model."

    try:
        df = pd.read_json(data_path)
    except Exception as e:
        return False, "Invalid embold_train.json: " + str(e)

    df["text"] = df["title"].fillna("") + " " + df["body"].fillna("")

    # TF-IDF
    tfidf = TfidfVectorizer(stop_words="english", max_features=10000)
    X = tfidf.fit_transform(df["text"])

    # Model 1 — Bug type
    y = df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    # Model 2 — Fix time
    design_keywords = [
        "architecture", "scalability", "memory", "deadlock",
        "concurrency", "thread", "security", "database",
        "design flaw", "optimization", "latency"
    ]
    perf_keywords = [
        "slow", "latency", "lag", "freeze", "timeout",
        "memory leak", "cpu", "bottleneck", "delay"
    ]

    df["fix_days"] = df["text"].apply(_estimate_time)
    y_time = df["fix_days"]
    X_train, X_test, y_train, y_test = train_test_split(X, y_time, test_size=0.2)
    model_time = LinearRegression()
    model_time.fit(X_train, y_train)
    max_fix = float(df["fix_days"].max()) or 1.0

    def _is_design_bug(text):
        t = text.lower()
        return 1 if any(w in t for w in design_keywords) else 0

    def _is_perf_bug(text):
        t = text.lower()
        return 1 if any(w in t for w in perf_keywords) else 0

    df["design_bug"] = df["text"].apply(_is_design_bug)
    df["perf_bug"] = df["text"].apply(_is_perf_bug)

    y_design = df["design_bug"]
    X_train, X_test, y_train, y_test = train_test_split(X, y_design, test_size=0.2)
    model_design = LogisticRegression(max_iter=1000)
    model_design.fit(X_train, y_train)

    y_perf = df["perf_bug"]
    X_train, X_test, y_train, y_test = train_test_split(X, y_perf, test_size=0.2)
    model_perf = LogisticRegression(max_iter=1000)
    model_perf.fit(X_train, y_train)

    # Store in module globals (assign after success)
    globals()["tfidf"] = tfidf
    globals()["model"] = model
    globals()["model_time"] = model_time
    globals()["model_design"] = model_design
    globals()["model_perf"] = model_perf
    globals()["max_fix"] = max_fix
    globals()["_MODEL_LOADED"] = True
    return True, None


def analyze(text):
    """
    Run AI triage on a single text (bug description or code snippet).
    Returns a dict suitable for JSON API.
    """
    if not text or not isinstance(text, str):
        text = ""

    if not _MODEL_LOADED:
        return {
            "ok": False,
            "error": "Model not loaded. Add backend/embold_train.json and restart the server.",
            "bug_type": "—",
            "fix_days": 0,
            "design_issue": False,
            "performance_issue": False,
            "severity_level": "LOW",
            "priority_score": 0,
        }

    vec = tfidf.transform([text])
    fix_time = float(model_time.predict(vec)[0])
    design = int(model_design.predict(vec)[0])
    perf = int(model_perf.predict(vec)[0])
    sev = _severity_score(text)
    time_norm = fix_time / max_fix
    priority = 40 * design + 30 * perf + 20 * sev + 10 * time_norm

    bug_type = _get_bug_type(text, design, perf)

    if priority > 70:
        level = "HIGH"
    elif priority > 40:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "ok": True,
        "bug_type": bug_type,
        "fix_days": round(fix_time, 2),
        "design_issue": bool(design),
        "performance_issue": bool(perf),
        "severity_level": level,
        "priority_score": round(priority, 2),
    }
