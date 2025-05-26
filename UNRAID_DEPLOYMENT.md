# Unraid Deployment Guide for HA Presence Calendar

This guide explains how to deploy the Home Assistant Presence Calendar application on an Unraid server using the Compose Manager plugin.

## 📋 Prerequisites

- **Unraid 6.8.0+** with Community Applications (CA) plugin installed
- **Compose Manager** plugin from Community Applications
- **Home Assistant** instance with a long-lived access token
- Access to your Unraid server's command line or web terminal

## 🚀 Installation Steps

### 1. Install Required Plugins

1. Open Unraid WebUI → **Apps** tab
2. Search and install:
   - **Compose Manager** (by dcflachs)
   - **User Scripts** (optional, for automation)

### 2. Prepare Directory Structure

Connect to your Unraid server via SSH or web terminal and run:

```bash
# Create application directory
mkdir -p /mnt/user/appdata/ha-presence/{nginx/ssl,nginx/logs}

# Create compose directory
mkdir -p /mnt/user/docker/compose/ha-presence

# Set proper permissions
chown -R nobody:users /mnt/user/appdata/ha-presence
chmod -R 755 /mnt/user/appdata/ha-presence
```

### 3. Upload Application Files

Copy the project files to your Unraid server:

```bash
# Method 1: Using scp from your development machine
scp -r /path/to/HA-presence/* root@YOUR_UNRAID_IP:/mnt/user/docker/compose/ha-presence/

# Method 2: Using git (if git is available on Unraid)
cd /mnt/user/docker/compose
git clone https://github.com/YOUR_USERNAME/HA-presence.git ha-presence
```

### 4. Configure Home Assistant Connection

Create the configuration file:

```bash
# Create config file
cat > /mnt/user/appdata/ha-presence/config.yaml << 'EOF'
# Home Assistant API configuration
ha_url: "https://your-homeassistant.domain.com"
ha_token: "your-long-lived-access-token"
EOF

# Set proper permissions
chown nobody:users /mnt/user/appdata/ha-presence/config.yaml
chmod 644 /mnt/user/appdata/ha-presence/config.yaml
```

### 5. Copy Nginx Configuration

```bash
# Copy nginx config to appdata
cp /mnt/user/docker/compose/ha-presence/nginx/nginx.conf /mnt/user/appdata/ha-presence/nginx/

# Set permissions
chown -R nobody:users /mnt/user/appdata/ha-presence/nginx
chmod -R 755 /mnt/user/appdata/ha-presence/nginx
```

### 6. Setup Compose Manager

1. Open Unraid WebUI → **Docker** tab → **Compose Manager**
2. Click **Add New Stack**
3. Configure the stack:
   - **Stack Name**: `ha-presence`
   - **Compose File Path**: `/mnt/user/docker/compose/ha-presence/docker-compose.unraid.yml`
   - **Description**: `Home Assistant Presence Calendar`

### 7. Deploy the Application

1. In Compose Manager, find your `ha-presence` stack
2. Click **Compose Up** or **Start**
3. Monitor the logs for any errors
4. Wait for all containers to be healthy (may take 2-3 minutes)

## 🌐 Access Your Application

Once deployed, access your application at:

- **Main Application**: `http://YOUR_UNRAID_IP:8080`
- **Direct Frontend**: `http://YOUR_UNRAID_IP:3000`
- **Direct Backend API**: `http://YOUR_UNRAID_IP:5000`

## ⚙️ Configuration Options

### Port Customization

Edit `/mnt/user/docker/compose/ha-presence/docker-compose.unraid.yml` to change ports:

```yaml
nginx:
  ports:
    - "8080:80"   # Change 8080 to your preferred port
    - "8443:443"  # Change 8443 to your preferred HTTPS port
```

### Timezone Configuration

Update the `TZ` environment variable in all services:

```yaml
environment:
  - TZ=Your/Timezone  # e.g., America/New_York, Europe/London
```

### SSL/HTTPS Setup

