#!/bin/bash
# Quick start script for CSA development environment

set -e

echo "🚀 Starting CSA Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. You can modify it as needed."
fi

# Install LocalStack AWS CLI wrapper
if ! command -v awslocal &> /dev/null; then
    echo "📦 Installing LocalStack AWS CLI wrapper..."
    pip install awscli-local
fi

# Start the development environment
echo "🐳 Starting Docker containers..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if LocalStack is ready
echo "🔍 Checking LocalStack status..."
timeout 60 bash -c 'until curl -s http://localhost:4566/_localstack/health | grep -q "running"; do sleep 2; done'

# Check if API is ready
echo "🔍 Checking API status..."
timeout 60 bash -c 'until curl -s http://localhost:8000/api/health | grep -q "healthy"; do sleep 2; done'

echo ""
echo "🎉 CSA Development Environment is ready!"
echo ""
echo "📋 Service URLs:"
echo "   API: http://localhost:8000"
echo "   API Health: http://localhost:8000/api/health"
echo "   API Docs: http://localhost:8000/docs"
echo "   LocalStack: http://localhost:4566"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
echo ""
echo "🔐 Test Credentials:"
echo "   Username: admin@test.com"
echo "   Password: AdminPass123!"
echo ""
echo "🛠️  Useful Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop environment: docker-compose down"
echo "   Restart API: docker-compose restart api"
echo "   Run tests: docker-compose run --rm api uv run pytest"
echo ""
echo "📖 Next Steps:"
echo "   1. Test authentication: curl http://localhost:8000/api/auth/config"
echo "   2. View API documentation: open http://localhost:8000/docs"
echo "   3. Check the README.md for development workflows"