# 🎯 KAIRO DEPLOYMENT - QUICK START

## ⚡ ONE-COMMAND DEPLOYMENT

### Windows:
```cmd
deploy-quick.bat
```

### Linux/Mac:
```bash
chmod +x deploy-complete.sh
./deploy-complete.sh
```

**You will be prompted for:**
1. Docker Hub login (jipheens account)
2. Server SSH password (3-4 times during SCP and SSH operations)

**Total Time:** ~15-20 minutes

---

## 🎬 What Happens During Deployment

### Phase 1: Local Build (5-10 min)
- ✅ Builds 4 Docker images (.NET 9 projects)
- ✅ Tags with `latest` and timestamp
- ✅ Pushes to Docker Hub registry

### Phase 2: File Transfer (<1 min)
- ✅ Copies `docker-compose.yml` to server
- ✅ Copies `nginx.conf` to server

### Phase 3: Server Deployment (5-10 min)
- ✅ Backs up current configuration
- ✅ Pulls images from Docker Hub
- ✅ Stops old containers (graceful)
- ✅ Removes old containers
- ✅ Starts new containers
- ✅ Restarts nginx proxy
- ✅ Verifies health checks

---

## 📊 Deployment Architecture

### Current State (OLD):
```
kairo_frontend (Node.js) → OLD
client-maintenance → OLD
account-maintenance → OLD
```

### After Deployment (NEW):
```
kairo-ui (.NET 9) → Port 80 (internal)
client-management-api (.NET 9) → Port 3306
account-management-api (.NET 9) → Port 3307
systemcore-api (.NET 9) → Port 3311 (NEW!)
```

---

## 🔍 Verify Deployment

### On Server:
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI

# Check all services
docker-compose ps

# Test health endpoints
curl http://localhost:3306/health
curl http://localhost:3307/health
curl http://localhost:3311/health

# View logs
docker-compose logs -f --tail=50 kairo-ui
```

### From Browser:
- Main UI: https://kairo.craftsilicon.com
- Test login and navigation

---

## 🆘 If Something Goes Wrong

### Quick Rollback:
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI

# Stop new services
docker-compose stop kairo-ui client-management-api account-management-api systemcore-api

# Restore backup
cp docker-compose.yml.backup.[timestamp] docker-compose.yml
cp nginx.conf.backup.[timestamp] nginx.conf

# Start old services
docker-compose up -d kairo_frontend client-maintenance account-maintenance

# Restart nginx
docker-compose restart nginx-proxy
```

### View Logs:
```bash
docker-compose logs [service-name]
```

---

## 📝 Manual Commands (if automation fails)

See **DEPLOYMENT_COMMANDS.md** for complete manual command reference.

---

## ✅ Success Indicators

After deployment, you should see:

```bash
docker-compose ps

NAME                    STATUS
kairo-ui                Up (healthy)
client-management-api   Up (healthy)
account-management-api  Up (healthy)
systemcore-api          Up (healthy)
nginx-proxy             Up
iam-api                 Up (healthy)
```

---

## 🎉 You're Done!

**Main Application:** https://kairo.craftsilicon.com

**API Endpoints:**
- IAM: `http://172.17.50.15:3309`
- Client: `http://172.17.50.15:3306`
- Account: `http://172.17.50.15:3307`
- SystemCore: `http://172.17.50.15:3311`

---

## 📞 Need Help?

1. Check **DEPLOYMENT_GUIDE.md** for detailed troubleshooting
2. View **DEPLOYMENT_COMMANDS.md** for command reference
3. Check logs: `docker-compose logs -f [service-name]`
