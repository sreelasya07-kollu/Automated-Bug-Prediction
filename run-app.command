#!/bin/bash
cd "$(dirname "$0")"
echo "Starting BugPredict at http://localhost:8080"
echo "Open that URL in your browser (don't open the folder as files)."
echo ""
python3 -m http.server 8080
