# KAIRO Multi-Project Docker Deployment Guide

## 🎯 Overview

This deployment replaces the existing containers with new .NET 9 microservices:

| Old Container | New Service | Port | Status |
|--------------|-------------|------|--------|
| `kairo_frontend` | `kairo-ui` | 80 (internal) | **NEW .NET 9 Razor Pages** |
| `client-maintenance` | `client-management-api` | 3306 | **NEW .NET 9 API** |
| `account-maintenance` | `account-management-api` | 3307 | **NEW .NET 9 API** |
| N/A | `systemcore-api` | 3311 | **NEW .NET 9 API** |

**Existing Services (Unchanged):**
- `iam-api` (Port 3309)
- `iam-webclient` (Port 3310)
- `client-document-api` (Port 5102)
- `face-signature-detection` (Port 5104)
- `microfinance` (Port 3308)

---

## 📋 Prerequisites

1. **Docker Hub Account**: `jipheens`
2. **Server Access**: `kairo@172.17.50.15`
3. **SSL Certificates**: Already in `/home/kairo/CoreBankingAPI/ssl/`
4. **Database**: SQL Server at `172.16.2.42\SQL2022,3020`

---

## 🚀 Deployment Steps

### **Option A: Automated Deployment (Recommended)**

#### On Windows (PowerShell):
```powershell
# Navigate to solution root
cd D:\KairoFullMvc\KAIRO-FULL-MVC

# Run deployment script
.\deploy-docker.ps1
```

#### On Linux/Mac (Bash):
```bash
# Navigate to solution root
cd /path/to/KAIRO-FULL-MVC

# Make script executable
chmod +x deploy-docker.sh

# Run deployment script
./deploy-docker.sh
```

**The script will:**
1. Build all 4 Docker images
2. Push to Docker Hub (optional)
3. Transfer config files to server via SCP
4. Deploy on the server
5. Show logs

---

### **Option B: Manual Step-by-Step Deployment**

#### **Step 1: Build Docker Images Locally**

```bash
# From your local dev machine (D:\KairoFullMvc\KAIRO-FULL-MVC)

# Build kairo-ui (Frontend)
docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .

# Build Account Management API
docker build -f AccountManagement/Dockerfile -t jipheens/account-management-api:latest .

# Build Client Management API
docker build -f ClientManagement/Dockerfile -t jipheens/client-management-api:latest .

# Build System Core API
docker build -f SystemCoreApi/Dockerfile -t jipheens/systemcore-api:latest .
```

#### **Step 2: Push to Docker Hub**

```bash
# Login to Docker Hub
docker login

# Push images
docker push jipheens/kairo-ui:latest
docker push jipheens/account-management-api:latest
docker push jipheens/client-management-api:latest
docker push jipheens/systemcore-api:latest
```

#### **Step 3: Transfer Config Files to Server**

```bash
# Copy docker-compose file
scp docker-compose-production.yml kairo@172.17.50.15:/home/kairo/CoreBankingAPI/docker-compose.yml

# Copy nginx config
scp nginx.new.conf kairo@172.17.50.15:/home/kairo/CoreBankingAPI/nginx.conf
```

**Password Prompt**: Enter password when prompted

#### **Step 4: Deploy on Server**

```bash
# SSH into server
ssh kairo@172.17.50.15

# Navigate to deployment directory
cd /home/kairo/CoreBankingAPI

# Pull latest images
docker-compose pull kairo-ui client-management-api account-management-api systemcore-api

# Stop old containers (graceful shutdown)
docker-compose stop kairo_frontend client-maintenance account-maintenance

# Remove old containers
docker-compose rm -f kairo_frontend client-maintenance account-maintenance

# Start new services
docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api

# Restart nginx to pick up new upstream servers
docker-compose restart nginx-proxy

# Verify deployment
docker-compose ps

# Check logs
docker-compose logs -f --tail=100 kairo-ui
```

---

## 🔍 Verification

### **1. Check Service Health**

```bash
# On the server
curl http://localhost:3306/health  # Client Management
curl http://localhost:3307/health  # Account Management
curl http://localhost:3311/health  # System Core API
```

### **2. Check All Containers**

```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS              PORTS
kairo-ui                Up (healthy)        80/tcp
client-management-api   Up (healthy)        0.0.0.0:3306->80/tcp
account-management-api  Up (healthy)        0.0.0.0:3307->80/tcp
systemcore-api          Up (healthy)        0.0.0.0:3311->80/tcp
nginx-proxy             Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
iam-api                 Up (healthy)        0.0.0.0:3309->80/tcp
```

### **3. Test from Browser**

- **Main UI**: https://kairo.craftsilicon.com
- **IAM Web Client**: http://172.17.50.15:3310

