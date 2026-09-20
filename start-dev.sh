#!/bin/bash

# DukaanPilot Development Server Startup Script

echo "🚀 Starting DukaanPilot..."
echo ""

# Check if database is set up
echo "📊 Database Setup:"
echo "   1. Go to https://bsdcklnrujljtfqmvsln.supabase.co"
echo "   2. Open SQL Editor"
echo "   3. Run backend/schema.sql"
echo "   4. Run backend/seed.sql"
echo ""
echo "   Press Enter when database is ready..."
read

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID (port 3001)"
cd ..

# Wait for backend
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID (port 3000)"
cd ..

# Wait for frontend
sleep 3

echo ""
echo "✅ DukaanPilot is running!"
echo ""
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📝 Demo commands to try:"
echo "   \"Bhaiya 2 Maggi, 1 Amul Taaza milk aur 1 bread de do\""
echo "   \"10 bread\" (insufficient stock demo)"
echo "   \"Give me milk\" (ambiguous product demo)"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
