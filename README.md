# BugPredict – Automated Bug Prediction

Detect bugs and get predictions: **bug type**, **severity** (low/medium/high), **debug time**, **priority score**, **root cause**, and **risk if delayed**. The app can use an **AI backend** for triage or run in **client-only** mode.

## App settings (API URL)

- **Config:** `app/scripts/config.js`
- **`API_BASE_URL`** – Backend URL (e.g. `http://localhost:5000`). Set to `''` for client-only.
- **`API_TIMEOUT_MS`** – Analyze request timeout (default 15000).

## How to run the app (don’t open as files)

The app must be **served over HTTP**. Opening the folder or HTML files directly (e.g. from Finder) will show a file list or break the app.

### Option 1: Python (recommended)

In Terminal:

```bash
cd /Users/nityakollu/Desktop/Automated-Bug-Prediction-main
python3 -m http.server 8080
```

Then open **http://localhost:8080/app/** (login/dashboard live under `/app/`).

### Option 2: Double‑click (macOS)

1. Double‑click **`run-app.command`** in the project folder.
2. If macOS says it’s from an unidentified developer: right‑click → Open → Open.
3. In your browser open: **http://localhost:8080/app/**

### Option 3: Node (if you use npm)

```bash
npm run dev
```

Then open **http://localhost:3000/app/**.

### AI backend (optional)

1. `cd backend && pip install -r requirements.txt`
2. Put **`embold_train.json`** in `backend/` (JSON with `title`, `body`, `label`).
3. Run `python server.py` in `backend/` — API at **http://localhost:5000**. Keep `API_BASE_URL` in `app/scripts/config.js` as `http://localhost:5000`.

---

**Summary:** Run one of the commands above, then go to the URL in your **browser**. Don’t open the project folder as “Open with” or drag it into the browser.
