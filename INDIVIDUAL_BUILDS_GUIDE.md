# INDIVIDUAL SERVICE BUILD & DEPLOY GUIDE

## SIMPLE BUILD FILES - ONE FOR EACH SERVICE

I've created easy-to-use batch files for building each service individually.

---

## AVAILABLE BUILD FILES

### 1. BUILD_KAIRO_UI.bat
**When to use:** After making changes to the frontend (kairo-ui)
- Views, JavaScript, CSS
- Controllers, Services
- Frontend logic

**Double-click to build kairo-ui**

---

### 2. BUILD_ACCOUNT_API.bat
**When to use:** After making changes to Account Management API
- AccountManagement folder
- Account-related endpoints
- Account business logic

**Double-click to build account-management-api**

---

### 3. BUILD_CLIENT_API.bat
**When to use:** After making changes to Client Management API
- ClientManagement folder
- Client-related endpoints
- Client business logic

**Double-click to build client-management-api**

---

### 4. BUILD_SYSTEMCORE_API.bat
**When to use:** After making changes to SystemCore API
- SystemCoreApi folder
- Core system endpoints
- Shared business logic

**Double-click to build systemcore-api**

---

### 5. BUILD_ALL.bat
**When to use:** After making changes to multiple services
- Major updates
- Configuration changes affecting all services
- Before major deployments

**Double-click to build all services** (takes 15-20 minutes)

---

## COMPLETE WORKFLOW

### Step 1: Make Your Changes
Edit code in the appropriate project folder:
- `kairo-ui/` - Frontend
- `AccountManagement/` - Account API
- `ClientManagement/` - Client API
- `SystemCoreApi/` - SystemCore API

### Step 2: Build the Changed Service
Double-click the corresponding batch file:
- Changed frontend? → `BUILD_KAIRO_UI.bat`
- Changed Account API? → `BUILD_ACCOUNT_API.bat`
- Changed Client API? → `BUILD_CLIENT_API.bat`
- Changed SystemCore? → `BUILD_SYSTEMCORE_API.bat`
- Changed multiple? → `BUILD_ALL.bat`

### Step 3: Wait for Build to Complete
The script will:
1. Build Docker image
2. Push to Docker Hub
3. Show deployment commands

### Step 4: Deploy on Server
Copy the commands shown and run on server:

```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull <service-name>
sudo docker-compose up -d --force-recreate <service-name>
```

### Step 5: Verify
- Check logs: `sudo docker-compose logs --tail=50 <service-name>`
- Test application: `https://kairo.craftsilicon.com`

---

## QUICK REFERENCE

| Service | Build File | Deploy Command (on server) |
|---------|-----------|----------------------------|
| **Frontend** | `BUILD_KAIRO_UI.bat` | `sudo docker-compose up -d --force-recreate kairo-ui` |
| **Account API** | `BUILD_ACCOUNT_API.bat` | `sudo docker-compose up -d --force-recreate account-management-api` |
| **Client API** | `BUILD_CLIENT_API.bat` | `sudo docker-compose up -d --force-recreate client-management-api` |
| **SystemCore** | `BUILD_SYSTEMCORE_API.bat` | `sudo docker-compose up -d --force-recreate systemcore-api` |
| **All Services** | `BUILD_ALL.bat` | `sudo docker-compose pull && sudo docker-compose up -d --force-recreate` |

---

## USING POWERSHELL DIRECTLY

If you prefer PowerShell over batch files:

```powershell
# Build specific service
.\simple-build.ps1 kairo-ui
.\simple-build.ps1 account-management-api
.\simple-build.ps1 client-management-api
.\simple-build.ps1 systemcore-api

# Build all services
.\simple-build.ps1 all
```

---

## DEPLOYMENT COMMANDS

### Deploy kairo-ui:
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull kairo-ui
sudo docker-compose up -d --force-recreate kairo-ui
```

### Deploy Account Management API:
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull account-management-api
sudo docker-compose up -d --force-recreate account-management-api
```

### Deploy Client Management API:
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull client-management-api
sudo docker-compose up -d --force-recreate client-management-api
```

### Deploy SystemCore API:
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull systemcore-api
sudo docker-compose up -d --force-recreate systemcore-api
```

