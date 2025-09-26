#!/bin/bash

# Expense Tracker Startup Script

echo "🚀 Starting Expense Tracker Application..."
echo ""

# # Check if .env files exist
# if [ ! -f "backend/.env" ]; then
#     echo "❌ Backend .env file not found!"
#     echo "Please copy backend/config.example.txt to backend/.env and configure it"
#     exit 1
# fi

# if [ ! -f "frontend/.env" ]; then
#     echo "🔧 Creating frontend .env file..."
#     echo 'REACT_APP_API_URL=http://localhost:5000/api' > frontend/.env
# fi

# Function to start backend
start_backend() {
    echo "🔧 Starting Backend (Node.js API)..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    echo "Backend started with PID: $BACKEND_PID"
}

# Function to start frontend
start_frontend() {
    echo "⚛️  Starting Frontend (React)..."
    sleep 3  # Give backend time to start
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    echo "Frontend started with PID: $FRONTEND_PID"
}

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start services
start_backend
start_frontend

echo ""
echo "🎉 Expense Tracker is starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait
