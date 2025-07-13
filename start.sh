#!/bin/bash

echo "🚀 Starting Instagram Clone Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first:"
    echo "   mongod"
    echo ""
    read -p "Press Enter to continue anyway..."
fi

# Function to install dependencies
install_dependencies() {
    local dir=$1
    echo "📦 Installing dependencies in $dir..."
    cd "$dir"
    if [ -f "package.json" ]; then
        npm install
    else
        echo "❌ package.json not found in $dir"
        return 1
    fi
    cd ..
}

# Install backend dependencies
if [ -d "backend" ]; then
    install_dependencies "backend"
else
    echo "❌ Backend directory not found"
    exit 1
fi

# Install frontend dependencies
if [ -d "frontend" ]; then
    install_dependencies "frontend"
else
    echo "❌ Frontend directory not found"
    exit 1
fi

# Create uploads directory if it doesn't exist
mkdir -p backend/uploads

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "🌐 Starting the application..."
echo ""

# Start backend in background
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend application..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 Instagram Clone is starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait