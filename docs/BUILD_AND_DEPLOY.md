# 🚀 BUILD & DEPLOY WORKFLOW

## 📋 **Quick Reference - After Making Code Changes**

### **Option 1: Build Everything (All Services)**
```powershell
.\build-all.ps1
```

### **Option 2: Build Specific Service Only**
```powershell
.\build-service.ps1 kairo-ui
.\build-service.ps1 client-management-api
.\build-service.ps1 account-management-api
.\build-service.ps1 systemcore-api
```

---

## 🔄 **Complete Workflow**

### **Step 1: Make Your Code Changes**
- Edit files in `kairo-ui/`, `AccountManagement/`, `ClientManagement/`, or `SystemCoreApi/`
- Test locally if possible
- Commit changes to Git

### **Step 2: Build Docker Images**

**A) Build All Services:**
```powershell
# Builds all 4 services and pushes to Docker Hub
.\build-all.ps1
```

**B) Build Single Service (Faster):**
```powershell
# Build only what changed
docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .
docker push jipheens/kairo-ui:latest
```

### **Step 3: Deploy to Server**

**A) Deploy All Services:**
```powershell
# SSH into server and run
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull
sudo docker-compose up -d --force-recreate
```

**B) Deploy Single Service (Recommended - Faster):**
```powershell
# SSH into server and run
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull kairo-ui
sudo docker-compose up -d --force-recreate kairo-ui
```

### **Step 4: Verify Deployment**
```bash
# Check status
sudo docker-compose ps

# Test health
curl http://localhost:3309/health  # IAM
curl http://localhost:3306/health  # Client Management
curl http://localhost:3307/health  # Account Management
curl http://localhost:3311/health  # SystemCore

# View logs if issues
sudo docker-compose logs --tail=50 kairo-ui
```

---

## 📦 **Service-Specific Build Commands**

### **kairo-ui (Frontend)**
```bash
docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .
docker push jipheens/kairo-ui:latest
```

### **Client Management API**
```bash
docker build -f ClientManagement/Dockerfile -t jipheens/client-management-api:latest .
docker push jipheens/client-management-api:latest
```

### **Account Management API**
```bash
docker build -f AccountManagement/Dockerfile -t jipheens/account-management-api:latest .
docker push jipheens/account-management-api:latest
```

### **SystemCore API**
```bash
docker build -f SystemCoreApi/Dockerfile -t jipheens/systemcore-api:latest .
docker push jipheens/systemcore-api:latest
```

---

## ⚡ **Quick Deploy Scripts**

### **For Windows (PowerShell):**

**Build & Deploy Single Service:**
```powershell
# Example: kairo-ui
$service = "kairo-ui"
$image = "jipheens/kairo-ui:latest"
$dockerfile = "kairo-ui/Dockerfile"

Write-Host "Building $service..." -ForegroundColor Yellow
docker build -f $dockerfile -t $image .

Write-Host "Pushing $service..." -ForegroundColor Green
docker push $image

Write-Host "Deploying on server..." -ForegroundColor Cyan
ssh kairo@172.17.50.15 "cd /home/kairo/CoreBankingAPI && sudo docker-compose pull $service && sudo docker-compose up -d --force-recreate $service && sleep 15 && sudo docker-compose ps | grep $service"
```

### **For Linux Server:**

**Quick Deploy After Push:**
```bash
#!/bin/bash
SERVICE=$1  # Pass service name as argument

cd /home/kairo/CoreBankingAPI

echo "Pulling latest $SERVICE..."
sudo docker-compose pull $SERVICE

echo "Restarting $SERVICE..."
sudo docker-compose up -d --force-recreate $SERVICE

echo "Waiting 15 seconds..."
sleep 15

echo "Status:"
sudo docker-compose ps | grep $SERVICE

echo "Logs:"
sudo docker-compose logs --tail=30 $SERVICE
```