1. Place your SSL certificates in `/mnt/user/appdata/ha-presence/nginx/ssl/`
2. Uncomment the HTTPS server block in `nginx.conf`
3. Update certificate paths in the nginx configuration

## 🔧 Maintenance Commands

### View Logs
```bash
# View all logs
cd /mnt/user/docker/compose/ha-presence
docker-compose -f docker-compose.unraid.yml logs

# View specific service logs
docker-compose -f docker-compose.unraid.yml logs backend
docker-compose -f docker-compose.unraid.yml logs frontend
docker-compose -f docker-compose.unraid.yml logs nginx
```

### Update Application
```bash
# Stop containers
cd /mnt/user/docker/compose/ha-presence
docker-compose -f docker-compose.unraid.yml down

# Pull latest code (if using git)
git pull

# Rebuild and restart
docker-compose -f docker-compose.unraid.yml up -d --build
```

### Restart Services
```bash
cd /mnt/user/docker/compose/ha-presence
docker-compose -f docker-compose.unraid.yml restart
```

## 🔒 Security Considerations

### Firewall Rules
Consider restricting access to specific IP ranges:

1. Go to Unraid WebUI → **Settings** → **Network Settings**
2. Configure firewall rules to limit access to ports 8080/8443

### Reverse Proxy Integration
For additional security, consider using:
- **Nginx Proxy Manager** (available in CA)
- **Traefik** with SSL certificates
- **Cloudflare Tunnel**

## 📊 Monitoring and Alerts

### Container Health Monitoring
The compose file includes health checks. Monitor in:
- Compose Manager dashboard
- Docker tab in Unraid WebUI
- Container logs

### Notification Setup
Configure Unraid notifications for container failures:
1. **Settings** → **Notification Settings**
2. Enable **Docker** notifications
3. Configure your preferred notification method

## 🐛 Troubleshooting

### Common Issues

**Build context not found error:**
```bash
# Error: unable to prepare context: path "...backend" not found
# Solution: Ensure project files are copied to the correct location
ls -la /mnt/user/docker/compose/ha-presence/
# Should show: backend/, frontend/, nginx/ directories

# If missing, run the setup script:
cd /mnt/user/docker/compose/ha-presence
./setup-unraid.sh
```

**Containers won't start:**
```bash
# Check permissions
ls -la /mnt/user/appdata/ha-presence/
chown -R nobody:users /mnt/user/appdata/ha-presence/

# Check config file
cat /mnt/user/appdata/ha-presence/config.yaml
```

**Cannot access from other devices:**
```bash
# Check Unraid network settings
ip addr show
# Ensure ports aren't blocked by firewall
```

**Home Assistant connection issues:**
```bash
# Test connectivity from Unraid
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-ha-domain.com/api/
```

### Log Analysis
```bash
# Check nginx access logs
tail -f /mnt/user/appdata/ha-presence/nginx/logs/access.log

# Check nginx error logs
tail -f /mnt/user/appdata/ha-presence/nginx/logs/error.log
```

## 🔄 Backup Strategy

### Configuration Backup
```bash
# Create backup script
cat > /mnt/user/scripts/backup-ha-presence.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/mnt/user/backups/ha-presence/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /mnt/user/appdata/ha-presence/* "$BACKUP_DIR/"
cp /mnt/user/docker/compose/ha-presence/docker-compose.unraid.yml "$BACKUP_DIR/"
tar -czf "$BACKUP_DIR.tar.gz" -C /mnt/user/backups/ha-presence "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"
find /mnt/user/backups/ha-presence -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x /mnt/user/scripts/backup-ha-presence.sh
```

### Automated Backups
Set up automated backups using User Scripts plugin:
1. **Settings** → **User Scripts**
2. Add new script with the backup commands
3. Set schedule (e.g., weekly)

## 📞 Support

If you encounter issues:
1. Check container logs first
2. Verify Home Assistant connectivity
3. Ensure proper file permissions
4. Review Unraid system logs

---

**Note**: Replace `YOUR_UNRAID_IP`, `your-homeassistant.domain.com`, and `your-long-lived-access-token` with your actual values.
