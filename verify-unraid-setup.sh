#!/bin/bash

# Unraid HA-Presence Verification Script
# Run this script on your Unraid server to verify the setup

echo "🔍 Verifying HA-Presence setup on Unraid..."

# Configuration
APP_NAME="ha-presence"
APPDATA_DIR="/mnt/user/appdata/${APP_NAME}"
COMPOSE_DIR="/mnt/user/docker/compose/${APP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo ""
echo "=== Directory Structure ==="

# Check main directories
if [ -d "${APPDATA_DIR}" ]; then
    print_status "Appdata directory exists: ${APPDATA_DIR}"
else
    print_error "Appdata directory missing: ${APPDATA_DIR}"
fi

if [ -d "${COMPOSE_DIR}" ]; then
    print_status "Compose directory exists: ${COMPOSE_DIR}"
else
    print_error "Compose directory missing: ${COMPOSE_DIR}"
fi

# Check project structure
echo ""
echo "=== Project Files ==="

if [ -f "${COMPOSE_DIR}/docker-compose.unraid.yml" ]; then
    print_status "Docker compose file found"
else
    print_error "Docker compose file missing: ${COMPOSE_DIR}/docker-compose.unraid.yml"
fi

if [ -d "${COMPOSE_DIR}/backend" ]; then
    print_status "Backend directory found"
    if [ -f "${COMPOSE_DIR}/backend/Dockerfile" ]; then
        print_status "Backend Dockerfile found"
    else
        print_error "Backend Dockerfile missing"
    fi
else
    print_error "Backend directory missing: ${COMPOSE_DIR}/backend"
fi

if [ -d "${COMPOSE_DIR}/frontend" ]; then
    print_status "Frontend directory found"
    if [ -f "${COMPOSE_DIR}/frontend/Dockerfile" ]; then
        print_status "Frontend Dockerfile found"
    else
        print_error "Frontend Dockerfile missing"
    fi
else
    print_error "Frontend directory missing: ${COMPOSE_DIR}/frontend"
fi

if [ -d "${COMPOSE_DIR}/nginx" ]; then
    print_status "Nginx directory found"
else
    print_error "Nginx directory missing: ${COMPOSE_DIR}/nginx"
fi

# Check configuration
echo ""
echo "=== Configuration ==="

if [ -f "${APPDATA_DIR}/config.yaml" ]; then
    print_status "Config file found"
    
    # Check if config has been customized
    if grep -q "your-homeassistant.domain.com" "${APPDATA_DIR}/config.yaml"; then
        print_warning "Config file contains template values - needs customization"
    else
        print_status "Config file appears to be customized"
    fi
else
    print_error "Config file missing: ${APPDATA_DIR}/config.yaml"
fi

if [ -f "${APPDATA_DIR}/nginx/nginx.conf" ]; then
    print_status "Nginx config found"
else
    print_error "Nginx config missing: ${APPDATA_DIR}/nginx/nginx.conf"
fi

# Check permissions
echo ""
echo "=== Permissions ==="

APPDATA_OWNER=$(stat -c '%U:%G' "${APPDATA_DIR}" 2>/dev/null || echo "unknown")
if [ "$APPDATA_OWNER" = "nobody:users" ]; then
    print_status "Appdata permissions correct (nobody:users)"
else
    print_warning "Appdata permissions: $APPDATA_OWNER (should be nobody:users)"
fi

# Check network requirements
echo ""
echo "=== Network Check ==="

# Check if ports are available
if netstat -tuln | grep -q ":8080 "; then
    print_warning "Port 8080 is already in use"
else
    print_status "Port 8080 is available"
fi

if netstat -tuln | grep -q ":3000 "; then
    print_warning "Port 3000 is already in use"
else
    print_status "Port 3000 is available"
fi

if netstat -tuln | grep -q ":5000 "; then
    print_warning "Port 5000 is already in use"
else
    print_status "Port 5000 is available"
fi

# Check Docker
echo ""
echo "=== Docker Check ==="

if command -v docker &> /dev/null; then
    print_status "Docker is installed"
    DOCKER_VERSION=$(docker --version)
    print_info "Docker version: $DOCKER_VERSION"
else
    print_error "Docker is not installed"
fi

if command -v docker-compose &> /dev/null; then
    print_status "Docker Compose is installed"
    COMPOSE_VERSION=$(docker-compose --version)
    print_info "Compose version: $COMPOSE_VERSION"
else
    print_error "Docker Compose is not installed"
fi

# Test compose file syntax
echo ""
echo "=== Compose File Validation ==="

if [ -f "${COMPOSE_DIR}/docker-compose.unraid.yml" ]; then
    cd "${COMPOSE_DIR}"
    if docker-compose -f docker-compose.unraid.yml config > /dev/null 2>&1; then
        print_status "Docker compose file syntax is valid"
    else
        print_error "Docker compose file has syntax errors"
        echo "Run: cd ${COMPOSE_DIR} && docker-compose -f docker-compose.unraid.yml config"
    fi
fi

echo ""
echo "=== Summary ==="

# Count issues
ERROR_COUNT=$(grep -c "✗" /tmp/verification_output 2>/dev/null || echo "0")
WARNING_COUNT=$(grep -c "⚠" /tmp/verification_output 2>/dev/null || echo "0")

if [ ! -f /tmp/verification_output ]; then
    # Redirect output to temp file for counting (if needed)
    echo "Unable to count issues automatically"
fi

echo ""
if [ -d "${COMPOSE_DIR}/backend" ] && [ -d "${COMPOSE_DIR}/frontend" ] && [ -f "${COMPOSE_DIR}/docker-compose.unraid.yml" ]; then
    print_status "Basic setup appears complete"
    echo ""
    print_info "Next steps:"
    echo "1. Customize ${APPDATA_DIR}/config.yaml with your Home Assistant details"
    echo "2. Use Compose Manager to deploy the stack"
    echo "3. Access the application at http://YOUR_UNRAID_IP:8080"
else
    print_error "Setup is incomplete"
    echo ""
    print_info "To fix:"
    echo "1. Copy project files to ${COMPOSE_DIR}/"
    echo "2. Run the setup script: ${COMPOSE_DIR}/setup-unraid.sh"
fi

echo ""
print_info "For detailed deployment instructions, see: ${COMPOSE_DIR}/UNRAID_DEPLOYMENT.md"
