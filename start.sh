#!/bin/bash

echo "=============================================="
echo "STARTING TEXT-TO-SPEECH (BACKEND & FRONTEND)"
echo "=============================================="
echo "[INSTRUCTIONS] Press Ctrl+C to stop both applications simultaneously."
echo ""

# Use concurrently to run in parallel and manage in a single window
npx concurrently -k -n "Backend,Frontend" -c "bgBlue.bold,bgMagenta.bold" "cd backend && venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload" "cd frontend && npm run dev"
