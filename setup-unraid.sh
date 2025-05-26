#!/bin/bash

# Unraid Setup Script for HA Presence Calendar
# This script prepares your Unraid server for deploying the HA Presence Calendar

set -e  # Exit on any error

echo "🚀 Setting up HA Presence Calendar for Unraid..."

# Configuration
APP_NAME="ha-presence"
APPDATA_DIR="/mnt/user/appdata/${APP_NAME}"
COMPOSE_DIR="/mnt/user/docker/compose/${APP_NAME}"
BACKUP_DIR="/mnt/user/backups/${APP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running on Unraid
if [ ! -d "/mnt/user" ]; then
    print_error "This script is designed for Unraid servers only!"
    exit 1
fi

print_step "Creating directory structure..."

# Create main directories
mkdir -p "${APPDATA_DIR}"/{nginx/{ssl,logs},backups}
mkdir -p "${COMPOSE_DIR}"
mkdir -p "${BACKUP_DIR}"

print_status "Directories created successfully"

print_step "Setting up file permissions..."

# Set proper permissions
chown -R nobody:users "${APPDATA_DIR}"
chmod -R 755 "${APPDATA_DIR}"

if [ -d "${COMPOSE_DIR}" ]; then
    chown -R root:root "${COMPOSE_DIR}"
    chmod -R 755 "${COMPOSE_DIR}"
fi

print_status "Permissions set successfully"

# Copy current project files if we're running from the project directory
if [ -f "docker-compose.unraid.yml" ]; then
    print_step "Copying project files..."
    
    # Copy compose file
    cp docker-compose.unraid.yml "${COMPOSE_DIR}/"
    
    # Copy application code
    cp -r backend/ "${COMPOSE_DIR}/"
    cp -r frontend/ "${COMPOSE_DIR}/"
    cp -r nginx/ "${COMPOSE_DIR}/"
    
    # Copy nginx config to appdata
    cp nginx/nginx.conf "${APPDATA_DIR}/nginx/"
    
    # Copy documentation
    cp *.md "${COMPOSE_DIR}/" 2>/dev/null || true
    
    print_status "Project files copied successfully"
else
    print_warning "Not running from project directory. You'll need to copy files manually."
fi

print_step "Creating configuration template..."

# Create config template if it doesn't exist
if [ ! -f "${APPDATA_DIR}/config.yaml" ]; then
    cat > "${APPDATA_DIR}/config.yaml" << 'EOF'
# Home Assistant API configuration
# IMPORTANT: Replace these values with your actual Home Assistant details
ha_url: "https://your-homeassistant.domain.com"
ha_token: "your-long-lived-access-token-here"

# Example:
# ha_url: "https://home.example.com"
# ha_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
EOF

    chown nobody:users "${APPDATA_DIR}/config.yaml"
    chmod 644 "${APPDATA_DIR}/config.yaml"
    
    print_warning "Configuration template created at ${APPDATA_DIR}/config.yaml"
    print_warning "You MUST edit this file with your Home Assistant details!"
else
    print_status "Configuration file already exists"
fi

print_step "Creating backup script..."

# Create backup script
cat > "/mnt/user/scripts/backup-${APP_NAME}.sh" << 'EOF'
#!/bin/bash

# HA Presence Calendar Backup Script
APP_NAME="ha-presence"
APPDATA_DIR="/mnt/user/appdata/${APP_NAME}"
COMPOSE_DIR="/mnt/user/docker/compose/${APP_NAME}"
BACKUP_BASE="/mnt/user/backups/${APP_NAME}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_BASE}/${TIMESTAMP}"

echo "Creating backup: ${BACKUP_DIR}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup appdata
if [ -d "${APPDATA_DIR}" ]; then
    cp -r "${APPDATA_DIR}" "${BACKUP_DIR}/appdata"
    echo "✓ Appdata backed up"
fi

# Backup compose files
if [ -d "${COMPOSE_DIR}" ]; then
    cp -r "${COMPOSE_DIR}" "${BACKUP_DIR}/compose"
    echo "✓ Compose files backed up"
fi

# Create compressed archive
cd "${BACKUP_BASE}"
tar -czf "${TIMESTAMP}.tar.gz" "${TIMESTAMP}"
rm -rf "${TIMESTAMP}"

# Clean up old backups (keep last 10)
ls -t *.tar.gz | tail -n +11 | xargs -r rm