### **4. View Logs**

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f kairo-ui
docker-compose logs -f account-management-api
docker-compose logs -f client-management-api
docker-compose logs -f systemcore-api
```

---

## 🔧 Configuration Changes

### **kairo-ui Configuration**

The UI now connects to internal Docker services:

```json
{
  "ApiSettings": {
    "IdentityAccessManagentBaseUrl": "http://iam-api:80/api",
    "SystemCoreBaseUrl": "http://systemcore-api:80/api",
    "ClientManagementBaseUrl": "http://client-management-api:80/api",
    "AccountManagementBaseUrl": "http://account-management-api:80/api"
  }
}
```

### **Backend API CORS Configuration**

All APIs now allow:
- `https://kairo.craftsilicon.com`
- `http://kairo-ui:80` (internal Docker)

---

## 🐛 Troubleshooting

### **Problem: Container won't start**

```bash
# Check logs
docker-compose logs kairo-ui

# Check if port is already in use
sudo netstat -tulpn | grep :3306
sudo netstat -tulpn | grep :3307
sudo netstat -tulpn | grep :3311
```

### **Problem: Database connection failed**

```bash
# Test SQL Server connectivity from container
docker exec -it account-management-api bash
apt-get update && apt-get install -y telnet
telnet 172.16.2.42 3020
```

### **Problem: API calls failing (500 errors)**

```bash
# Check if all services are running
docker-compose ps

# Check network connectivity between containers
docker exec -it kairo-ui curl http://account-management-api:80/health
docker exec -it kairo-ui curl http://client-management-api:80/health
docker exec -it kairo-ui curl http://systemcore-api:80/health
```

### **Problem: Nginx not routing correctly**

```bash
# Test nginx configuration
docker exec nginx-proxy nginx -t

# Reload nginx
docker-compose restart nginx-proxy

# Check nginx logs
docker exec nginx-proxy tail -f /var/log/nginx/error.log
```

---

## 🔄 Rollback Procedure

If the new deployment fails, rollback to old containers:

```bash
# On the server
cd /home/kairo/CoreBankingAPI

# Stop new containers
docker-compose stop kairo-ui client-management-api account-management-api systemcore-api

# Start old containers (if images still exist)
docker-compose up -d kairo_frontend client-maintenance account-maintenance

# Restart nginx
docker-compose restart nginx-proxy
```

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────┐
│  Nginx Reverse Proxy (443/80)                       │
│  kairo.craftsilicon.com                             │
└─────────────────┬───────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬──────────────┐
    │             │             │              │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐    ┌───▼────┐
│ kairo  │   │ Client │   │Account │    │System  │
│  -ui   │   │  Mgmt  │   │  Mgmt  │    │  Core  │
│  :80   │   │ :3306  │   │ :3307  │    │ :3311  │
└───┬────┘   └───┬────┘   └───┬────┘    └───┬────┘
    │            │            │              │
    └────────────┴────────────┴──────────────┘
                  │
         ┌────────▼────────┐
         │  SQL Server     │
         │ 172.16.2.42:3020│
         └─────────────────┘
```

---

## 📝 Environment Variables Reference

### **kairo-ui**
- `ApiSettings__IdentityAccessManagentBaseUrl`
- `ApiSettings__SystemCoreBaseUrl`
- `ApiSettings__ClientManagementBaseUrl`
- `ApiSettings__AccountManagementBaseUrl`
- `OAuth__TokenEndpoint`

### **Backend APIs (All)**
- `AppSettings__DBServerName`
- `AppSettings__DatabaseName`
- `AppSettings__BRUserName` (encrypted)
- `AppSettings__BRUserPassword` (encrypted)
- `AppSettings__ValidIssuer`
- `AppSettings__ValidAudience`
- `AppSettings__UserKey`
- `AppSettings__CORS`

---

## 🔐 Security Notes

1. **Database Credentials**: Already encrypted in environment variables
2. **JWT Secrets**: Configured per service
3. **HTTPS**: Enabled via Nginx with SSL certificates
4. **Internal Communication**: HTTP between containers (not exposed)
5. **CORS**: Restricted to `kairo.craftsilicon.com`

---

## 📞 Support

After deployment, monitor the following:

1. **Application Logs**: `/app/logs` (mounted volumes)
2. **Docker Logs**: `docker-compose logs -f`
3. **Nginx Logs**: Check nginx-proxy container
4. **Health Endpoints**: All services expose `/health`

---

## 🎉 Success Criteria

✅ All containers show "Up (healthy)" status  
✅ Main UI loads at https://kairo.craftsilicon.com  
✅ No 500/502 errors in browser console  
✅ API calls succeed with proper authentication  
✅ Database connections established (check logs)  

---

## 📅 Deployment Checklist

- [ ] Build all Docker images locally
- [ ] Push images to Docker Hub
- [ ] Backup current docker-compose.yml on server
- [ ] Transfer new docker-compose.yml to server
- [ ] Transfer new nginx.conf to server
- [ ] Pull images on server
- [ ] Stop old containers
- [ ] Start new containers
- [ ] Verify health checks
- [ ] Test main UI functionality
- [ ] Monitor logs for errors
- [ ] Test API endpoints
- [ ] Verify database connectivity

---

**Deployed By**: Deployment Script v1.0  
**Deployment Date**: [Auto-generated]  
**Server**: kairo@172.17.50.15:/home/kairo/CoreBankingAPI
