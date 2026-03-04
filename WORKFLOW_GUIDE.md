# 🔄 FUTURE DEPLOYMENT WORKFLOW

## ⚡ **QUICK START - Most Common Scenarios**

### **Scenario 1: Changed Frontend Code (kairo-ui)**

**On Your Machine (Windows):**
```powershell
# Build and push
.\build-service.ps1 kairo-ui
```

**On Server (SSH):**
```bash
bash quick-deploy.sh kairo-ui
```

**Total Time: ~5 minutes**

---

### **Scenario 2: Changed Backend API**

**Example: Account Management**

**On Your Machine:**
```powershell
.\build-service.ps1 account-management-api
```

**On Server:**
```bash
bash quick-deploy.sh account-management-api
```

---

### **Scenario 3: Changed Multiple Services**

**On Your Machine:**
```powershell
# Build all services at once
.\build-all.ps1
```

**On Server:**
```bash
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull
sudo docker-compose up -d --force-recreate
```

---

## 📋 **DETAILED STEP-BY-STEP WORKFLOW**

### **STEP 1: Make Code Changes**

Edit your code in:
- `kairo-ui/` - Frontend changes
- `AccountManagement/` - Account API changes
- `ClientManagement/` - Client API changes
- `SystemCoreApi/` - SystemCore API changes

### **STEP 2: Build Docker Image**

**Option A - Use PowerShell Script (Recommended):**
```powershell
# Single service
.\build-service.ps1 kairo-ui

# All services
.\build-all.ps1
```

**Option B - Manual Build:**
```powershell
# Replace <service> with your service
docker build -f <dockerfile-path> -t <image-name> .
docker push <image-name>
```

**Examples:**
```powershell
docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .
docker push jipheens/kairo-ui:latest

docker build -f AccountManagement/Dockerfile -t jipheens/account-management-api:latest .
docker push jipheens/account-management-api:latest
```

### **STEP 3: Deploy to Server**

**Option A - Use Server Script (Recommended):**

First, transfer the quick-deploy script (one-time):
```powershell
scp quick-deploy.sh kairo@172.17.50.15:/home/kairo/CoreBankingAPI/
```

Then deploy:
```bash
ssh kairo@172.17.50.15
bash /home/kairo/CoreBankingAPI/quick-deploy.sh kairo-ui
```

**Option B - Manual Deploy:**
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI

# Pull, stop, remove, start
sudo docker-compose pull kairo-ui
sudo docker-compose stop kairo-ui
sudo docker-compose rm -f kairo-ui
sudo docker-compose up -d kairo-ui
```

### **STEP 4: Verify Deployment**

```bash
# Check status
sudo docker-compose ps

# Test health (for APIs)
curl http://localhost:3306/health  # Client Management
curl http://localhost:3307/health  # Account Management
curl http://localhost:3311/health  # SystemCore
curl http://localhost:3309/health  # IAM

# View logs
sudo docker-compose logs --tail=50 kairo-ui

# Access application
# Browser: https://kairo.craftsilicon.com
```

---

## 🎯 **SERVICE MAPPING REFERENCE**

| Service Name | Dockerfile | Docker Image | Port |
|-------------|------------|--------------|------|
| kairo-ui | `kairo-ui/Dockerfile` | `jipheens/kairo-ui:latest` | Internal (via nginx) |
| Client Management | `ClientManagement/Dockerfile` | `jipheens/client-management-api:latest` | 3306 |
| Account Management | `AccountManagement/Dockerfile` | `jipheens/account-management-api:latest` | 3307 |
| SystemCore | `SystemCoreApi/Dockerfile` | `jipheens/systemcore-api:latest` | 3311 |
| IAM | (Pre-built) | `jipheens/iam-solution-api:latest` | 3309 |

---

## 📁 **Important Files**

| File | Purpose | When to Update |
|------|---------|----------------|
| `appsettings.Production.json` | Production config | When changing API URLs, OAuth, logging |
| `docker-compose.final.yml` | Container orchestration | When adding services, changing ports/env vars |
| `nginx.new.conf` | Reverse proxy routing | When changing routes or SSL |
| `Dockerfile` | Build instructions | When changing dependencies |

---

## 🔧 **Common Tasks**

### **Update Configuration Only (No Code Changes)**

**If you change appsettings.Production.json:**
```powershell
# Must rebuild the image (config is baked in)
.\build-service.ps1 kairo-ui
# Then deploy on server
```

**If you change docker-compose.yml:**
```powershell
# Transfer to server
scp docker-compose.final.yml kairo@172.17.50.15:/home/kairo/CoreBankingAPI/docker-compose.yml

