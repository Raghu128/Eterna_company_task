#!/bin/bash

# Order Execution Engine - Setup Script
# This script sets up the development environment

set -e

echo "🚀 Order Execution Engine - Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL 14+"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

echo "✓ PostgreSQL is installed"

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis is not installed. Please install Redis 7+"
    echo "   macOS: brew install redis"
    echo "   Ubuntu: sudo apt-get install redis-server"
    exit 1
fi

echo "✓ Redis is installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_execution_db
DB_USER=postgres
DB_PASSWORD=postgres

# Queue Configuration
MAX_CONCURRENT_ORDERS=10
ORDERS_PER_MINUTE=100

# Retry Configuration
MAX_RETRIES=3
INITIAL_RETRY_DELAY=1000

# DEX Configuration (for mock)
MOCK_EXECUTION_DELAY=2500
PRICE_VARIANCE=0.05
EOF
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi
echo ""

# Start Redis if not running
if ! redis-cli ping &> /dev/null; then
    echo "🔴 Redis is not running. Starting Redis..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start redis
    fi
    sleep 2
    echo "✓ Redis started"
else
    echo "✓ Redis is already running"
fi
echo ""

# Start PostgreSQL if not running
if ! pg_isready &> /dev/null; then
    echo "🔴 PostgreSQL is not running. Starting PostgreSQL..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
    fi
    sleep 2
    echo "✓ PostgreSQL started"
else
    echo "✓ PostgreSQL is already running"
fi
echo ""

# Create database if it doesn't exist
echo "🗄️  Setting up database..."
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw order_execution_db; then
    echo "✓ Database already exists"
else
    createdb -U postgres order_execution_db
    echo "✓ Database created"
fi
echo ""

# Run migrations
echo "🔄 Running database migrations..."
npm run migrate
echo "✓ Migrations completed"
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo "✓ Build completed"
echo ""

echo "✅ Setup completed successfully!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "To run tests, run:"
echo "  npm test"
echo ""
echo "To start with Docker, run:"
echo "  docker-compose up -d"
echo ""
echo "Happy coding! 🎉"

