# BugPredict – AI Bug Triage API
# Run: python server.py   (from repo root or from backend/)
# Requires: pip install flask flask-cors

import os
import sys

# Ensure backend is on path and load triage model
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from flask import Flask, request, jsonify

app = Flask(__name__)

# CORS so frontend (e.g. localhost:3000 or :8080) can call this API
try:
    from flask_cors import CORS
    CORS(app, origins=["*"])
except ImportError:
    @app.after_request
    def add_cors_headers(resp):
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return resp


# Load AI model at startup
import triage_model
_load_ok, _load_err = triage_model.load_models()
if not _load_ok:
    print("Warning:", _load_err)
    print("API will return errors until embold_train.json is added to backend/")
else:
    print("AI triage model loaded successfully.")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "model_loaded": _load_ok,
        "message": "BugPredict API running"
    })


@app.route("/api/analyze", methods=["POST", "OPTIONS"])
def analyze():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json(silent=True) or {}
    text = data.get("text") or data.get("code") or ""
    result = triage_model.analyze(text)
    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("Starting BugPredict API at http://localhost:{}".format(port))
    print("POST /api/analyze with JSON body: { \"text\": \"your bug description or code\" }")
    app.run(host="0.0.0.0", port=port, debug=True)