**Usage:**
```bash
bash quick-deploy.sh kairo-ui
bash quick-deploy.sh client-management-api
```

---

## 🎯 **Recommended Workflow (Fastest)**

### **When You Change Only Frontend (kairo-ui):**

```powershell
# 1. Build and push
docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .
docker push jipheens/kairo-ui:latest

# 2. Deploy on server (run these on server)
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull kairo-ui
sudo docker-compose up -d --force-recreate kairo-ui
```

**Time: ~3-5 minutes**

### **When You Change Only Backend API:**

```powershell
# Example: AccountManagement
docker build -f AccountManagement/Dockerfile -t jipheens/account-management-api:latest .
docker push jipheens/account-management-api:latest

# Deploy
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull account-management-api
sudo docker-compose up -d --force-recreate account-management-api
```

**Time: ~3-5 minutes**

---

## 🛠️ **Configuration Changes**

### **If You Change appsettings.Production.json:**

1. Edit the file
2. Rebuild the image (settings are baked into image)
3. Push to Docker Hub
4. Deploy on server

### **If You Change docker-compose.yml:**

1. Edit `docker-compose.final.yml` locally
2. Transfer to server:
```powershell
scp docker-compose.final.yml kairo@172.17.50.15:/home/kairo/CoreBankingAPI/docker-compose.yml
```
3. Restart affected services:
```bash
sudo docker-compose up -d --force-recreate
```

### **If You Change nginx.conf:**

1. Edit `nginx.new.conf` locally
2. Transfer to server:
```powershell
scp nginx.new.conf kairo@172.17.50.15:/home/kairo/CoreBankingAPI/nginx.conf
```
3. Restart nginx:
```bash
sudo docker-compose restart nginx-proxy
```

---

## 📊 **Troubleshooting**

### **Build Fails:**
```powershell
# Clean Docker build cache
docker system prune -a -f

# Rebuild without cache
docker build --no-cache -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .
```

### **Deployment Fails:**
```bash
# Check logs on server
sudo docker-compose logs --tail=100 <service-name>

# Force recreate all
sudo docker-compose down
sudo docker-compose up -d

# Remove orphan containers
sudo docker-compose up -d --remove-orphans
```

### **Service Won't Start:**
```bash
# Check specific container logs
sudo docker logs <container-name>

# Check if port is in use
sudo netstat -tulpn | grep <port>

# Restart specific service
sudo docker-compose restart <service-name>
```

---

## 🎯 **Best Practices**

1. **Always test locally** before deploying to production
2. **Build one service at a time** if only that service changed
3. **Check logs immediately** after deployment
4. **Keep backups** of working docker-compose.yml
5. **Use version tags** for important releases:
   ```bash
   docker tag jipheens/kairo-ui:latest jipheens/kairo-ui:v1.0.0
   docker push jipheens/kairo-ui:v1.0.0
   ```

---

## 📝 **Quick Cheat Sheet**

| Task | Command |
|------|---------|
| Build kairo-ui | `docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .` |
| Push kairo-ui | `docker push jipheens/kairo-ui:latest` |
| Deploy kairo-ui | `sudo docker-compose pull kairo-ui && sudo docker-compose up -d --force-recreate kairo-ui` |
| View logs | `sudo docker-compose logs --tail=50 kairo-ui` |
| Check status | `sudo docker-compose ps` |
| Restart nginx | `sudo docker-compose restart nginx-proxy` |
| Full restart | `sudo docker-compose restart` |

---

## 🔐 **Important Reminders**

- **Docker Hub credentials:** Must be logged in (`docker login`)
- **Server SSH:** Requires password for `kairo@172.17.50.15`
- **Sudo password:** Required on server for docker commands
- **.NET Versions:** APIs use .NET 8.0, kairo-ui uses .NET 9.0
- **Database servers:** 
  - IAM: `172.16.2.3,3020`
  - Others: `172.16.2.42\SQL2022,3020`

---

**Save this file for future reference!** 📚
