# Docker Deployment Guide for HA Presence Calendar

This guide explains how to deploy the Home Assistant Presence Calendar application using Docker and Docker Compose.

## 📋 Prerequisites

- Docker and Docker Compose installed on your server
- Home Assistant instance with a long-lived access token
- Access to your server's command line

## 🚀 Quick Start

1. **Clone/Upload the project** to your server:
   ```bash
   git clone <your-repo> ha-presence-calendar
   cd ha-presence-calendar
   ```

2. **Configure Home Assistant connection**:
   Create `backend/config.yaml`:
   ```yaml
   ha_url: 'https://your-homeassistant.domain.com'
   ha_token: 'your-long-lived-access-token'
   ```

3. **Deploy the application**:
   ```bash
   ./deploy.sh
   ```

4. **Access your application**:
   - Frontend: http://your-server:3000
   - Backend API: http://your-server:5000
   - With Nginx: http://your-server (port 80)

## 🐳 Docker Compose Structure

### Services

- **backend**: Flask API server (Python)
- **frontend**: React application (Node.js + Nginx)
- **nginx**: Reverse proxy (optional, for production)

### Ports

- `3000`: React frontend
- `5000`: Flask backend
- `80`: Nginx reverse proxy (production)
- `443`: HTTPS (when SSL is configured)

## 🔧 Configuration Options

### Environment Variables

Create a `.env` file in the root directory for custom configuration:

```env
# Backend Configuration
FLASK_ENV=production
PORT=5000

# Frontend Configuration
REACT_APP_API_URL=http://your-server/api

# Nginx Configuration
NGINX_PORT=80
NGINX_SSL_PORT=443
```

### Production with SSL

1. **Enable the nginx service**:
   ```bash
   docker-compose --profile production up -d
   ```

2. **Configure SSL certificates**:
   - Place SSL certificates in `nginx/ssl/`
   - Update `nginx/nginx.conf` with your domain
   - Uncomment the HTTPS server block

3. **Update DNS** to point to your server

## 📊 Management Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Monitor Resources
```bash
# Container stats
docker stats

# Service status
docker-compose ps
```

## 🔒 Security Considerations

### Production Deployment

1. **Use HTTPS**: Configure SSL certificates for production
2. **Firewall**: Only expose necessary ports (80, 443)
3. **Environment Variables**: Never commit sensitive data to git
4. **Access Control**: Consider adding authentication if needed
5. **Updates**: Keep Docker images updated regularly

### Home Assistant Security

1. **Long-lived tokens**: Use dedicated tokens with minimal permissions
2. **Network Access**: Ensure your server can reach Home Assistant
3. **Token Rotation**: Regularly rotate access tokens

## 🐛 Troubleshooting

### Common Issues

**Backend can't connect to Home Assistant:**
```bash
# Check config
docker-compose exec backend cat /app/config.yaml

# Check connectivity
docker-compose exec backend curl -I https://your-ha-domain.com
```

**Frontend can't reach backend:**
```bash
# Check environment variables
docker-compose exec frontend env | grep REACT_APP

# Check nginx proxy
docker-compose logs nginx
```

**Services won't start:**
```bash
# Check container logs
docker-compose logs

# Check system resources
docker system df
docker system prune  # Clean up if needed
```

### Log Files

- Backend logs: `docker-compose logs backend`
- Frontend logs: `docker-compose logs frontend`  
- Nginx logs: `docker-compose logs nginx`

### Health Checks

Each service includes health checks. Check status with:
```bash
docker-compose ps
```

Healthy services show "Up (healthy)" status.

## 📈 Monitoring

### Basic Monitoring

Monitor your application with:
```bash
# Resource usage
docker stats

# Container health
docker-compose ps

# Application logs
docker-compose logs -f --tail=100
```

### Advanced Monitoring

For production environments, consider:
- **Prometheus + Grafana**: For metrics and dashboards
- **ELK Stack**: For centralized logging
- **Uptime monitoring**: External service monitoring

## 🔄 Backup and Recovery

### Configuration Backup
```bash
# Backup configuration
tar -czf ha-presence-backup.tar.gz backend/config.yaml docker-compose.yml nginx/

# Restore configuration
tar -xzf ha-presence-backup.tar.gz
```

### Data Backup
The application is stateless - all data comes from Home Assistant.
Only configuration files need backup.

## 🌐 Reverse Proxy Setup

### With existing Nginx
Add to your main nginx config:
```nginx
location /presence/ {
    proxy_pass http://localhost:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /presence/api/ {
    proxy_pass http://localhost:5000/api/;
    proxy_set_header Host $host;
}
```

### With Traefik
Add labels to docker-compose.yml:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.ha-presence.rule=Host(\`presence.yourdomain.com\`)"
```

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs`
2. Verify configuration: Review `config.yaml` and environment variables
3. Test connectivity: Ensure server can reach Home Assistant
4. Check resources: Verify adequate disk space and memory

Happy monitoring! 🏠📊