echo "✓ Backup completed: ${BACKUP_BASE}/${TIMESTAMP}.tar.gz"
EOF

chmod +x "/mnt/user/scripts/backup-${APP_NAME}.sh"
print_status "Backup script created at /mnt/user/scripts/backup-${APP_NAME}.sh"

print_step "Creating useful aliases..."

# Create useful aliases for the app
cat > "/mnt/user/scripts/${APP_NAME}-commands.sh" << EOF
#!/bin/bash

# HA Presence Calendar Management Commands

APP_NAME="${APP_NAME}"
COMPOSE_DIR="${COMPOSE_DIR}"
COMPOSE_FILE="\${COMPOSE_DIR}/docker-compose.unraid.yml"

alias ${APP_NAME}-logs='cd "\${COMPOSE_DIR}" && docker-compose -f docker-compose.unraid.yml logs'
alias ${APP_NAME}-status='cd "\${COMPOSE_DIR}" && docker-compose -f docker-compose.unraid.yml ps'
alias ${APP_NAME}-restart='cd "\${COMPOSE_DIR}" && docker-compose -f docker-compose.unraid.yml restart'
alias ${APP_NAME}-update='cd "\${COMPOSE_DIR}" && docker-compose -f docker-compose.unraid.yml down && docker-compose -f docker-compose.unraid.yml up -d --build'
alias ${APP_NAME}-backup='/mnt/user/scripts/backup-${APP_NAME}.sh'

echo "Available commands:"
echo "  ${APP_NAME}-logs     - View application logs"
echo "  ${APP_NAME}-status   - Check container status"
echo "  ${APP_NAME}-restart  - Restart all containers"
echo "  ${APP_NAME}-update   - Update and rebuild containers"
echo "  ${APP_NAME}-backup   - Create backup"
EOF

chmod +x "/mnt/user/scripts/${APP_NAME}-commands.sh"
print_status "Management commands created at /mnt/user/scripts/${APP_NAME}-commands.sh"

print_step "Creating network test script..."

# Create network test script
cat > "/mnt/user/scripts/test-${APP_NAME}.sh" << 'EOF'
#!/bin/bash

echo "🧪 Testing HA Presence Calendar deployment..."

UNRAID_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}')
echo "Unraid IP: $UNRAID_IP"

echo ""
echo "Testing services:"

# Test nginx (main app)
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080" | grep -q "200"; then
    echo "✓ Main application (port 8080): OK"
else
    echo "✗ Main application (port 8080): FAILED"
fi

# Test frontend direct
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" | grep -q "200"; then
    echo "✓ Frontend direct (port 3000): OK"
else
    echo "✗ Frontend direct (port 3000): FAILED"
fi

# Test backend direct
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000" | grep -q "200"; then
    echo "✓ Backend direct (port 5000): OK"
else
    echo "✗ Backend direct (port 5000): FAILED"
fi

# Test backend API through nginx
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/persons" | grep -q "200"; then
    echo "✓ Backend API through nginx: OK"
else
    echo "✗ Backend API through nginx: FAILED"
fi

echo ""
echo "Access URLs:"
echo "  Main application: http://$UNRAID_IP:8080"
echo "  Frontend only:    http://$UNRAID_IP:3000"
echo "  Backend API:      http://$UNRAID_IP:5000"
EOF

chmod +x "/mnt/user/scripts/test-${APP_NAME}.sh"
print_status "Network test script created at /mnt/user/scripts/test-${APP_NAME}.sh"

echo ""
print_status "✅ Unraid setup completed successfully!"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit configuration file: ${APPDATA_DIR}/config.yaml"
echo "2. Install Compose Manager plugin if not already installed"
echo "3. Add new stack in Compose Manager:"
echo "   - Stack Name: ${APP_NAME}"
echo "   - Compose File: ${COMPOSE_DIR}/docker-compose.unraid.yml"
echo "4. Start the stack in Compose Manager"
echo "5. Test deployment: /mnt/user/scripts/test-${APP_NAME}.sh"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "- Make sure to update config.yaml with your Home Assistant URL and token"
echo "- The application will be available on port 8080 (not 80 to avoid conflicts)"
echo "- Check firewall settings if accessing from other devices"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "source /mnt/user/scripts/${APP_NAME}-commands.sh  # Load management aliases"
echo "/mnt/user/scripts/test-${APP_NAME}.sh             # Test deployment"
echo "/mnt/user/scripts/backup-${APP_NAME}.sh           # Create backup"
EOF
