# 🚀 KAIRO DOCKER DEPLOYMENT - STEP-BY-STEP GUIDE

## 📋 Pre-Deployment Checklist

- ✅ Docker installed and running
- ✅ Docker Hub access (jipheens account)
- ✅ SSH access to kairo@172.17.50.15
- ✅ All code changes committed to Git
- ✅ All projects build successfully locally

---

## 🎯 Deployment Overview

### Services to Deploy:
1. **kairo-ui** → Replaces `kairo_frontend` (Port: 80 internal)
2. **client-management-api** → Replaces `client-maintenance` (Port: 3306)
3. **account-management-api** → Replaces `account-maintenance` (Port: 3307)
4. **systemcore-api** → **NEW SERVICE** (Port: 3311)

---

## 📦 OPTION 1: AUTOMATED DEPLOYMENT

### Step 1: Run the Build Script

**Windows (PowerShell):**
```powershell
cd D:\KairoFullMvc\KAIRO-FULL-MVC
.\deploy-docker.ps1
```

**Linux/Mac (Bash):**
```bash
cd /path/to/KAIRO-FULL-MVC
chmod +x deploy-docker.sh
./deploy-docker.sh
```

The script will automatically:
- ✅ Build all 4 Docker images
- ✅ Push to Docker Hub
- ✅ Transfer configs via SCP
- ✅ Deploy on server
- ✅ Restart nginx

**You'll be prompted for:**
1. Docker Hub credentials
2. Server SSH password (kairo@172.17.50.15)
3. Confirmation before each major step

---

## 🔧 OPTION 2: MANUAL DEPLOYMENT

### Step 1: Build Images Locally

```bash
# Navigate to solution root
cd D:\KairoFullMvc\KAIRO-FULL-MVC

# Build images
docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .
docker build -f AccountManagement/Dockerfile -t jipheens/account-management-api:latest .
docker build -f ClientManagement/Dockerfile -t jipheens/client-management-api:latest .
docker build -f SystemCoreApi/Dockerfile -t jipheens/systemcore-api:latest .
```

**Expected Output:**
```
Successfully built [image-id]
Successfully tagged jipheens/kairo-ui:latest
```

### Step 2: Push to Docker Hub

```bash
# Login
docker login
# Username: jipheens
# Password: [enter password]

# Push images
docker push jipheens/kairo-ui:latest
docker push jipheens/account-management-api:latest
docker push jipheens/client-management-api:latest
docker push jipheens/systemcore-api:latest
```

### Step 3: Transfer Configuration Files

```bash
# Copy docker-compose
scp docker-compose.final.yml kairo@172.17.50.15:/home/kairo/CoreBankingAPI/docker-compose.new.yml

# Copy nginx config
scp nginx.new.conf kairo@172.17.50.15:/home/kairo/CoreBankingAPI/nginx.new.conf
```

**Enter password when prompted**

### Step 4: SSH into Server

```bash
ssh kairo@172.17.50.15
```

### Step 5: Backup Current Configuration (on server)

```bash
cd /home/kairo/CoreBankingAPI

# Backup current files
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d-%H%M%S)
cp nginx.conf nginx.conf.backup.$(date +%Y%m%d-%H%M%S)
```

### Step 6: Replace Configuration (on server)

```bash
# Replace with new configuration
mv docker-compose.new.yml docker-compose.yml
mv nginx.new.conf nginx.conf
```

### Step 7: Pull New Images (on server)

```bash
# Pull latest images from Docker Hub
docker-compose pull kairo-ui
docker-compose pull client-management-api
docker-compose pull account-management-api
docker-compose pull systemcore-api
```

### Step 8: Stop Old Containers (on server)

```bash
# Gracefully stop old containers
docker-compose stop kairo_frontend
docker-compose stop client-maintenance
docker-compose stop account-maintenance

# Remove old containers
docker-compose rm -f kairo_frontend client-maintenance account-maintenance
```

### Step 9: Start New Services (on server)

```bash
# Start new services
docker-compose up -d kairo-ui
docker-compose up -d client-management-api
docker-compose up -d account-management-api
docker-compose up -d systemcore-api

# Restart nginx to pick up new upstreams
docker-compose restart nginx-proxy
```

### Step 10: Verify Deployment (on server)

```bash
# Check all container status
docker-compose ps

# Expected output:
# NAME                    STATUS              PORTS
# kairo-ui                Up (healthy)        80/tcp
# client-management-api   Up (healthy)        0.0.0.0:3306->80/tcp
# account-management-api  Up (healthy)        0.0.0.0:3307->80/tcp
# systemcore-api          Up (healthy)        0.0.0.0:3311->80/tcp
# nginx-proxy             Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp

# Check health endpoints
curl http://localhost:3306/health
curl http://localhost:3307/health
curl http://localhost:3311/health

# View logs
docker-compose logs -f --tail=100 kairo-ui
```

---

## ✅ Post-Deployment Verification

### 1. Test Main UI
```bash
# From browser
https://kairo.craftsilicon.com
```

### 2. Test API Health Endpoints
```bash
# On server
curl http://localhost:3306/health  # Client Management
curl http://localhost:3307/health  # Account Management
curl http://localhost:3311/health  # System Core API

# From external
curl https://kairo.craftsilicon.com/api/clients/health
curl https://kairo.craftsilicon.com/api/accounts/health
curl https://kairo.craftsilicon.com/api/systemcore/health
```

