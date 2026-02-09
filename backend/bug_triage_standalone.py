# ============================================
# AI POWERED BUG TRIAGE SYSTEM (FULL VERSION)
# Bug types: Functional Error, Design Level, Systematic, Performance
# ============================================

import pandas as pd
import numpy as np
import os
import time

# ============================================
# LOAD DATA
# ============================================

print("Loading dataset...")
df = pd.read_json("embold_train.json")

df["text"] = df["title"].fillna("") + " " + df["body"].fillna("")

# ============================================
# TF-IDF FEATURE ENGINEERING
# ============================================

from sklearn.feature_extraction.text import TfidfVectorizer

tfidf = TfidfVectorizer(stop_words="english", max_features=10000)
X = tfidf.fit_transform(df["text"])

# ============================================
# BUG TYPE KEYWORDS (Document & Code analysis)
# ============================================

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


def get_bug_type(text, design_pred, perf_pred):
    """
    Classify bug into: Functional Error, Design Level, Systematic, Performance.
    """
    t = text.lower()
    if perf_pred or any(w in t for w in PERFORMANCE_KEYWORDS):
        return "Performance"
    if design_pred or any(w in t for w in DESIGN_KEYWORDS):
        return "Design Level"
    if any(w in t for w in SYSTEMATIC_KEYWORDS):
        return "Systematic"
    return "Functional Error"


# ============================================
# MODEL 1 — FIX TIME PREDICTION (REGRESSION)
# ============================================

def estimate_time(text):
    words = len(text.split())
    if words > 150:
        return np.random.randint(6, 10)
    elif words > 60:
        return np.random.randint(3, 6)
    else:
        return np.random.randint(1, 3)

df["fix_days"] = df["text"].apply(estimate_time)
y_time = df["fix_days"]

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

X_train, X_test, y_train, y_test = train_test_split(X, y_time, test_size=0.2)
model_time = LinearRegression()
model_time.fit(X_train, y_train)
pred_time = model_time.predict(X_test)

print("\n===== Time Model =====")
print("MAE:", mean_absolute_error(y_test, pred_time))
print("R2:", r2_score(y_test, pred_time))

# ============================================
# MODEL 2 — DESIGN BUG DETECTION
# ============================================

def is_design_bug(text):
    text = text.lower()
    return 1 if any(w in text for w in DESIGN_KEYWORDS) else 0

df["design_bug"] = df["text"].apply(is_design_bug)
y_design = df["design_bug"]

from sklearn.linear_model import LogisticRegression

X_train, X_test, y_train, y_test = train_test_split(X, y_design, test_size=0.2)
model_design = LogisticRegression(max_iter=1000)
model_design.fit(X_train, y_train)

# ============================================
# MODEL 3 — PERFORMANCE BUG DETECTION
# ============================================

def is_perf_bug(text):
    text = text.lower()
    return 1 if any(w in text for w in PERFORMANCE_KEYWORDS) else 0

df["perf_bug"] = df["text"].apply(is_perf_bug)
y_perf = df["perf_bug"]

X_train, X_test, y_train, y_test = train_test_split(X, y_perf, test_size=0.2)
model_perf = LogisticRegression(max_iter=1000)
model_perf.fit(X_train, y_train)

# ============================================
# SEVERITY + PRIORITY FUNCTIONS
# ============================================

def severity_score(text):
    text = text.lower()
    if any(w in text for w in ["crash", "fatal", "security", "data loss"]):
        return 2
    elif any(w in text for w in ["error", "fail", "bug"]):
        return 1
    else:
        return 0


def color_text(text, color):
    colors = {
        "red": "\033[91m",
        "yellow": "\033[93m",
        "green": "\033[92m",
        "end": "\033[0m"
    }
    return colors[color] + text + colors["end"]


max_fix = df["fix_days"].max()

# ============================================
# ANALYSIS FUNCTION (CORE AI ENGINE)
# ============================================

def analyze(text):
    vec = tfidf.transform([text])

    fix_time = model_time.predict(vec)[0]
    design = model_design.predict(vec)[0]
    perf = model_perf.predict(vec)[0]

    bug_type = get_bug_type(text, design, perf)

    sev = severity_score(text)
    time_norm = fix_time / max_fix
    priority = 40 * design + 30 * perf + 20 * sev + 10 * time_norm

    if priority > 70:
        level = "HIGH"
        color = "red"
    elif priority > 40:
        level = "MEDIUM"
        color = "yellow"
    else:
        level = "LOW"
        color = "green"

    print("\n" + "=" * 50)
    print(color_text("AI ANALYSIS RESULT", color))
    print("Bug Type:", bug_type)
    print("Fix Time:", round(fix_time, 2), "days")
    print("Design Issue:", "Yes" if design else "No")
    print("Performance Issue:", "Yes" if perf else "No")
    print("Severity Level:", level)
    print("Priority Score:", round(priority, 2))
    print("=" * 50)
# ============================================
# AUTO DETECT MODE
# ============================================

print("\n AUTO DETECT MODE STARTED")
print("Bug types: Functional Error | Design Level | Systematic | Performance")
print("Type bug description (or type 'exit'):\n")

while True:
    user_text = input(">> ")

    if user_text.lower() == "exit":
        break

    analyze(user_text)