# On server: restart affected services
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose up -d --force-recreate
```

**If you change nginx.conf:**
```powershell
# Transfer to server
scp nginx.new.conf kairo@172.17.50.15:/home/kairo/CoreBankingAPI/nginx.conf

# On server: restart nginx
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose restart nginx-proxy
```

---

### **Update Dependencies (NuGet Packages)**

1. Update packages in `.csproj` file
2. Rebuild image (Docker will restore new packages)
3. Deploy

```powershell
.\build-service.ps1 account-management-api
```

---

### **Rollback to Previous Version**

**If new deployment has issues:**

```bash
# On server
cd /home/kairo/CoreBankingAPI

# Restore backup config
sudo cp docker-compose.yml.backup.20260227-083258 docker-compose.yml

# Restart with old config
sudo docker-compose up -d --force-recreate

# Or pull old image by tag
sudo docker pull jipheens/kairo-ui:v1.0.0
```

---

## 🎯 **ONE-LINER DEPLOYMENTS**

### **Frontend (kairo-ui) Only:**
```powershell
# Local machine
docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest . && docker push jipheens/kairo-ui:latest

# Then on server
ssh kairo@172.17.50.15 "cd /home/kairo/CoreBankingAPI && sudo docker-compose pull kairo-ui && sudo docker-compose up -d --force-recreate kairo-ui"
```

### **Account Management API Only:**
```powershell
# Local machine
docker build -f AccountManagement/Dockerfile -t jipheens/account-management-api:latest . && docker push jipheens/account-management-api:latest

# Then on server
ssh kairo@172.17.50.15 "cd /home/kairo/CoreBankingAPI && sudo docker-compose pull account-management-api && sudo docker-compose up -d --force-recreate account-management-api"
```

---

## 🚨 **Troubleshooting**

### **Build Fails:**
```powershell
# Clean Docker cache
docker system prune -a -f

# Rebuild without cache
docker build --no-cache -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .
```

### **Push Fails (Not Logged In):**
```powershell
docker login
# Enter: jipheens
# Enter: <your-docker-hub-password>
```

### **Container Won't Start on Server:**
```bash
# View detailed logs
sudo docker logs <container-name> --tail=200

# Check for port conflicts
sudo netstat -tulpn | grep <port>

# Force remove and recreate
sudo docker-compose rm -f <service-name>
sudo docker-compose up -d <service-name>
```

### **Database Connection Issues:**
```bash
# Test connectivity from container
sudo docker exec <container-name> ping 172.16.2.42

# Check environment variables
sudo docker exec <container-name> env | grep -i database
```

---

## 📊 **Development Best Practices**

1. **Test Locally First**
   - Run services locally before building Docker images
   - Use `dotnet run` to verify changes

2. **Incremental Builds**
   - Only rebuild services that changed
   - Saves time and bandwidth

3. **Version Tagging**
   - Tag important releases:
   ```powershell
   docker tag jipheens/kairo-ui:latest jipheens/kairo-ui:v1.2.0
   docker push jipheens/kairo-ui:v1.2.0
   ```

4. **Keep Backups**
   - Server auto-creates backups with timestamps
   - Keep working configurations

5. **Monitor Logs**
   - Always check logs after deployment
   - Set up log retention policies

---

## 🔑 **Key Points to Remember**

✅ **Local Changes → Build → Push → Deploy on Server**

✅ **Single Service Changed = Single Service Build**

✅ **appsettings Changes = Rebuild Required** (config is baked into image)

✅ **docker-compose Changes = Just Transfer File** (no rebuild needed)

✅ **Always Verify After Deploy** (check logs and health endpoints)

---

## 📞 **Quick Reference Commands**

```powershell
# BUILD
.\build-service.ps1 kairo-ui                    # Build single service
.\build-all.ps1                                 # Build all services

# DEPLOY (on server)
bash quick-deploy.sh kairo-ui                   # Deploy single service
sudo docker-compose pull && sudo docker-compose up -d --force-recreate  # Deploy all

# MONITOR (on server)
sudo docker-compose ps                          # Check status
sudo docker-compose logs -f kairo-ui            # Watch logs live
curl http://localhost:3309/health               # Test health

# TROUBLESHOOT (on server)
sudo docker-compose logs --tail=100 kairo-ui    # View recent logs
sudo docker-compose restart kairo-ui            # Restart service
sudo docker-compose down && sudo docker-compose up -d  # Full restart
```

---

**Save these scripts and use them for all future deployments!** 🚀