### Deploy All Services:
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull
sudo docker-compose up -d --force-recreate
```

---

## EXAMPLE SCENARIOS

### Scenario 1: Fixed a bug in Account Management
1. Edit code in `AccountManagement/`
2. Double-click `BUILD_ACCOUNT_API.bat`
3. Wait for build (3-5 minutes)
4. Deploy on server:
   ```bash
   ssh kairo@172.17.50.15
   cd /home/kairo/CoreBankingAPI
   sudo docker-compose pull account-management-api
   sudo docker-compose up -d --force-recreate account-management-api
   ```
5. Test the fix

### Scenario 2: Added new feature to Frontend
1. Edit code in `kairo-ui/`
2. Double-click `BUILD_KAIRO_UI.bat`
3. Wait for build (3-5 minutes)
4. Deploy on server:
   ```bash
   ssh kairo@172.17.50.15
   cd /home/kairo/CoreBankingAPI
   sudo docker-compose pull kairo-ui
   sudo docker-compose up -d --force-recreate kairo-ui
   ```
5. Test at https://kairo.craftsilicon.com

### Scenario 3: Updated multiple APIs
1. Edit code in multiple projects
2. Double-click `BUILD_ALL.bat`
3. Wait for all builds (15-20 minutes)
4. Deploy on server:
   ```bash
   ssh kairo@172.17.50.15
   cd /home/kairo/CoreBankingAPI
   sudo docker-compose pull
   sudo docker-compose up -d --force-recreate
   ```
5. Test all functionality

---

## TROUBLESHOOTING

### Build Fails
```powershell
# Check Docker is running
docker --version

# Make sure you're logged in
docker login

# Check Dockerfile exists
ls kairo-ui/Dockerfile
ls AccountManagement/Dockerfile
ls ClientManagement/Dockerfile
ls SystemCoreApi/Dockerfile
```

### Push Fails
```powershell
# Login to Docker Hub
docker login
# Username: jipheens
# Password: (your Docker Hub password)
```

### Deploy Fails
```bash
# On server, check logs
sudo docker-compose logs --tail=100 <service-name>

# Restart specific service
sudo docker-compose restart <service-name>

# Force recreate
sudo docker-compose up -d --force-recreate <service-name>
```

---

## VERIFICATION

### After Deployment:

**Check service status:**
```bash
sudo docker-compose ps
```

**Check logs:**
```bash
sudo docker-compose logs --tail=50 kairo-ui
sudo docker-compose logs --tail=50 account-management-api
sudo docker-compose logs --tail=50 client-management-api
sudo docker-compose logs --tail=50 systemcore-api
```

**Test health endpoints:**
```bash
curl http://localhost:3306/health  # Client Management
curl http://localhost:3307/health  # Account Management
curl http://localhost:3311/health  # SystemCore
curl http://localhost:3309/health  # IAM
```

**Test main application:**
```bash
curl -I http://localhost/
```

Open browser: https://kairo.craftsilicon.com

---

## FILES SUMMARY

### BUILD FILES (Double-click these):
- ✅ `BUILD_KAIRO_UI.bat` - Build frontend
- ✅ `BUILD_ACCOUNT_API.bat` - Build account API
- ✅ `BUILD_CLIENT_API.bat` - Build client API
- ✅ `BUILD_SYSTEMCORE_API.bat` - Build systemcore API
- ✅ `BUILD_ALL.bat` - Build all services

### SCRIPT FILES:
- ✅ `simple-build.ps1` - PowerShell build script (called by batch files)

### IGNORE THESE (Dashboard - has issues):
- ❌ `build-dashboard.html`
- ❌ `start-build-dashboard.ps1`
- ❌ `START_BUILD_DASHBOARD.bat`

---

## NEXT STEPS

### First, rebuild kairo-ui with fixed JSON:
```
1. Double-click: BUILD_KAIRO_UI.bat
2. Wait for completion
3. Deploy on server:
   ssh kairo@172.17.50.15
   cd /home/kairo/CoreBankingAPI
   sudo docker-compose pull kairo-ui
   sudo docker-compose up -d --force-recreate kairo-ui
4. Test: https://kairo.craftsilicon.com
```

### For future changes:
- Use the appropriate BUILD_*.bat file
- Follow the 5-step workflow
- Verify after deployment

---

**You now have individual build files for each service!** ✅
