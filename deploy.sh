#!/bin/bash

# Production deployment script for HA Presence Calendar

set -e  # Exit on any error

echo "🚀 Starting deployment of HA Presence Calendar..."

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if config.yaml exists
if [ ! -f "./backend/config.yaml" ]; then
    echo "❌ config.yaml not found in backend directory!"
    echo "Please create backend/config.yaml with your Home Assistant configuration:"
    echo "ha_url: 'https://your-homeassistant.com'"
    echo "ha_token: 'your-long-lived-access-token'"
    exit 1
fi

# Create necessary directories
mkdir -p nginx/ssl

# Set environment variables for production
export COMPOSE_PROJECT_NAME=ha-presence
export FLASK_ENV=production

echo "📦 Building and starting containers..."

# Build and start services
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:5000"
    echo "   With Nginx (if enabled): http://localhost"
    echo ""
    echo "📊 Service status:"
    docker-compose ps
else
    echo "❌ Some services failed to start. Check logs:"
    docker-compose logs
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Update config: docker-compose restart backend"