### 3. Monitor Logs
```bash
# View logs for each service
docker-compose logs -f kairo-ui
docker-compose logs -f account-management-api
docker-compose logs -f client-management-api
docker-compose logs -f systemcore-api

# View all logs
docker-compose logs -f --tail=50
```

### 4. Check Resource Usage
```bash
docker stats
```

---

## 🔴 Rollback Procedure

If something goes wrong:

```bash
# On server
cd /home/kairo/CoreBankingAPI

# Stop new containers
docker-compose stop kairo-ui client-management-api account-management-api systemcore-api
docker-compose rm -f kairo-ui client-management-api account-management-api systemcore-api

# Restore backup configuration
cp docker-compose.yml.backup.[timestamp] docker-compose.yml
cp nginx.conf.backup.[timestamp] nginx.conf

# Start old containers (if still available)
docker-compose up -d kairo_frontend client-maintenance account-maintenance

# Restart nginx
docker-compose restart nginx-proxy
```

---

## 🐛 Troubleshooting

### Issue: Container fails to start

**Solution:**
```bash
# Check logs
docker-compose logs [service-name]

# Check if port is already in use
sudo netstat -tulpn | grep :3306
sudo netstat -tulpn | grep :3307
sudo netstat -tulpn | grep :3311

# Kill process on port if needed
sudo kill -9 [PID]
```

### Issue: Database connection failed

**Solution:**
```bash
# Test database connectivity from container
docker exec -it account-management-api bash
apt-get update && apt-get install -y telnet
telnet 172.16.2.42 3020

# Check connection string in logs
docker-compose logs account-management-api | grep -i "connection"
```

### Issue: 502 Bad Gateway

**Solution:**
```bash
# Check if backend services are running
docker-compose ps

# Test nginx upstream connectivity
docker exec nginx-proxy wget -O- http://kairo-ui:80/
docker exec nginx-proxy wget -O- http://account-management-api:80/health

# Check nginx configuration
docker exec nginx-proxy nginx -t

# View nginx error logs
docker exec nginx-proxy cat /var/log/nginx/error.log
```

### Issue: API calls return 401 Unauthorized

**Solution:**
```bash
# Check if IAM API is running
docker-compose ps iam-api

# Test IAM API
curl http://localhost:3309/health

# Check kairo-ui can reach IAM
docker exec kairo-ui curl http://iam-api:80/health
```

---

## 📊 Service Communication Map

```
Browser (HTTPS)
     ↓
Nginx (443) → kairo-ui (80)
                 ↓
     ┌───────────┼───────────┬──────────────┐
     ↓           ↓           ↓              ↓
iam-api:80  client-mgmt  account-mgmt  systemcore
            :80          :80           :80
     ↓           ↓           ↓              ↓
     └───────────┴───────────┴──────────────┘
                     ↓
            SQL Server (172.16.2.42:3020)
```

---

## 🔑 Important Configuration Points

### 1. **Internal Docker Network Communication**
- Services use container names as hostnames
- Example: `http://iam-api:80/api` not `http://localhost:3309/api`

### 2. **External Access**
- Main UI: `https://kairo.craftsilicon.com` (via nginx)
- Direct API access: `http://172.17.50.15:[port]`

### 3. **Database Connection**
- Server: `172.16.2.42\SQL2022,3020`
- Credentials: Encrypted in environment variables

### 4. **Ports Assignment**
```
3306 → client-management-api
3307 → account-management-api
3308 → microfinance (existing)
3309 → iam-api (existing)
3310 → iam-webclient (existing)
3311 → systemcore-api (NEW)
5102 → client-document-api (existing)
5104 → face-signature-detection (existing)
```

---

## 📞 Post-Deployment Testing

### Test Authentication Flow
1. Open https://kairo.craftsilicon.com
2. Login should redirect to IAM
3. After login, dashboard should load

### Test Account Maintenance
1. Navigate to Accounts Maintenance
2. Search for an account
3. View account details
4. Check browser console for API calls

### Monitor Logs
```bash
# Watch for errors
docker-compose logs -f kairo-ui | grep -i error
docker-compose logs -f account-management-api | grep -i error
```

---

## 📝 Notes

1. **SSL Certificates**: Already configured at `/home/kairo/CoreBankingAPI/ssl/`
2. **Log Persistence**: Logs are stored in Docker volumes
3. **Database**: Shared SQL Server instance
4. **Memory Limits**: 512MB per service (adjust if needed)
5. **Health Checks**: All services have health monitoring

---

## ✅ Success Criteria

- [ ] All containers show "Up (healthy)" status
- [ ] Nginx test endpoint responds: `https://kairo.craftsilicon.com/test`
- [ ] Main UI loads at `https://kairo.craftsilicon.com`
- [ ] Login functionality works
- [ ] API calls succeed (check browser Network tab)
- [ ] No errors in docker logs
- [ ] Health endpoints respond with 200 OK

---

## 🎉 Deployment Complete!

Your KAIRO application is now running on Docker with all .NET 9 microservices!

For support, check logs or contact the development team.
