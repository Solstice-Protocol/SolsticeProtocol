# Production Deployment Guide

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- Redis (for production session storage)
- Solana CLI tools
- Domain with SSL/TLS certificate
- Reverse proxy (Nginx recommended)

## Step 1: Environment Setup

### 1.1 Clone Repository
```bash
git clone https://github.com/Solstice-Protocol/SolsticeProtocol.git
cd SolsticeProtocol
```

### 1.2 Install Dependencies
```bash
# Install all dependencies
npm run install:all

# Or install individually
npm run install:backend
npm run install:frontend
npm run install:circuits
npm run install:contracts
```

## Step 2: Database Setup

### 2.1 Create PostgreSQL Database
```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE solstice_protocol;
CREATE USER solstice_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE solstice_protocol TO solstice_user;
\q
```

### 2.2 Run Database Schema
```bash
psql -h localhost -U solstice_user -d solstice_protocol -f backend/src/db/schema.sql
```

### 2.3 Enable SSL for Database
Edit `postgresql.conf`:
```
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
```

## Step 3: Redis Setup

### 3.1 Install Redis
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### 3.2 Configure Redis (Optional)
Edit `/etc/redis/redis.conf`:
```
# Bind to localhost only
bind 127.0.0.1

# Require password
requirepass your_redis_password

# Enable persistence
save 900 1
save 300 10
save 60 10000
```

## Step 4: Environment Configuration

### 4.1 Backend Environment
Create `backend/.env`:
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=solstice_protocol
DB_USER=solstice_user
DB_PASSWORD=your_secure_password

# Solana Configuration
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PROGRAM_ID=your_deployed_program_id

# UIDAI Configuration
UIDAI_PUBLIC_KEY=your-uidai-public-key

# Security Keys (MUST be randomly generated)
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Logging
LOG_LEVEL=info

# Redis
REDIS_URL=redis://:your_redis_password@localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4.2 Generate Secure Keys
```bash
# Generate encryption key (256 bits)
openssl rand -hex 32

# Generate session secret
openssl rand -hex 32
```

### 4.3 Frontend Environment
Create `frontend/.env`:
```bash
VITE_API_URL=https://api.your-domain.com
VITE_SOLANA_NETWORK=mainnet-beta
VITE_PROGRAM_ID=your_deployed_program_id
```

## Step 5: Build Smart Contracts

### 5.1 Build Contracts
```bash
cd contracts
anchor build
```

### 5.2 Deploy to Solana
```bash
# Deploy to devnet first for testing
anchor deploy --provider.cluster devnet

# Then deploy to mainnet
solana config set --url mainnet-beta
anchor deploy --provider.cluster mainnet-beta
```

### 5.3 Initialize Registry
```bash
# Run initialization script
ts-node scripts/initialize-registry.ts
```

## Step 6: Build Circuits

### 6.1 Compile Circuits
```bash
cd circuits
npm run compile:all
```

### 6.2 Generate Verification Keys
```bash
npm run generate:vkeys
```

## Step 7: Build Frontend

```bash
cd frontend
npm run build
```

## Step 8: Nginx Configuration

### 8.1 Install Nginx
```bash
sudo apt-get install nginx
```

### 8.2 Configure Nginx
Create `/etc/nginx/sites-available/solstice`:
```nginx
# API Backend
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Frontend
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    
    root /var/www/solstice/frontend/dist;
    index index.html;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.your-domain.com your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 8.3 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/solstice /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 9: SSL/TLS Certificates

### 9.1 Install Certbot
```bash
sudo apt-get install certbot python3-certbot-nginx
```

### 9.2 Obtain Certificates
```bash
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

### 9.3 Auto-renewal
Certbot automatically sets up renewal. Test it:
```bash
sudo certbot renew --dry-run
```

## Step 10: Process Management

### 10.1 Install PM2
```bash
npm install -g pm2
```

### 10.2 Start Backend with PM2
```bash
cd backend
pm2 start src/index.js --name solstice-api
pm2 save
pm2 startup
```

### 10.3 Monitor
```bash
pm2 status
pm2 logs solstice-api
pm2 monit
```

## Step 11: Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Step 12: Monitoring & Logging

### 12.1 Configure Log Rotation
Create `/etc/logrotate.d/solstice`:
```
/var/www/solstice/backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 12.2 Health Monitoring
Set up monitoring for:
- API health endpoint: `https://api.your-domain.com/health`
- Database connectivity
- Redis connectivity
- Disk space
- Memory usage
- CPU usage

## Step 13: Backup Strategy

### 13.1 Database Backups
```bash
# Create backup script
cat > /usr/local/bin/backup-solstice-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/solstice"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U solstice_user -d solstice_protocol | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-solstice-db.sh
```

### 13.2 Schedule Backups
```bash
# Add to crontab
crontab -e

# Add line:
0 2 * * * /usr/local/bin/backup-solstice-db.sh
```

## Step 14: Security Hardening

### 14.1 Disable Root SSH
Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
```

### 14.2 Install Fail2Ban
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 14.3 Regular Updates
```bash
# Set up automatic security updates
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Step 15: Testing Production Deployment

### 15.1 Health Checks
```bash
curl https://api.your-domain.com/health
```

### 15.2 API Tests
```bash
# Test identity endpoint
curl -X GET https://api.your-domain.com/api/identity/test_wallet_address
```

### 15.3 Frontend Test
Visit `https://your-domain.com` in browser and verify:
- Page loads correctly
- QR scanner works
- API calls succeed

## Rollback Procedure

If deployment fails:

1. **Stop services:**
   ```bash
   pm2 stop solstice-api
   ```

2. **Restore database backup:**
   ```bash
   gunzip -c /var/backups/solstice/db_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U solstice_user -d solstice_protocol
   ```

3. **Revert to previous version:**
   ```bash
   git checkout previous_tag
   npm run install:all
   npm run build:all
   pm2 restart solstice-api
   ```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U solstice_user -d solstice_protocol
```

### Redis Connection Issues
```bash
# Check Redis is running
sudo systemctl status redis

# Test connection
redis-cli ping
```

### PM2 Issues
```bash
# View logs
pm2 logs solstice-api

# Restart
pm2 restart solstice-api

# Full reset
pm2 delete all
pm2 start src/index.js --name solstice-api
```

## Maintenance

### Regular Tasks
- **Daily**: Check logs, monitor metrics
- **Weekly**: Review security alerts, update dependencies
- **Monthly**: Database optimization, review backups
- **Quarterly**: Security audit, load testing

### Updates
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm run install:all

# Build
npm run build:all

# Restart services
pm2 restart solstice-api
```

## Support

For issues or questions:
- Check logs: `pm2 logs solstice-api`
- Review documentation: `/docs`
- Contact: support@solsticeprotocol.com
