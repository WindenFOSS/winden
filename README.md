<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/WindenFOSS/Winden/main/app/public/winden-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/WindenFOSS/Winden/main/app/public/winden-light.svg" />
    <img src="https://raw.githubusercontent.com/WindenFOSS/Winden/main/app/public/winden-light.svg" alt="Winden" width="200">
  </picture>
</p>

<h1 align="center">Winden</h1>
<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0%20Aurora-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/platform%20level-70-orange" alt="Platform Level">
</p>

<p align="center">
  The all-in-one game server dashboard built with the modern stack. High performance user interface, full built-in panel, coins system, resources store and more.
</p>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🔍 Prerequisites](#-prerequisites)
- [⚠️ Wings Configuration](#️-required-wings-configuration)
- [🚀 Quick Installation](#-quick-installation)
- [📦 Detailed Installation Guide](#-detailed-installation-guide)
- [🪟 Windows Installation Guide](#-windows-installation-guide)
- [🔧 Nginx Configuration](#-nginx-configuration)
- [📋 Configuration Options](#-configuration-options)
- [📚 Documentation](#-documentation)
- [🔧 Troubleshooting](#-troubleshooting)
- [🤝 Support](#-support)
- [🔐 Security](#-security)
- [📄 License](#-license)

## ✨ Features

- 🚀 Modern, responsive React-based user interface
- 🎮 Built-in panel (no Pterodactyl needed)
- 💰 Integrated coins/credits system with resource store
- 🔒 Secure user authentication with password management
- 📊 Real-time statistics and charts using Recharts
- 🌐 Support for multiple server locations
- 🖥️ Server management with various "eggs" (templates)
- 🔄 Auto-update system for easier maintenance
- 🎫 Support tickets *(coming soon)*
- 🛠️ Comprehensive admin dashboard

## 🔍 Prerequisites

- [Bun](https://bun.sh/) v1.1.42+ (backend runtime)
- [Node.js](https://nodejs.org/) v18+ (frontend build)
- [Redis](https://redis.io/) (caching/pub-sub)
- [PostgreSQL](https://www.postgresql.org/) (database)
- [Nginx](https://nginx.org/) (reverse proxy)
- SSL certificate (recommended)

## ⚠️ Required: Wings Configuration

**Before deploying Winden, configure each node's Wings:**

1. Edit Wings config at `/etc/pterodactyl/config.yml`
2. Update `allowed-origins`:
   ```yaml
   allowed-origins: ['*']  # Simple option
   # OR
   allowed-origins: ['https://your-dashboard.com']  # Restricted option
   ```

## 🚀 Quick Installation

```bash
# 1. Install prerequisites
# Redis, PostgreSQL, Node.js, and Nginx (system-dependent)

# 2. Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 3. Clone Winden
git clone https://github.com/WindenFOSS/Winden
cd Winden

# 4. Setup and configure
bun install
cp example_config.toml config.toml
# Edit config.toml with your settings

# 5. Build frontend
cd app
npm install
npm run build
cd ..

# 6. Start Winden
bun run app.js
```

## 📦 Detailed Installation Guide

### Prerequisites Installation

#### Ubuntu/Debian

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

#### CentOS/RHEL

```bash
# Update package lists
sudo dnf update -y

# Install Node.js 18+
sudo dnf install -y https://rpm.nodesource.com/pub_20.x/el/9/x86_64/nodesource-release-el9-1.noarch.rpm
sudo dnf install -y nodejs

# Install PostgreSQL
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install Redis
sudo dnf install -y redis
sudo systemctl enable redis
sudo systemctl start redis

# Install Nginx
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Install Git
sudo dnf install -y git
```

### PostgreSQL Database Setup

```bash
# Log in as the postgres user
sudo -u postgres psql

# Create a database for Winden
CREATE DATABASE winden;

# Create a user for Winden (change password!)
CREATE USER windenuser WITH ENCRYPTED PASSWORD 'secure_password';

# Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE winden TO windenuser;

# Exit PostgreSQL
\q

# Edit PostgreSQL configuration to allow password authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Find the line for local connections and change "peer" to "md5"
# local   all             all                                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Redis Configuration

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Set a password (optional but recommended)
# Find the line # requirepass foobared
# Uncomment and change to:
# requirepass your_secure_redis_password

# Restart Redis
sudo systemctl restart redis
```

### Bun Installation

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Verify installation
bun --version
```

### SSL Certificate Setup (with Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d dashboard.yourdomain.com

# Certbot will automatically configure Nginx
```

### Winden Installation

```bash
# Clone the repository
git clone https://github.com/WindenFOSS/Winden
cd Winden

# Install dependencies
bun install

# Copy and configure
cp example_config.toml config.toml
nano config.toml

# Update the following in config.toml:
# - database connection (PostgreSQL details - choose EITHER connection string OR object)
# - redis connection (if password set)
# - website domain and port
# - pterodactyl API keys
# - resend API key for emails

# For database configuration, use ONLY ONE of these methods:
# 1. Connection string: database = "postgresql://windenuser:secure_password@localhost:5432/winden"
# 2. Object notation: 
#    [database]
#    host = "localhost"
#    port = 5432
#    user = "windenuser"
#    password = "secure_password"
#    database = "winden"

# Build frontend
cd app
npm install
npm run build
cd ..

# Start Winden (for testing)
bun run app.js

# For production use a process manager like PM2:
npm install -g pm2
pm2 start app.js --name winden
pm2 save
pm2 startup
```

### Docker Deployment

For containerized deployments, you can use Docker and Docker Compose:

```bash
# Create a docker-compose.yml file
nano docker-compose.yml
```

Add the following content to your docker-compose.yml:

```yaml
version: '3.8'

services:
  winden:
    image: node:20-alpine
    container_name: winden
    restart: unless-stopped
    working_dir: /app
    volumes:
      - ./:/app
    ports:
      - "25001:25001"
    command: >
      sh -c "npm install -g bun && 
             bun install && 
             cd app && npm install && npm run build && cd .. && 
             bun run app.js"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/winden
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=redis_password
      - WEBSITE_SECRET=change_this_secret
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    container_name: winden_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=winden
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: winden_redis
    restart: unless-stopped
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    container_name: winden_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - winden

volumes:
  postgres_data:
  redis_data:
```

Create an Nginx configuration file:

```bash
# Create nginx.conf
nano nginx.conf
```

Add the following content to your nginx.conf:

```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://winden:25001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://winden:25001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
    }
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

Create an SSL directory and place your certificates there:

```bash
mkdir -p ssl
# Copy your SSL certificates here
# ssl/cert.pem and ssl/key.pem
```

Start the Docker containers:

```bash
docker-compose up -d
```

### Environment Variables (Alternative to config.toml)

You can also use environment variables for configuration:

```bash
# Create an environment file
nano .env

# Add configuration variables
DATABASE_URL=postgresql://windenuser:secure_password@localhost:5432/winden
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password
WEBSITE_PORT=25001
WEBSITE_SECRET=your_secure_secret
PTERODACTYL_DOMAIN=https://panel.example.com
PTERODACTYL_KEY=ptla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PTERODACTYL_CLIENT_KEY=ptlc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🪟 Windows Installation Guide

### Prerequisites for Windows

1. **Install Node.js**
   - Download and install from [nodejs.org](https://nodejs.org/) (version 18+ recommended)
   - Verify installation: `node --version`

2. **Install PostgreSQL**
   - Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)
   - During installation, set a password for the postgres user
   - Keep note of the port (default: 5432)

3. **Install Redis**
   - Option 1: Use [Redis for Windows](https://github.com/tporadowski/redis/releases)
   - Option 2: Use [Memurai](https://www.memurai.com/) (Redis-compatible for Windows)
   - Option 3: Use WSL2 (Windows Subsystem for Linux) to run Redis

4. **Install Git**
   - Download and install from [git-scm.com](https://git-scm.com/download/win)

5. **Install Bun**
   - Open PowerShell as Administrator
   - Run: `powershell -Command "irm bun.sh/install.ps1 | iex"`
   - Close and reopen PowerShell

### Setup PostgreSQL on Windows

1. Open pgAdmin (installed with PostgreSQL)
2. Create a new database:
   - Right-click on "Databases" > "Create" > "Database"
   - Name it "winden"
3. Create a new user:
   - Expand "Login/Group Roles" > Right-click > "Create" > "Login/Group Role"
   - Name: windenuser
   - On "Definition" tab: Set a password
   - On "Privileges" tab: Enable "Can login" and "Create database"
4. Set permissions:
   - Right-click on the "winden" database > "Properties"
   - Go to "Security" tab > "Add/Edit" to grant privileges to windenuser

### Setup Redis on Windows

#### Using Memurai:
1. Download and install Memurai
2. Configure a password:
   - Open Memurai configuration file (typically at `C:\Program Files\Memurai\etc\memurai.conf`)
   - Find and uncomment the line: `# requirepass yourpassword`
   - Replace `yourpassword` with your secure password
3. Restart Memurai service

### Installing and Running Winden on Windows

```powershell
# Clone the repository
git clone https://github.com/WindenFOSS/Winden
cd Winden

# Install dependencies
bun install

# Copy and configure
copy example_config.toml config.toml
# Edit config.toml with Notepad, VS Code, or other editor

# Configure database in config.toml
# Use either connection string:
# database = "postgresql://windenuser:secure_password@localhost:5432/winden"
# Or object notation (but not both):
# [database]
# host = "localhost"
# port = 5432
# user = "windenuser"
# password = "secure_password"
# database = "winden"

# Build frontend
cd app
npm install
npm run build
cd ..

# Start Winden
bun run app.js
```

### Running as a Windows Service

For production deployments, you may want to run Winden as a Windows service:

1. Install PM2 for Windows:
```powershell
npm install -g pm2 pm2-windows-startup
pm2-startup install
```

2. Start and save Winden:
```powershell
pm2 start app.js --name winden
pm2 save
```

## 🔧 Nginx Configuration

Create a new site configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name dashboard.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

## 📋 Configuration Options

Winden offers extensive configuration through the `config.toml` file:

- **General Settings**: Dashboard name, auto-update options
- **Database**: PostgreSQL connection details
- **Pterodactyl Integration**: API keys and domain
- **Web Server**: Port, secret, domain settings
- **Coins System**: Store pricing for resources
- **Server Templates**: Various game server configurations
- **Logging**: Discord webhook integration

See `example_config.toml` for a complete reference.

### ⚠️ Important: Database Configuration

When configuring your `config.toml` file, you must use **either** the connection string **or** the database object, but not both:

```toml
# OPTION 1: Connection string (preferred)
database = "postgresql://postgres:postgres@localhost:5432/winden"

# OPTION 2: Database object (don't use both!)
# Comment out the connection string above if using this method
[database]
host = "localhost"
port = 5432
user = "postgres"
password = "postgres"
database = "winden"
```

Using both will cause a TOML parsing error: `Can't redefine existing key`.

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Verify you can connect to the database
psql -U windenuser -h localhost -d winden

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### Redis Connection Issues

```bash
# Check Redis service status
sudo systemctl status redis

# Test Redis connection
redis-cli
AUTH your_secure_redis_password
PING # Should return PONG
```

#### Backend Not Starting

```bash
# Check for errors in Winden logs
tail -f logs/error.log

# Verify correct Bun version
bun --version # Should be 1.1.42+

# Check if port is already in use
sudo lsof -i :25001
```

#### Frontend Build Issues

```bash
# Check Node.js version
node --version # Should be 18+

# Clear npm cache
npm cache clean --force

# Try with legacy peer deps
cd app
npm install --legacy-peer-deps
npm run build
```

#### Nginx Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx after config changes
sudo systemctl restart nginx
```

#### Wings Connection Issues

```bash
# Verify Wings is running on the node server
sudo systemctl status wings

# Check Wings logs
sudo tail -f /var/log/pterodactyl-wings.log

# Verify Wings config has correct allowed-origins
sudo nano /etc/pterodactyl/config.yml
```

### Troubleshooting on Windows

#### PostgreSQL Issues
- Verify PostgreSQL service is running: Open Services app (services.msc), find PostgreSQL service
- Test connection: `psql -U windenuser -d winden -h localhost`
- Check PostgreSQL logs in Event Viewer or at `C:\Program Files\PostgreSQL\[version]\data\log\`

#### Redis Issues
- Check Memurai/Redis service is running in Services app
- Test connection:
  ```powershell
  # If using Redis CLI
  redis-cli
  AUTH your_password
  PING # Should return PONG
  ```

#### Port Issues
- Check if port is already in use:
  ```powershell
  netstat -ano | findstr :25001
  ```
- To kill a process using the port:
  ```powershell
  taskkill /PID [PID] /F
  ```

#### Firewall Issues
- Check Windows Firewall settings and allow Winden on port 25001
- Go to Windows Defender Firewall > Advanced Settings > Inbound Rules > New Rule

If you're still experiencing issues, please open a GitHub issue or reach out on our Discord server for community support.

## 📚 Documentation

Visit our [documentation](https://docs.winden.sh) for detailed guides and API reference.

## 🤝 Support

- [GitHub Issues](https://github.com/WindenFOSS/Winden/issues)
- [Discord Community](https://discord.gg/winden)
- Email: support@winden.sh

## 🔐 Security

Report vulnerabilities to security@winden.sh

## 📄 License

[MIT License](LICENSE)

## 🛠️ Built With

<p align="center">
  <a href="https://bun.sh/" target="_blank"><img src="https://bun.sh/images/logo.svg" alt="Bun" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://react.dev/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://tailwindcss.com/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg" alt="Tailwind CSS" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://www.postgresql.org/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg" alt="PostgreSQL" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://redis.io/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/Redis_Logo.svg" alt="Redis" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://nodejs.org/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" alt="Node.js" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://expressjs.com/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/6/64/Expressjs.png" alt="Express.js" width="130" height="35"/></a>&nbsp;&nbsp;
  <a href="https://www.docker.com/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Docker_%28container_engine%29_logo.svg" alt="Docker" width="70" height="60"/></a>
</p>

<p align="center">
  <a href="https://ui.shadcn.com/" target="_blank"><img src="https://ui.shadcn.com/apple-touch-icon.png" alt="shadcn/ui" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://vitejs.dev/" target="_blank"><img src="https://vitejs.dev/logo.svg" alt="Vite" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://recharts.org/" target="_blank"><img src="https://seeklogo.com/images/R/recharts-logo-253D82FB0D-seeklogo.com.png" alt="Recharts" width="60" height="60"/></a>&nbsp;&nbsp;
  <a href="https://www.nginx.com/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/Nginx_logo.svg" alt="Nginx" width="130" height="30"/></a>
</p>
