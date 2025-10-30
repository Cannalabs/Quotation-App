#!/bin/bash
echo "Starting Grow United Quote Builder on Network..."

# Kill any existing processes first
echo "Stopping any existing services..."
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start backend in background
echo "Starting backend..."
cd "/home/anmolgarg/Downloads/Telegram Desktop/grow-united-qutation-app-09a1ddde(2)"
source .venv/bin/activate
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 3000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start (port 3000 might be in use)"
    echo "Try running: pkill -f uvicorn && pkill -f vite"
    exit 1
fi

# Start frontend
echo "Starting frontend..."
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Get the actual frontend port
FRONTEND_PORT=$(ps aux | grep "vite --host 0.0.0.0" | grep -v grep | head -1 | sed 's/.*--port \([0-9]*\).*/\1/' || echo "5173")
if [ "$FRONTEND_PORT" = "5173" ]; then
    # Check if port 5173 is actually in use, if not, it might be 5174, 5175, etc.
    if ! netstat -tlnp 2>/dev/null | grep -q ":5173 "; then
        FRONTEND_PORT=$(netstat -tlnp 2>/dev/null | grep "vite" | grep -o ":517[0-9]" | head -1 | sed 's/://' || echo "5173")
    fi
fi

echo "✅ Services started!"
echo "🌐 Frontend: http://192.168.1.76:$FRONTEND_PORT"
echo "🔧 Backend: http://192.168.1.76:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
wait

# Cleanup
echo "Stopping services..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
