#!/bin/bash

# ShareLink Deployment Script
echo "🚀 Starting ShareLink Deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running again."
    exit 1
fi

# Create SSL directory for nginx (optional)
mkdir -p ssl

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ ShareLink is running successfully!"
    echo "🌐 Frontend: http://localhost"
    echo "📡 Backend API: http://localhost/api"
    echo "📊 Newsletter Analytics: http://localhost/api/newsletter/analytics"
else
    echo "❌ Services are not responding. Checking logs..."
    docker-compose logs --tail=20
fi

echo "🔍 Service Status:"
docker-compose ps
